import { describe, expect, it } from 'bun:test';
import { DENY_UI } from '../../server/access/decision';
import {
  canApproveTask,
  canChangeReviewer,
  canRequestReview,
  canReturnTask,
  type ManagerInfo,
  pickReviewer,
  REVIEW_NOTE_MAX_LENGTH,
  type ReviewerPool,
  reviewerCandidates,
} from '../../server/access/review.policy';
import { ACCESS_RULES } from '../../server/access/rules';
import type { Membership, Principal, TaskSubject } from '../../server/access/types';
import { PM_ERRORS } from '../../server/pm/errors';
import { type Persona, type PersonaCode, persona, personaNamed } from './fixtures';

// Task #12 from R03 §3.8, moved to review: made by Rina, worked by Nico.
const task = (o: Partial<TaskSubject> = {}): TaskSubject => ({
  id: 'T-12',
  projectId: 'P-atlas',
  status: 'in_review',
  createdBy: 'U-rina',
  assigneeId: 'U-nico',
  reviewerId: null,
  needsReview: true,
  deletedAt: null,
  deletedBy: null,
  projectDeletedAt: null,
  ...o,
});
const mgr = (userId: string, joined: string, active = true): ManagerInfo => ({
  userId,
  joinedAt: new Date(`${joined}T00:00:00Z`),
  active,
});
const NICO = mgr('U-nico', '2026-09-01');
const MIRA = mgr('U-mira', '2026-09-05');
const code = (d: { ok: boolean; code?: string }) => (d.ok ? 'allow' : d.code);
const as = (x: Persona): [Principal, Membership] => [x.principal, x.membership];

describe('pickReviewer (C39-C43)', () => {
  it('C39: the creator wins when they are a manager', () => {
    const pick = pickReviewer({
      creatorId: 'U-mira',
      assigneeId: 'U-dodi',
      leadId: 'U-nico',
      managers: [NICO, MIRA],
    });
    expect(pick).toEqual({ kind: 'user', userId: 'U-mira', via: 'creator' });
  });

  it('C40: a creator who is not a manager falls through to the Lead', () => {
    const pick = pickReviewer({
      creatorId: 'U-rina',
      assigneeId: 'U-dodi',
      leadId: 'U-nico',
      managers: [MIRA, NICO],
    });
    expect(pick).toEqual({ kind: 'user', userId: 'U-nico', via: 'lead' });
  });

  it('C41: the assignee is skipped even as Lead, so the other manager is picked', () => {
    const pick = pickReviewer({
      creatorId: 'U-rina',
      assigneeId: 'U-nico',
      leadId: 'U-nico',
      managers: [NICO, MIRA],
    });
    expect(pick).toEqual({ kind: 'user', userId: 'U-mira', via: 'manager' });
  });

  it('C42: a lone manager who is also the assignee sends the review to the Admin pool', () => {
    const pick = pickReviewer({
      creatorId: 'U-rina',
      assigneeId: 'U-nico',
      leadId: 'U-nico',
      managers: [NICO],
    });
    expect(pick).toEqual({ kind: 'admin-pool', suggestSecondManager: true });
  });

  it('C43: managers who joined together tie-break on the smallest id', () => {
    const same = '2026-09-10';
    const input = {
      creatorId: 'U-rina',
      assigneeId: 'U-dodi',
      leadId: 'U-gone',
      managers: [mgr('u2', same), mgr('u1', same)],
    };
    expect(pickReviewer(input)).toEqual({ kind: 'user', userId: 'u1', via: 'manager' });
    expect(pickReviewer({ ...input, managers: [...input.managers].reverse() })).toEqual(
      pickReviewer(input),
    );
  });

  it('prefers the longest-serving manager over a smaller id', () => {
    const pick = pickReviewer({
      creatorId: null,
      assigneeId: 'U-dodi',
      leadId: null,
      managers: [mgr('a-new', '2026-09-20'), mgr('z-old', '2026-09-02')],
    });
    expect(pick).toEqual({ kind: 'user', userId: 'z-old', via: 'manager' });
  });

  it('ignores inactive managers (banned or not approved), including an inactive creator', () => {
    const pick = pickReviewer({
      creatorId: 'U-mira',
      assigneeId: 'U-dodi',
      leadId: 'U-nico',
      managers: [mgr('U-mira', '2026-09-05', false), NICO],
    });
    expect(pick).toEqual({ kind: 'user', userId: 'U-nico', via: 'lead' });
  });

  it('falls to the Admin pool with no managers, and tolerates a deleted creator and Lead', () => {
    const pick = pickReviewer({ creatorId: null, assigneeId: null, leadId: null, managers: [] });
    expect(pick).toEqual({ kind: 'admin-pool', suggestSecondManager: true });
  });
});

