import { describe, expect, it } from 'bun:test';
import { appCaps, EVENT_CAP_KEYS, eventCaps } from '../../server/access/capabilities';
import {
  canCancelEvent,
  canManageEvent,
  canManageParticipants,
  canTrashEvent,
  canViewEvent,
  canWriteNote,
  eventLevel,
  canRestoreEvent as restore,
} from '../../server/access/event.policy';
import { METRICS } from '../../server/metrics/config';
import { ROLES } from '../../server/permissions';
import {
  APP_ROLES,
  eventRow,
  MEMBERSHIP_STATES,
  membership,
  NOW,
  principal,
  verdict,
} from './event.policy.support';
import { persona } from './fixtures';

describe('canWriteNote', () => {
  it.each([
    ['manager', 'ok'],
    ['member', 'NOT_MEMBER'],
    ['viewer', 'NOT_MEMBER'],
    ['none', 'NOT_VISIBLE'],
  ] as const)(
    'a Member account who is %s in the project and not invited: %s',
    (state, expected) => {
      expect(verdict(canWriteNote(principal(ROLES.MEMBER), eventRow(), membership(state)))).toBe(
        expected,
      );
    },
  );

  it('a guest writes the minutes even as a Pemantau: the note-taker is rarely the organiser', () => {
    const sri = persona('PT');
    const invited = eventRow({ isParticipant: true });
    expect(canWriteNote(sri.principal, invited, sri.membership).ok).toBe(true);
  });

  it('the creator writes them too', () => {
    const mine = eventRow({ createdBy: 'U-actor' });
    expect(canWriteNote(principal(ROLES.MEMBER), mine, null).ok).toBe(true);
  });

  it('a trashed event accepts no minutes', () => {
    const invited = eventRow({ isParticipant: true, deletedAt: NOW });
    expect(verdict(canWriteNote(principal(ROLES.MEMBER), invited, null))).toBe('WRONG_STATE');
  });
});

describe('canRestoreEvent', () => {
  const deletedAt = new Date('2026-11-01T00:00:00Z');

  it('a manager of the project restores it inside the retention window', () => {
    const trashed = eventRow({ deletedAt });
    expect(restore(principal(ROLES.MEMBER), trashed, membership('manager'), NOW).ok).toBe(true);
  });

  it('an event that is not in the Trash has nothing to restore', () => {
    expect(verdict(restore(principal(ROLES.ADMIN), eventRow(), null, NOW))).toBe('WRONG_STATE');
  });

  it('past the retention window it is gone for good', () => {
    const old = new Date(NOW);
    old.setUTCDate(old.getUTCDate() - (METRICS.TRASH_RETENTION_DAYS + 1));
    const trashed = eventRow({ deletedAt: old });
    expect(verdict(restore(principal(ROLES.ADMIN), trashed, null, NOW))).toBe('EXPIRED');
  });

  it('an event trashed with its project is restored by restoring the project', () => {
    const trashed = eventRow({ deletedAt, projectDeletedAt: deletedAt });
    expect(verdict(restore(principal(ROLES.ADMIN), trashed, null, NOW))).toBe('PROJECT_IN_TRASH');
  });

  it('a Member who only belongs to the project cannot restore', () => {
    const trashed = eventRow({ deletedAt });
    expect(verdict(restore(principal(ROLES.MEMBER), trashed, membership('member'), NOW))).toBe(
      'NOT_MANAGER',
    );
  });
});

describe('eventLevel', () => {
  it('an Admin outranks any project role, membership or not', () => {
    for (const state of MEMBERSHIP_STATES) {
      expect(eventLevel(principal(ROLES.ADMIN), eventRow(), membership(state))).toBe('admin');
    }
  });

  it('a personal event yields no level, so only creator and guests reach it', () => {
    const personal = eventRow({ projectId: null });
    expect(eventLevel(principal(ROLES.PROJECT_MANAGER), personal, null)).toBe('none');
    expect(eventLevel(principal(ROLES.MEMBER), personal, membership('manager'))).toBe('none');
  });

  it('a project event takes the project level, and a non-member PM reads it', () => {
    expect(eventLevel(principal(ROLES.MEMBER), eventRow(), membership('viewer'))).toBe('viewer');
    expect(eventLevel(principal(ROLES.PROJECT_MANAGER), eventRow(), null)).toBe('reader');
    expect(eventLevel(principal(ROLES.MEMBER), eventRow(), null)).toBe('none');
  });
});

