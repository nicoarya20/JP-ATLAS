/**
 * Trash policy for S6 (P8 §5, Z-01): who may send a task to the Trash, who may bring it back and
 * who may delete for good, plus the one retention boundary `purgeBefore` and `isRestorable` share.
 */
import { describe, expect, it } from 'bun:test';
import { DENY_UI } from '../../server/access/decision';
import { ACCESS_RULES } from '../../server/access/rules';
import type { TaskDecision } from '../../server/access/task.policy';
import {
  canPurge,
  canRestoreTask,
  canTrashTask,
  trashItemCaps,
} from '../../server/access/trash.policy';
import type { Principal, ProjectSubject, TaskSubject } from '../../server/access/types';
import { METRICS } from '../../server/metrics/config';
import { isRestorable, purgeBefore } from '../../server/metrics/trash.metrics';
import { PM_ERRORS } from '../../server/pm/errors';
import { PERSONA_CODES, type PersonaCode, persona } from './fixtures';

// test-only: Nico (PM-K) created the task; Dodi (AG) is the assignee. Deleted 1 Oct 10:00 WIB.
const DELETED_AT = new Date('2026-10-01T03:00:00Z');
const NOW = new Date('2026-10-07T03:00:00Z'); // 7 Oct 2026, day 7 of 30

const LIVE: TaskSubject = {
  id: 'T-1',
  projectId: 'P-atlas',
  status: 'todo',
  createdBy: 'U-nico',
  assigneeId: 'U-dodi',
  reviewerId: null,
  needsReview: false,
  deletedAt: null,
  deletedBy: null,
  projectDeletedAt: null,
};
const TRASHED: TaskSubject = { ...LIVE, deletedAt: DELETED_AT, deletedBy: 'U-nico' };

const TRASHED_PROJECT: ProjectSubject = {
  id: 'P-atlas',
  status: 'active',
  leadId: 'U-nico',
  deletedAt: DELETED_AT,
  deletedBy: 'U-nico',
};

const code = (d: TaskDecision | { ok: true } | { ok: false; code: string }) =>
  d.ok ? 'allow' : d.code;

// Q1 (user decision 18 Oct 2026): the creator, every manager of the project and Admin/Super-admin.
// Dodi is only the assignee, Sri only an Observer, Bella not a member at all.
const TRASH_TASK: Record<PersonaCode, string> = {
  SA: 'allow',
  AD: 'allow',
  'PM-K': 'allow', // creator and manager
  'PM-X': 'NOT_MEMBER', // non-member PM: reads the project, cannot delete in it
  'M-K': 'allow', // Member who manages the project
  AG: 'NOT_OWNER', // assignee only
  PT: 'NOT_MEMBER', // Observer
  BA: 'NOT_FOUND',
};

describe('canTrashTask', () => {
  it.each([...PERSONA_CODES])('%s: delete a live task to the Trash', (c) => {
    const { principal, membership } = persona(c);
    expect(code(canTrashTask(principal, LIVE, membership))).toBe(TRASH_TASK[c]);
  });

  it('lets a Member delete the task they created themselves', () => {
    const { principal, membership } = persona('AG');
    const own = { ...LIVE, createdBy: principal.id };
    expect(code(canTrashTask(principal, own, membership))).toBe('allow');
  });

  it('refuses a super-admin who is impersonating someone else (Q9)', () => {
    const acting: Principal = { ...persona('SA').principal, impersonating: true };
    expect(code(canTrashTask(acting, LIVE, null))).toBe('IMPERSONATING');
  });

  it('reads a task already in the Trash as WRONG_STATE and one inside a trashed project as PROJECT_IN_TRASH', () => {
    const { principal, membership } = persona('PM-K');
    expect(code(canTrashTask(principal, TRASHED, membership))).toBe('WRONG_STATE');
    const inTrashedProject = { ...LIVE, projectDeletedAt: DELETED_AT };
    expect(code(canTrashTask(principal, inTrashedProject, membership))).toBe('PROJECT_IN_TRASH');
  });
});