describe('reviewerCandidates', () => {
  it('merges active managers and admins, drops the assignee and duplicates', () => {
    const pool: ReviewerPool = {
      managers: [NICO, MIRA, mgr('U-off', '2026-09-01', false)],
      adminIds: ['U-ayu', 'U-mira'],
    };
    expect(reviewerCandidates(pool, 'U-nico').sort()).toEqual(['U-ayu', 'U-mira']);
  });

  it('keeps everyone when the task has no assignee', () => {
    const pool: ReviewerPool = { managers: [NICO], adminIds: [] };
    expect(reviewerCandidates(pool, null)).toEqual(['U-nico']);
  });
});

describe('canRequestReview', () => {
  const inProgress = task({ status: 'in_progress' });
  const nicoOnly: ReviewerPool = { managers: [NICO], adminIds: [] };
  const nico = persona('PM-K');

  it('C45: refuses when the only candidate is the assignee and no Admin/SA is active', () => {
    const d = canRequestReview(nico.principal, inProgress, nico.membership, nicoOnly);
    expect(d).toEqual({ ok: false, code: 'NO_ELIGIBLE_REVIEWER' });
  });

  it('allows once an Admin or a second manager is available', () => {
    const adminPool: ReviewerPool = { managers: [NICO], adminIds: ['U-ayu'] };
    const twoManagers: ReviewerPool = { managers: [NICO, MIRA], adminIds: [] };
    for (const pool of [adminPool, twoManagers])
      expect(canRequestReview(nico.principal, inProgress, nico.membership, pool).ok).toBe(true);
  });

  it('does not count an inactive manager or the assignee-Admin as a reviewer', () => {
    const pool: ReviewerPool = {
      managers: [NICO, mgr('U-mira', '2026-09-05', false)],
      adminIds: ['U-nico'],
    };
    const d = canRequestReview(nico.principal, inProgress, nico.membership, pool);
    expect(code(d)).toBe('NO_ELIGIBLE_REVIEWER');
  });

  it('lets the assignee Member request but not another Member (NOT_OWNER)', () => {
    const pool: ReviewerPool = { managers: [NICO], adminIds: [] };
    const dodiTask = task({ status: 'in_progress', assigneeId: 'U-dodi' });
    const dodi = personaNamed('Dodi');
    const rina = personaNamed('Rina');
    expect(canRequestReview(dodi.principal, dodiTask, dodi.membership, pool).ok).toBe(true);
    expect(code(canRequestReview(rina.principal, dodiTask, rina.membership, pool))).toBe(
      'NOT_OWNER',
    );
  });

  it.each([
    ['PM-X', 'NOT_MEMBER'],
    ['PT', 'NOT_MEMBER'],
    ['BA', 'NOT_MEMBER'],
  ] as [PersonaCode, string][])('%s cannot request review', (c, expected) => {
    const x = persona(c);
    const pool: ReviewerPool = { managers: [NICO, MIRA], adminIds: [] };
    expect(code(canRequestReview(x.principal, inProgress, x.membership, pool))).toBe(expected);
  });

  it.each([
    ['todo', true],
    ['in_review', true],
    ['done', true],
    ['canceled', true],
    ['in_progress', false],
  ] as const)('status %s with review on is WRONG_STATE=%p', (status, wrong) => {
    const pool: ReviewerPool = { managers: [NICO, MIRA], adminIds: [] };
    const d = canRequestReview(nico.principal, task({ status }), nico.membership, pool);
    expect(code(d)).toBe(wrong ? 'WRONG_STATE' : 'allow');
  });

  it('is WRONG_STATE when review is off, and frozen when the task or project is trashed', () => {
    const pool: ReviewerPool = { managers: [NICO, MIRA], adminIds: [] };
    const run = (t: TaskSubject) =>
      code(canRequestReview(nico.principal, t, nico.membership, pool));
    expect(run(task({ status: 'in_progress', needsReview: false }))).toBe('WRONG_STATE');
    expect(run(task({ status: 'in_progress', deletedAt: new Date() }))).toBe('WRONG_STATE');
    expect(run(task({ status: 'in_progress', projectDeletedAt: new Date() }))).toBe(
      'PROJECT_IN_TRASH',
    );
  });
});