describe('the full role x membership matrix is stable', () => {
  const ACTIONS = {
    view: canViewEvent,
    manage: canManageEvent,
    cancel: canCancelEvent,
    trash: canTrashEvent,
    participants: canManageParticipants,
    note: canWriteNote,
  } as const;

  it('every (account role, membership) pair decides every action without throwing', () => {
    const table: Record<string, string> = {};
    for (const role of APP_ROLES) {
      for (const state of MEMBERSHIP_STATES) {
        for (const [name, fn] of Object.entries(ACTIONS)) {
          table[`${role}/${state}/${name}`] = verdict(
            fn(principal(role), eventRow(), membership(state)),
          );
        }
      }
    }
    expect(Object.keys(table)).toHaveLength(APP_ROLES.length * MEMBERSHIP_STATES.length * 6);
    // A Member outside the project learns nothing at all; a manager may do everything.
    expect(table[`${ROLES.MEMBER}/none/view`]).toBe('NOT_VISIBLE');
    expect(table[`${ROLES.MEMBER}/none/manage`]).toBe('NOT_VISIBLE');
    expect(table[`${ROLES.MEMBER}/manager/trash`]).toBe('ok');
    // A Pemantau may read, and nothing else.
    expect(table[`${ROLES.MEMBER}/viewer/view`]).toBe('ok');
    expect(table[`${ROLES.MEMBER}/viewer/manage`]).toBe('NOT_MANAGER');
    expect(table[`${ROLES.MEMBER}/viewer/note`]).toBe('NOT_MEMBER');
  });
});

describe('eventCaps and appCaps', () => {
  it('a project manager gets every event capability', () => {
    const caps = eventCaps(principal(ROLES.MEMBER), eventRow(), membership('manager'));
    expect(Object.keys(caps).sort()).toEqual([...EVENT_CAP_KEYS].sort());
    for (const key of EVENT_CAP_KEYS) expect(caps[key]).toBe(true);
  });

  it('a Pemantau gets none: every denial of theirs is a hide, not a disable', () => {
    const sri = persona('PT');
    expect(eventCaps(sri.principal, eventRow(), sri.membership)).toEqual({});
  });

  it('a guest gets only writeNote', () => {
    const caps = eventCaps(principal(ROLES.MEMBER), eventRow({ isParticipant: true }), null);
    expect(caps).toEqual({ writeNote: true });
  });

  it('a hidden event yields no capabilities at all', () => {
    const hidden = eventRow({ projectId: null });
    expect(eventCaps(principal(ROLES.MEMBER), hidden, null)).toEqual({});
  });

  it('a trashed event hides its write controls entirely (WRONG_STATE is a hide, not a disable)', () => {
    const caps = eventCaps(principal(ROLES.ADMIN), eventRow({ deletedAt: NOW }), null);
    expect(caps).toEqual({});
  });

  it('an event whose project is trashed disables them instead, with the reason to fix it first', () => {
    const caps = eventCaps(
      principal(ROLES.ADMIN),
      eventRow({ deletedAt: NOW, projectDeletedAt: NOW }),
      null,
    );
    expect(caps.update).toBe('PROJECT_IN_TRASH');
  });

  it('impersonating hides trash and cancel but keeps update', () => {
    const sneaky = principal(ROLES.SUPER_ADMIN, { impersonating: true });
    const caps = eventCaps(sneaky, eventRow(), null);
    expect(caps.update).toBe(true);
    expect(caps.trash).toBe('IMPERSONATING');
    expect(caps.cancel).toBe('IMPERSONATING');
  });

  it('appCaps.createEvent is true for every account role: a personal event needs no project', () => {
    for (const role of APP_ROLES) expect(appCaps(principal(role)).createEvent).toBe(true);
  });
});
