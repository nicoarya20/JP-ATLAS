import { describe, expect, it } from 'bun:test';
import {
  appCaps,
  buildCaps,
  type CapValue,
  capMessage,
  capOf,
  projectCaps,
  TASK_CAP_KEYS,
  type TaskCapKey,
  taskCaps,
  type Verdict,
} from '../../server/access/capabilities';
import { DENY_CODES, DENY_UI } from '../../server/access/decision';
import {
  canApproveTask,
  canChangeReviewer,
  canRequestReview,
  canReturnTask,
  REVIEW_NOTE_MIN_LENGTH,
  type ReviewerPool,
} from '../../server/access/review.policy';
import { ACCESS_RULES } from '../../server/access/rules';
import { canComment, canEditTask, canToggleNeedsReview } from '../../server/access/task.policy';
import {
  canCancelTask,
  canCompleteTask,
  canReopenTask,
  canStartTask,
  canUncancelTask,
  canUnstartTask,
  type PrimaryAction,
  primaryAction,
} from '../../server/access/task-flow.policy';
import type { ProjectSubject, TaskSubject } from '../../server/access/types';
import { ROLES, type Role } from '../../server/permissions';
import { TASK_STATUSES, type TaskStatus } from '../../server/pm/enums';
import { PERSONA_CODES, type Persona, persona, personaNamed } from './fixtures';

const joinedAt = (day: string) => new Date(`2026-09-${day}T00:00:00Z`); // test-only
const POOL: ReviewerPool = {
  managers: [
    { userId: 'U-nico', joinedAt: joinedAt('01'), active: true },
    { userId: 'U-mira', joinedAt: joinedAt('05'), active: true },
  ],
  adminIds: ['U-boss', 'U-ayu'],
};
const EMPTY_POOL: ReviewerPool = { managers: [], adminIds: [] };

// Task #12 from R03 §3.8: made by Rina, worked by Nico, review required.
const task12 = (o: Partial<TaskSubject> = {}): TaskSubject => ({
  id: 'T-12',
  projectId: 'P-atlas',
  status: 'in_progress',
  createdBy: 'U-rina',
  assigneeId: 'U-nico',
  reviewerId: null,
  needsReview: true,
  deletedAt: null,
  deletedBy: null,
  projectDeletedAt: null,
  ...o,
});
const atlas = (o: Partial<ProjectSubject> = {}): ProjectSubject => ({
  id: 'P-atlas',
  status: 'active',
  leadId: 'U-nico',
  deletedAt: null,
  deletedBy: null,
  ...o,
});

const nico = persona('PM-K');
const mira = persona('M-K');
const caps12 = (who: Persona, o: Partial<TaskSubject> = {}, pool = POOL) =>
  taskCaps(who.principal, task12(o), who.membership, pool);

describe('capOf / buildCaps', () => {
  it('maps allow to true and effects-carrying allows too', () => {
    expect(capOf({ ok: true })).toBe(true);
    expect(capOf({ ok: true, effects: ['BECOMES_ASSIGNEE'] } as Verdict)).toBe(true);
  });

  it.each([...DENY_CODES])('maps %s by its DENY_UI hide/disable setting', (code) => {
    expect(capOf({ ok: false, code })).toBe(DENY_UI[code].ui === 'disable' ? code : undefined);
  });

  it.each(['NOT_FOUND', 'NOT_VISIBLE', 'LEAD_MUST_BE_MANAGER', 'SOMETHING_NEW'])(
    'hides %s (a missing record or an unknown code fails closed)',
    (code) => {
      expect(capOf({ ok: false, code })).toBeUndefined();
    },
  );

  it('keeps NO_ELIGIBLE_REVIEWER as a disabled capability (R03 §3.7)', () => {
    expect(capOf({ ok: false, code: 'NO_ELIGIBLE_REVIEWER' })).toBe('NO_ELIGIBLE_REVIEWER');
  });

  it('leaves hidden actions out of the map instead of setting them to undefined', () => {
    const out = buildCaps({
      a: { ok: true } as Verdict,
      b: { ok: false, code: 'SELF_REVIEW' } as Verdict,
      c: { ok: false, code: 'NOT_MANAGER' } as Verdict,
    });
    expect(out).toEqual({ a: true, b: 'SELF_REVIEW' });
    expect('c' in out).toBe(false);
  });

  it('has an Indonesian tooltip for every code that can be disabled', () => {
    const disabled = DENY_CODES.filter((c) => DENY_UI[c].ui === 'disable');
    for (const code of [...disabled, 'NO_ELIGIBLE_REVIEWER' as const]) {
      expect(capMessage(code).length).toBeGreaterThan(10);
    }
  });
});