// Restore: every manager, Admin/Super-admin, and whoever deleted it (here Nico).
const RESTORE_TASK: Record<PersonaCode, string> = {
  SA: 'allow',
  AD: 'allow',
  'PM-K': 'allow',
  'PM-X': 'NOT_MEMBER',
  'M-K': 'allow',
  AG: 'NOT_OWNER',
  PT: 'NOT_MEMBER',
  BA: 'NOT_FOUND',
};

describe('canRestoreTask', () => {
  it.each([...PERSONA_CODES])('%s: restore within the retention period', (c) => {
    const { principal, membership } = persona(c);
    expect(code(canRestoreTask(principal, TRASHED, membership, NOW))).toBe(RESTORE_TASK[c]);
  });

  it('lets the Member who deleted it restore it, even without a membership', () => {
    const { principal } = persona('AG');
    const mine = { ...TRASHED, deletedBy: principal.id };
    expect(code(canRestoreTask(principal, mine, null, NOW))).toBe('allow');
  });

  it('keeps a live task invisible to a non-member instead of answering WRONG_STATE', () => {
    expect(code(canRestoreTask(persona('BA').principal, LIVE, null, NOW))).toBe('NOT_FOUND');
    const { principal, membership } = persona('PM-K');
    expect(code(canRestoreTask(principal, LIVE, membership, NOW))).toBe('WRONG_STATE');
  });

  it('waits for the project while the project itself is in the Trash (409)', () => {
    const { principal, membership } = persona('PM-K');
    const withProject = { ...TRASHED, projectDeletedAt: DELETED_AT };
    expect(code(canRestoreTask(principal, withProject, membership, NOW))).toBe('PROJECT_IN_TRASH');
    expect(PM_ERRORS.PROJECT_IN_TRASH.http).toBe(409);
  });

  it('answers EXPIRED (410) on day 31 and allows the last minute of day 30', () => {
    const { principal, membership } = persona('AD');
    const day30 = new Date('2026-10-30T16:59:59Z'); // 30 Oct 23:59:59 WIB
    const day31 = new Date('2026-10-30T17:00:00Z'); // 31 Oct 00:00 WIB
    expect(code(canRestoreTask(principal, TRASHED, membership, day30))).toBe('allow');
    expect(code(canRestoreTask(principal, TRASHED, membership, day31))).toBe('EXPIRED');
  });

  it('reads the retention period from the injected config', () => {
    const { principal, membership } = persona('AD');
    const short = { ...METRICS, TRASH_RETENTION_DAYS: 3 };
    expect(code(canRestoreTask(principal, TRASHED, membership, NOW, ACCESS_RULES, short))).toBe(
      'EXPIRED',
    );
  });

  it('refuses a super-admin who is impersonating someone else (Q9)', () => {
    const acting: Principal = { ...persona('SA').principal, impersonating: true };
    expect(code(canRestoreTask(acting, TRASHED, null, NOW))).toBe('IMPERSONATING');
  });
});

// Permanent delete is decided by the account role alone: a project role never earns it.
const PURGE: Record<PersonaCode, string> = {
  SA: 'allow',
  AD: 'allow',
  'PM-K': 'ROLE_CANNOT_PURGE',
  'PM-X': 'ROLE_CANNOT_PURGE',
  'M-K': 'ROLE_CANNOT_PURGE',
  AG: 'ROLE_CANNOT_PURGE',
  PT: 'ROLE_CANNOT_PURGE',
  BA: 'ROLE_CANNOT_PURGE',
};

describe('canPurge', () => {
  it.each([...PERSONA_CODES])('%s: delete for good', (c) => {
    expect(code(canPurge(persona(c).principal))).toBe(PURGE[c]);
  });

  it('refuses a super-admin who is impersonating someone else (Q9)', () => {
    const acting: Principal = { ...persona('SA').principal, impersonating: true };
    expect(code(canPurge(acting))).toBe('IMPERSONATING');
  });

  it('answers 403 and hides the control for everyone else', () => {
    expect(PM_ERRORS.ROLE_CANNOT_PURGE.http).toBe(403);
    expect(DENY_UI.ROLE_CANNOT_PURGE.ui).toBe('hide');
    expect(DENY_UI.NOT_IN_TRASH.http).toBe(409);
  });
});