// Persona 8: every column of the matrix against approve and return on a task Dodi is working on.
describe('approve / return across the 8 personas', () => {
  const dodiTask = task({ assigneeId: 'U-dodi' });
  const NOTE = 'Lengkapi lampiran dulu';
  const EXPECTED: [PersonaCode, string][] = [
    ['SA', 'allow'],
    ['AD', 'allow'],
    ['PM-K', 'allow'],
    ['PM-X', 'NOT_MANAGER'],
    ['M-K', 'allow'],
    ['AG', 'NOT_MANAGER'],
    ['PT', 'NOT_MANAGER'],
    // Not a member at all; the 404 for hidden tasks is the view check's job, not this policy's.
    ['BA', 'NOT_MEMBER'],
  ];

  it.each(EXPECTED)('%s -> %s', (c, expected) => {
    const x = persona(c);
    expect(code(canApproveTask(x.principal, dodiTask, x.membership))).toBe(expected);
    expect(code(canReturnTask(x.principal, dodiTask, x.membership, NOTE))).toBe(expected);
  });

  it.each(['SA', 'AD', 'PM-K', 'M-K'] as PersonaCode[])(
    '%s cannot approve or return their own work (SELF_REVIEW)',
    (c) => {
      const x = persona(c);
      const own = task({ assigneeId: x.principal.id });
      expect(code(canApproveTask(x.principal, own, x.membership))).toBe('SELF_REVIEW');
      expect(code(canReturnTask(x.principal, own, x.membership, NOTE))).toBe('SELF_REVIEW');
    },
  );

  it('treats a non-member PM as a member only when P-A1 is off (then NOT_MEMBER)', () => {
    const lea = persona('PM-X');
    const rules = { ...ACCESS_RULES, P_A1_PM_NON_MEMBER_READS: false };
    expect(code(canApproveTask(lea.principal, dodiTask, lea.membership, rules))).toBe('NOT_MEMBER');
  });
});

describe('canApproveTask (C12-C14)', () => {
  it('C12: Dodi denied, Mira allowed, Lea denied on a task Dodi works on', () => {
    const t = task({ assigneeId: 'U-dodi' });
    const out = (x: Persona) => code(canApproveTask(x.principal, t, x.membership));
    expect(out(personaNamed('Dodi'))).toBe('NOT_MANAGER');
    expect(out(persona('M-K'))).toBe('allow');
    expect(out(persona('PM-X'))).toBe('NOT_MANAGER');
  });

  it('C13: Nico (sole manager and assignee) is SELF_REVIEW while Ayu and Boss may approve', () => {
    const t = task();
    const out = (x: Persona) => code(canApproveTask(x.principal, t, x.membership));
    expect([out(persona('PM-K')), out(persona('AD')), out(persona('SA'))]).toEqual([
      'SELF_REVIEW',
      'allow',
      'allow',
    ]);
  });

  it('C14: an in-progress task is WRONG_STATE even for the assignee-manager', () => {
    const nico = persona('PM-K');
    const d = canApproveTask(nico.principal, task({ status: 'in_progress' }), nico.membership);
    expect(code(d)).toBe('WRONG_STATE');
    expect(DENY_UI.WRONG_STATE.ui).toBe('hide');
  });

  it.each(['todo', 'in_progress', 'done', 'canceled'] as const)('refuses status %s', (status) => {
    const mira = persona('M-K');
    expect(code(canApproveTask(mira.principal, task({ status }), mira.membership))).toBe(
      'WRONG_STATE',
    );
  });

  it('is frozen while the task or its project is in the Trash', () => {
    const mira = persona('M-K');
    const run = (t: TaskSubject) => code(canApproveTask(mira.principal, t, mira.membership));
    expect(run(task({ deletedAt: new Date() }))).toBe('WRONG_STATE');
    expect(run(task({ projectDeletedAt: new Date() }))).toBe('PROJECT_IN_TRASH');
  });

  it('reports the role problem before the status problem', () => {
    const dodi = personaNamed('Dodi');
    const d = canApproveTask(dodi.principal, task({ status: 'todo' }), dodi.membership);
    expect(code(d)).toBe('NOT_MANAGER');
  });

  it('does not look at reviewerId: any non-assignee manager may decide (R03 §3.4)', () => {
    const mira = persona('M-K');
    const t = task({ assigneeId: 'U-dodi', reviewerId: 'U-nico' });
    expect(canApproveTask(mira.principal, t, mira.membership).ok).toBe(true);
  });
});