describe('taskCaps: named cases', () => {
  it('Nico on #12 (working on it, review required) matches the R03 §3.7 example', () => {
    expect(caps12(nico)).toEqual({
      update: true,
      unstart: true,
      complete: 'REVIEW_REQUIRED',
      requestReview: true,
      cancel: true,
      comment: true,
      needsReviewOn: true,
      needsReviewOff: true,
      changeReviewer: true,
      primary: 'requestReview',
    });
  });

  it('the assignee cannot approve their own work, but the control stays visible and disabled', () => {
    const c = caps12(nico, { status: 'in_review' });
    expect(c.approve).toBe('SELF_REVIEW');
    expect(c.return).toBe('SELF_REVIEW');
    expect(c.primary).toBeNull();
  });

  it('another manager approves and returns an in-review task; approve is the primary step', () => {
    const c = caps12(mira, { status: 'in_review' });
    expect(c.approve).toBe(true);
    expect(c.return).toBe(true);
    expect(c.primary).toBe('approve');
  });

  it('a plain member sees no approve or return, only what is theirs', () => {
    const rina = personaNamed('Rina');
    const c = caps12(rina, { status: 'in_review' });
    expect('approve' in c).toBe(false);
    expect('return' in c).toBe(false);
    expect(c.comment).toBe(true);
  });

  it('an observer can only comment, a non-member PM can do nothing', () => {
    expect(caps12(persona('PT'))).toEqual({ comment: true, primary: null });
    expect(caps12(persona('PM-X'))).toEqual({ primary: null });
  });

  it('a hidden task has no capability at all, so nothing leaks to a non-member', () => {
    expect(caps12(persona('BA'))).toEqual({ primary: null });
  });

  it('a task in a trashed project is disabled with the trash reason and offers no primary step', () => {
    const c = caps12(nico, { projectDeletedAt: new Date('2026-10-06T00:00:00Z') });
    expect(c.update).toBe('PROJECT_IN_TRASH');
    expect(c.primary).toBeNull();
  });

  it('flags a review nobody but the assignee could decide as NO_ELIGIBLE_REVIEWER', () => {
    const c = caps12(nico, {}, EMPTY_POOL);
    expect(c.requestReview).toBe('NO_ELIGIBLE_REVIEWER');
    expect(c.changeReviewer).toBe('NO_ELIGIBLE_REVIEWER');
    expect(c.primary).toBeNull();
  });

  it('turns the primary step off for a done task a viewer cannot reopen', () => {
    expect(caps12(persona('PT'), { status: 'done' }).primary).toBeNull();
    expect(caps12(nico, { status: 'done' }).primary).toBe('reopen');
  });
});

// R03 §3.8 layer 5: `can` for each persona × state equals the `canX` result called directly.
const RELATIONS = ['creator', 'assignee', 'both', 'neither'] as const;
const PROBE = 'x'.repeat(REVIEW_NOTE_MIN_LENGTH);

function subject(who: Persona, rel: (typeof RELATIONS)[number], status: TaskStatus, nr: boolean) {
  const creator = rel === 'creator' || rel === 'both';
  const assignee = rel === 'assignee' || rel === 'both';
  return task12({
    status,
    needsReview: nr,
    createdBy: creator ? who.principal.id : 'U-stranger-1',
    assigneeId: assignee ? who.principal.id : 'U-stranger-2',
  });
}

/** Direct calls, written out here and not read back from `taskCaps`. */
function direct(who: Persona, t: TaskSubject): Record<TaskCapKey, Verdict> {
  const [p, m, r] = [who.principal, who.membership, ACCESS_RULES] as const;
  const candidate = [...POOL.managers.map((x) => x.userId), ...POOL.adminIds].find(
    (id) => id !== t.assigneeId,
  );
  return {
    update: canEditTask(p, t, m, r),
    start: canStartTask(p, t, m, r),
    unstart: canUnstartTask(p, t, m, r),
    complete: canCompleteTask(p, t, m, r),
    requestReview: canRequestReview(p, t, m, POOL, r),
    approve: canApproveTask(p, t, m, r),
    return: canReturnTask(p, t, m, PROBE, r),
    reopen: canReopenTask(p, t, m, PROBE, r),
    cancel: canCancelTask(p, t, m, { category: 'duplicate', note: '' }, r),
    uncancel: canUncancelTask(p, t, m, r),
    comment: canComment(p, t, m, r),
    needsReviewOn: canToggleNeedsReview(p, t, m, true, r),
    needsReviewOff: canToggleNeedsReview(p, t, m, false, r),
    changeReviewer: canChangeReviewer(p, t, m, candidate ?? '', POOL, r),
  };
}

// A primary step must be backed by the matching enabled capability, or the row button would 403.
const PRIMARY_KEY: Record<PrimaryAction, TaskCapKey> = {
  start: 'start',
  complete: 'complete',
  requestReview: 'requestReview',
  approve: 'approve',
  reopen: 'reopen',
  uncancel: 'uncancel',
};