describe('trashItemCaps', () => {
  it('gives Admin both controls and a Project Manager only restore', () => {
    const admin = persona('AD');
    const pm = persona('PM-K');
    expect(trashItemCaps(admin.principal, TRASHED_PROJECT, admin.membership, NOW)).toEqual({
      restore: true,
      purge: true,
    });
    expect(trashItemCaps(pm.principal, TRASHED_PROJECT, pm.membership, NOW)).toEqual({
      restore: true,
    });
  });

  it('shows an impersonating super-admin both controls disabled with the reason', () => {
    const acting: Principal = { ...persona('SA').principal, impersonating: true };
    expect(trashItemCaps(acting, TRASHED_PROJECT, null, NOW)).toEqual({
      restore: 'IMPERSONATING',
      purge: 'IMPERSONATING',
    });
  });
});

describe('purgeBefore', () => {
  // Midnight WIB is 17:00 UTC the day before, so the cut-off never lands on a UTC midnight.
  it('is the start of the oldest day still inside the window, in the team zone', () => {
    expect(purgeBefore(new Date('2026-10-30T16:59:59Z')).toISOString()).toBe(
      '2026-09-30T17:00:00.000Z',
    );
    expect(purgeBefore(new Date('2026-10-30T17:00:00Z')).toISOString()).toBe(
      '2026-10-01T17:00:00.000Z',
    );
  });

  it('matches isRestorable on day 29, 30 and 31 and across the WIB midnight', () => {
    const cases: ReadonlyArray<[string, boolean]> = [
      ['2026-10-29T16:59:59Z', true], // 29 Oct 23:59 WIB, day 29
      ['2026-10-29T17:00:00Z', true], // 30 Oct 00:00 WIB, day 30
      ['2026-10-30T16:59:59Z', true], // 30 Oct 23:59 WIB, day 30
      ['2026-10-30T17:00:00Z', false], // 31 Oct 00:00 WIB, day 31
      ['2026-10-31T16:59:59Z', false], // 31 Oct 23:59 WIB, day 31
    ];
    for (const [iso, restorable] of cases) {
      const now = new Date(iso);
      expect(isRestorable(DELETED_AT, now)).toBe(restorable);
      expect(DELETED_AT < purgeBefore(now)).toBe(!restorable);
    }
  });

  it('agrees with isRestorable for every deletion hour of a month-long window', () => {
    const now = new Date('2026-11-04T05:00:00Z'); // 4 Nov 12:00 WIB
    for (let h = 0; h < 24 * 40; h++) {
      const deletedAt = new Date(now.getTime() - h * 3_600_000);
      expect(deletedAt < purgeBefore(now)).toBe(!isRestorable(deletedAt, now));
    }
  });

  it('follows the injected retention period and time zone', () => {
    const now = new Date('2026-10-07T03:00:00Z'); // 7 Oct 10:00 WIB
    const short = { ...METRICS, TRASH_RETENTION_DAYS: 3 };
    expect(purgeBefore(now, short).toISOString()).toBe('2026-10-04T17:00:00.000Z'); // 5 Oct 00:00 WIB
    const utc = { ...METRICS, TIME_ZONE: 'UTC' };
    expect(purgeBefore(now, utc).toISOString()).toBe('2026-09-08T00:00:00.000Z');
  });

  it('crosses a DST change in a zone that has one (Europe/Berlin, 25 Oct 2026)', () => {
    const berlin = { ...METRICS, TIME_ZONE: 'Europe/Berlin', TRASH_RETENTION_DAYS: 2 };
    // 26 Oct 2026 is the day after the switch to CET (+01:00); 25 Oct started at 22:00 UTC.
    expect(purgeBefore(new Date('2026-10-26T12:00:00Z'), berlin).toISOString()).toBe(
      '2026-10-24T22:00:00.000Z',
    );
    const now = new Date('2026-10-26T12:00:00Z');
    const inside = new Date('2026-10-25T00:00:00Z'); // 25 Oct 01:00 CEST, day 2 of 2
    const outside = new Date('2026-10-24T21:59:59Z'); // 24 Oct 23:59:59 CEST, one day too old
    expect(isRestorable(inside, now, berlin)).toBe(true);
    expect(inside < purgeBefore(now, berlin)).toBe(false);
    expect(isRestorable(outside, now, berlin)).toBe(false);
    expect(outside < purgeBefore(now, berlin)).toBe(true);
  });
});