describe('canReturnTask note rules', () => {
  const mira = persona('M-K');
  const dodiTask = task({ assigneeId: 'U-dodi' });
  const run = (note: string) =>
    code(canReturnTask(mira.principal, dodiTask, mira.membership, note));

  it.each([
    ['empty', ''],
    ['blank', '    '],
    ['two characters', 'ok'],
    ['padded two characters', '  ok  '],
    ['over the limit', 'x'.repeat(REVIEW_NOTE_MAX_LENGTH + 1)],
  ])('REASON_REQUIRED for %s', (_name, note) => {
    expect(run(note)).toBe('REASON_REQUIRED');
  });

  it.each([
    ['exactly 3 characters', 'abc'],
    ['exactly 200 characters', 'x'.repeat(REVIEW_NOTE_MAX_LENGTH)],
    ['padded 3 characters', '  abc  '],
    ['3 emoji (code points)', '😀😀😀'],
  ])('allows %s', (_name, note) => {
    expect(run(note)).toBe('allow');
  });

  it('puts permission and state errors ahead of the note check', () => {
    const dodi = personaNamed('Dodi');
    expect(code(canReturnTask(dodi.principal, dodiTask, dodi.membership, ''))).toBe('NOT_MANAGER');
    expect(code(canReturnTask(mira.principal, task({ status: 'done' }), mira.membership, ''))).toBe(
      'WRONG_STATE',
    );
    const nico = persona('PM-K');
    expect(code(canReturnTask(nico.principal, task(), nico.membership, ''))).toBe('SELF_REVIEW');
  });
});

describe('canChangeReviewer', () => {
  const pool: ReviewerPool = { managers: [NICO, MIRA], adminIds: ['U-ayu'] };
  const dodiTask = task({ assigneeId: 'U-dodi', createdBy: 'U-rina', status: 'in_progress' });
  const call = (who: [Principal, Membership], t: TaskSubject, next: string) =>
    code(canChangeReviewer(who[0], t, who[1], next, pool));

  it('lets Admin, SA, PM-K and M-K pick a manager or an Admin', () => {
    for (const c of ['SA', 'AD', 'PM-K', 'M-K'] as PersonaCode[])
      for (const next of ['U-nico', 'U-mira', 'U-ayu'])
        expect(call(as(persona(c)), dodiTask, next)).toBe('allow');
  });

  it('lets the creating Member change it, but not another Member (K8)', () => {
    expect(call(as(personaNamed('Rina')), dodiTask, 'U-mira')).toBe('allow');
    expect(call(as(personaNamed('Dodi')), dodiTask, 'U-mira')).toBe('NOT_OWNER');
  });

  it.each(['PM-X', 'PT', 'BA'] as PersonaCode[])('%s is not a member for this action', (c) => {
    expect(call(as(persona(c)), dodiTask, 'U-mira')).toBe('NOT_MEMBER');
  });

  it('refuses the assignee as reviewer (SELF_REVIEW) and strangers (NO_ELIGIBLE_REVIEWER)', () => {
    const nico = as(persona('PM-K'));
    expect(call(nico, task({ assigneeId: 'U-nico' }), 'U-nico')).toBe('SELF_REVIEW');
    expect(call(nico, dodiTask, 'U-dodi')).toBe('SELF_REVIEW');
    expect(call(nico, dodiTask, 'U-rina')).toBe('NO_ELIGIBLE_REVIEWER');
    expect(call(nico, dodiTask, 'U-nobody')).toBe('NO_ELIGIBLE_REVIEWER');
  });

  it('refuses an inactive manager', () => {
    const inactive: ReviewerPool = {
      managers: [NICO, mgr('U-mira', '2026-09-05', false)],
      adminIds: [],
    };
    const d = canChangeReviewer(
      persona('PM-K').principal,
      dodiTask,
      persona('PM-K').membership,
      'U-mira',
      inactive,
    );
    expect(code(d)).toBe('NO_ELIGIBLE_REVIEWER');
  });

  it('allows a swap mid-review but not once the task is done or canceled', () => {
    const nico = as(persona('PM-K'));
    expect(call(nico, task({ status: 'in_review', assigneeId: 'U-dodi' }), 'U-mira')).toBe('allow');
    for (const status of ['done', 'canceled'] as const)
      expect(call(nico, task({ status, assigneeId: 'U-dodi' }), 'U-mira')).toBe('LOCKED_BY_STATUS');
  });

  it('is frozen in a trashed project', () => {
    const t = task({ assigneeId: 'U-dodi', projectDeletedAt: new Date() });
    expect(call(as(persona('PM-K')), t, 'U-mira')).toBe('PROJECT_IN_TRASH');
  });
});

describe('catalog placement', () => {
  it('NO_ELIGIBLE_REVIEWER is an API-catalog code with a 409 and a message', () => {
    expect(PM_ERRORS.NO_ELIGIBLE_REVIEWER.http).toBe(409);
    expect(PM_ERRORS.NO_ELIGIBLE_REVIEWER.message.length).toBeGreaterThan(0);
  });
});