describe('taskCaps parity with the policies', () => {
  const states = PERSONA_CODES.flatMap((code) =>
    TASK_STATUSES.flatMap((status) =>
      RELATIONS.flatMap((rel) => [true, false].map((nr) => [code, status, rel, nr] as const)),
    ),
  );

  it(`equals the direct canX result for ${states.length} persona × state combinations`, () => {
    for (const [code, status, rel, nr] of states) {
      const who = persona(code);
      const t = subject(who, rel, status, nr);
      const expected = buildCaps(direct(who, t));
      const actual = taskCaps(who.principal, t, who.membership, POOL);
      const label = `${code}/${status}/${rel}/needsReview=${nr}`;
      expect({ label, ...actual, primary: undefined }).toEqual({
        label,
        ...expected,
        primary: undefined,
      });
      expect({ label, primary: actual.primary }).toEqual({
        label,
        primary: primaryAction(who.principal, t, who.membership, POOL),
      });
    }
  });

  it('only ever uses the declared keys, true, or a code DENY_UI shows disabled', () => {
    for (const [code, status, rel, nr] of states) {
      const who = persona(code);
      const actual = taskCaps(who.principal, subject(who, rel, status, nr), who.membership, POOL);
      for (const [key, value] of Object.entries(actual)) {
        if (key === 'primary') continue;
        expect(TASK_CAP_KEYS as readonly string[]).toContain(key);
        const v = value as CapValue;
        const ok = v === true || v === 'NO_ELIGIBLE_REVIEWER' || DENY_UI[v].ui === 'disable';
        expect({ code, status, rel, key, ok }).toEqual({ code, status, rel, key, ok: true });
      }
    }
  });

  it('never offers a primary step without the matching enabled capability', () => {
    for (const [code, status, rel, nr] of states) {
      const who = persona(code);
      const c = taskCaps(who.principal, subject(who, rel, status, nr), who.membership, POOL);
      if (c.primary) expect(c[PRIMARY_KEY[c.primary]]).toBe(true);
    }
  });
});

describe('projectCaps', () => {
  const expected: Record<string, Record<string, unknown>> = {
    SA: { update: true, trash: true, createTask: true, manageKinds: true },
    AD: { update: true, trash: true, createTask: true, manageKinds: true },
    'PM-K': { update: true, trash: true, createTask: true, manageKinds: true },
    'PM-X': {}, // read-only: every action hidden
    'M-K': { update: true, trash: 'ROLE_CANNOT_TRASH', createTask: true, manageKinds: true },
    AG: { createTask: true },
    PT: {},
    BA: {},
  };

  it.each([...PERSONA_CODES])('persona %s on an active project', (code) => {
    const who = persona(code);
    expect(projectCaps(who.principal, atlas(), who.membership)).toEqual(expected[code]);
  });

  it('turns every project action off with the trash reason once the project is in the Trash', () => {
    const c = projectCaps(
      nico.principal,
      atlas({ deletedAt: new Date('2026-10-06T00:00:00Z') }),
      nico.membership,
    );
    expect(c).toEqual({
      update: 'PROJECT_IN_TRASH',
      trash: 'PROJECT_IN_TRASH',
      createTask: 'PROJECT_IN_TRASH',
      manageKinds: 'PROJECT_IN_TRASH',
    });
  });

  it('disables trash while a super-admin is impersonating (Q9)', () => {
    const boss = persona('SA');
    const c = projectCaps({ ...boss.principal, impersonating: true }, atlas(), boss.membership);
    expect(c.trash).toBe('IMPERSONATING');
    expect(c.update).toBe(true);
  });

  it('lets a Member-manager trash once the rule flag is on', () => {
    const rules = { ...ACCESS_RULES, MEMBER_MANAGER_CAN_TRASH_PROJECT: true };
    expect(projectCaps(mira.principal, atlas(), mira.membership, rules).trash).toBe(true);
  });
});

describe('appCaps', () => {
  const roles: [Role | 'user', boolean, boolean, boolean][] = [
    [ROLES.MEMBER, false, false, false],
    [ROLES.PROJECT_MANAGER, true, false, false],
    [ROLES.ADMIN, true, true, false],
    [ROLES.SUPER_ADMIN, true, true, true],
    ['user', false, false, false], // legacy value reads as a member
  ];

  it.each(roles)('%s => createProject=%s dashboard=%s dev=%s', (role, create, dash, dev) => {
    const p = { id: 'U-x', appRole: role as Role, impersonating: false };
    // `createEvent` has no column: a personal event needs no project, so it is true for every
    // role (S7 E-02). Picking a *project* for it is decided per project by `canCreateEvent`.
    expect(appCaps(p)).toEqual({
      createProject: create,
      createEvent: true,
      dashboard: dash,
      dev,
    });
  });
});
