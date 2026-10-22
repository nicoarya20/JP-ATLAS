import { describe, expect, it } from 'bun:test';
import type { ManagerInfo, ReviewerPool } from '../../server/access/review.policy';
import { ACCESS_RULES } from '../../server/access/rules';
import {
  canCancelTask,
  canCompleteTask,
  canReopenTask,
  canStartTask,
  canUncancelTask,
  canUnstartTask,
  findTransition,
  nextStatuses,
  primaryAction,
  TASK_TRANSITIONS,
} from '../../server/access/task-flow.policy';
import type { TaskSubject } from '../../server/access/types';
import { TASK_STATUSES, type TaskStatus } from '../../server/pm/enums';
import { type PersonaCode, persona, personaNamed } from './fixtures';

// Task #12 from R03 §3.8: made by Rina, worked by Nico, review required.
const task = (o: Partial<TaskSubject> = {}): TaskSubject => ({
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
const mgr = (userId: string, joined: string): ManagerInfo => ({
  userId,
  joinedAt: new Date(`${joined}T00:00:00Z`),
  active: true,
});
const POOL: ReviewerPool = {
  managers: [mgr('U-nico', '2026-09-01'), mgr('U-mira', '2026-09-05')],
  adminIds: [],
};
const code = (d: { ok: boolean; code?: string }) => (d.ok ? 'allow' : d.code);
const NOW = new Date('2026-10-07T00:00:00Z');
const REASON = 'Hasilnya perlu diperbaiki';

// The 12 pairs of R03 §3.4, written out once more so a typo in the data cannot test itself.
const EXPECTED_PAIRS = [
  'todo>in_progress',
  'in_progress>todo',
  'todo>done',
  'in_progress>done',
  'in_progress>in_review',
  'in_review>done',
  'in_review>in_progress',
  'done>in_progress',
  'todo>canceled',
  'in_progress>canceled',
  'in_review>canceled',
  'canceled>todo',
];

describe('TASK_TRANSITIONS', () => {
  it('holds exactly the 12 from→to pairs of the workflow', () => {
    const pairs = TASK_TRANSITIONS.map((t) => `${t.from}>${t.to}`);
    expect([...pairs].sort()).toEqual([...EXPECTED_PAIRS].sort());
  });

  it('maps every pair to one action, and every (action, from) to one pair', () => {
    const byAction = TASK_TRANSITIONS.map((t) => `${t.action}@${t.from}`);
    expect(new Set(byAction).size).toBe(TASK_TRANSITIONS.length);
  });

  it('rejects the other 13 of the 25 status pairs, including every self-pair', () => {
    const open = new Set(EXPECTED_PAIRS);
    let rejected = 0;
    for (const from of TASK_STATUSES)
      for (const to of TASK_STATUSES) {
        if (open.has(`${from}>${to}`)) {
          expect(findTransition(from, to)).toBeDefined();
        } else {
          expect(findTransition(from, to)).toBeUndefined();
          rejected++;
        }
      }
    expect(rejected).toBe(13);
  });

  it('is frozen so the service cannot mutate the single source', () => {
    expect(Object.isFrozen(TASK_TRANSITIONS)).toBe(true);
  });
});

describe('nextStatuses', () => {
  const targets = (t: TaskSubject, rules = ACCESS_RULES) =>
    nextStatuses(t, rules).map((x) => `${x.action}>${x.to}`);

  it.each([
    ['todo', false, ['start>in_progress', 'complete>done', 'cancel>canceled']],
    ['todo', true, ['start>in_progress', 'cancel>canceled']],
    ['in_progress', false, ['unstart>todo', 'complete>done', 'cancel>canceled']],
    ['in_progress', true, ['unstart>todo', 'requestReview>in_review', 'cancel>canceled']],
    ['in_review', true, ['approve>done', 'return>in_progress', 'cancel>canceled']],
    ['done', false, ['reopen>in_progress']],
    ['canceled', false, ['uncancel>todo']],
  ] as [TaskStatus, boolean, string[]][])('%s with needsReview=%p', (status, needsReview, out) => {
    expect(targets(task({ status, needsReview }))).toEqual(out);
  });

  it('drops todo→done when T-A4 is off', () => {
    const t = task({ status: 'todo', needsReview: false });
    const rules = { ...ACCESS_RULES, T_A4_COMPLETE_FROM_TODO: false };
    expect(targets(t, rules)).toEqual(['start>in_progress', 'cancel>canceled']);
  });

  it('offers nothing for a trashed task or a task in a trashed project', () => {
    expect(nextStatuses(task({ deletedAt: NOW }))).toEqual([]);
    expect(nextStatuses(task({ projectDeletedAt: NOW }))).toEqual([]);
  });
});

describe('canStartTask (C09, K9)', () => {
  it('C09: Dodi takes an unassigned todo and becomes its assignee', () => {
    const dodi = personaNamed('Dodi');
    const t = task({ status: 'todo', assigneeId: null, needsReview: false });
    expect(canStartTask(dodi.principal, t, dodi.membership)).toEqual({
      ok: true,
      effects: ['BECOMES_ASSIGNEE'],
    });
  });

  it('C09: Dodi cannot take a task Rina is working on (NOT_OWNER)', () => {
    const dodi = personaNamed('Dodi');
    const t = task({ status: 'todo', assigneeId: 'U-rina', needsReview: false });
    expect(code(canStartTask(dodi.principal, t, dodi.membership))).toBe('NOT_OWNER');
  });

  it('adds no effect when the assignee starts their own task', () => {
    const dodi = personaNamed('Dodi');
    const t = task({ status: 'todo', assigneeId: 'U-dodi' });
    expect(canStartTask(dodi.principal, t, dodi.membership)).toEqual({ ok: true });
  });

  it('lets a manager start someone else’s task without taking it over', () => {
    const mira = persona('M-K');
    const t = task({ status: 'todo', assigneeId: 'U-dodi' });
    expect(canStartTask(mira.principal, t, mira.membership)).toEqual({ ok: true });
  });

  it('lets an Admin take an unassigned task', () => {
    const ayu = persona('AD');
    const t = task({ status: 'todo', assigneeId: null });
    expect(canStartTask(ayu.principal, t, ayu.membership)).toEqual({
      ok: true,
      effects: ['BECOMES_ASSIGNEE'],
    });
  });

  it('is WRONG_STATE outside todo and frozen in the Trash', () => {
    const nico = persona('PM-K');
    const start = (t: TaskSubject) => code(canStartTask(nico.principal, t, nico.membership));
    expect(start(task({ status: 'in_progress' }))).toBe('WRONG_STATE');
    expect(start(task({ status: 'todo', deletedAt: NOW }))).toBe('WRONG_STATE');
    expect(start(task({ status: 'todo', projectDeletedAt: NOW }))).toBe('PROJECT_IN_TRASH');
  });
});

describe('canUnstartTask (K8)', () => {
  it('follows the same actors as start and only applies to in_progress', () => {
    const dodi = personaNamed('Dodi');
    const own = task({ assigneeId: 'U-dodi' });
    expect(canUnstartTask(dodi.principal, own, dodi.membership)).toEqual({ ok: true });
    const other = task({ assigneeId: 'U-rina' });
    expect(code(canUnstartTask(dodi.principal, other, dodi.membership))).toBe('NOT_OWNER');
    expect(
      code(canUnstartTask(dodi.principal, task({ ...own, status: 'todo' }), dodi.membership)),
    ).toBe('WRONG_STATE');
  });
});

describe('canCompleteTask (C10, C11, T-A4)', () => {
  it.each(['PM-K', 'AD', 'SA'] as PersonaCode[])(
    'C10: %s is REVIEW_REQUIRED on #12, even as an Admin',
    (c) => {
      const x = persona(c);
      expect(code(canCompleteTask(x.principal, task(), x.membership))).toBe('REVIEW_REQUIRED');
    },
  );

  it('C11: Dodi completes an unassigned todo without review and becomes its assignee', () => {
    const dodi = personaNamed('Dodi');
    const t = task({ status: 'todo', needsReview: false, assigneeId: null });
    expect(canCompleteTask(dodi.principal, t, dodi.membership)).toEqual({
      ok: true,
      effects: ['BECOMES_ASSIGNEE'],
    });
  });

  it('C11: todo→done is WRONG_STATE when T-A4 is off', () => {
    const dodi = personaNamed('Dodi');
    const t = task({ status: 'todo', needsReview: false, assigneeId: null });
    const rules = { ...ACCESS_RULES, T_A4_COMPLETE_FROM_TODO: false };
    expect(code(canCompleteTask(dodi.principal, t, dodi.membership, rules))).toBe('WRONG_STATE');
    const inProgress = task({ status: 'in_progress', needsReview: false, assigneeId: 'U-dodi' });
    expect(canCompleteTask(dodi.principal, inProgress, dodi.membership, rules).ok).toBe(true);
  });

  it('asks for review on a todo too, and reports the wrong status before the review rule', () => {
    const nico = persona('PM-K');
    const run = (t: TaskSubject) => code(canCompleteTask(nico.principal, t, nico.membership));
    expect(run(task({ status: 'todo', needsReview: true }))).toBe('REVIEW_REQUIRED');
    expect(run(task({ status: 'done', needsReview: true }))).toBe('WRONG_STATE');
    expect(run(task({ status: 'in_review', needsReview: true }))).toBe('WRONG_STATE');
  });

  it('reports the role before the review rule', () => {
    const dodi = personaNamed('Dodi');
    expect(code(canCompleteTask(dodi.principal, task(), dodi.membership))).toBe('NOT_OWNER');
  });
});

describe('canReopenTask (C18)', () => {
  const done = (o: Partial<TaskSubject> = {}) =>
    task({ status: 'done', needsReview: false, createdBy: 'U-rina', assigneeId: 'U-dodi', ...o });

  it('C18: the assignee may reopen, a bystander is NOT_OWNER', () => {
    const dodi = personaNamed('Dodi');
    expect(canReopenTask(dodi.principal, done(), dodi.membership, REASON).ok).toBe(true);
    const bystander = done({ assigneeId: 'U-rina', createdBy: 'U-nico' });
    expect(code(canReopenTask(dodi.principal, bystander, dodi.membership, REASON))).toBe(
      'NOT_OWNER',
    );
  });

  it('lets the creator and any manager reopen', () => {
    const rina = personaNamed('Rina');
    const nico = persona('PM-K');
    expect(canReopenTask(rina.principal, done(), rina.membership, REASON).ok).toBe(true);
    expect(canReopenTask(nico.principal, done(), nico.membership, REASON).ok).toBe(true);
  });

  it.each([
    ['', 'REASON_REQUIRED'],
    ['  ab  ', 'REASON_REQUIRED'],
    ['abc', 'allow'],
    ['😀😀😀', 'allow'], // counted as code points, like the UI counter
    ['x'.repeat(200), 'allow'],
    ['x'.repeat(201), 'REASON_REQUIRED'],
  ])('reason %j -> %s', (reason, expected) => {
    const nico = persona('PM-K');
    expect(code(canReopenTask(nico.principal, done(), nico.membership, reason))).toBe(expected);
  });

  it('checks the actor and the status before the reason', () => {
    const dodi = personaNamed('Dodi');
    const bystander = done({ assigneeId: 'U-rina', createdBy: 'U-nico' });
    expect(code(canReopenTask(dodi.principal, bystander, dodi.membership, ''))).toBe('NOT_OWNER');
    const nico = persona('PM-K');
    const open = task({ status: 'in_progress' });
    expect(code(canReopenTask(nico.principal, open, nico.membership, ''))).toBe('WRONG_STATE');
  });
});

describe('canCancelTask / canUncancelTask (C19, M9)', () => {
  const input = { category: 'not_needed', note: '' } as const;

  it('C19: the assignee is NOT_OWNER, the creator may cancel', () => {
    const t = task({ createdBy: 'U-rina', assigneeId: 'U-dodi' });
    const dodi = personaNamed('Dodi');
    const rina = personaNamed('Rina');
    expect(code(canCancelTask(dodi.principal, t, dodi.membership, input))).toBe('NOT_OWNER');
    expect(code(canCancelTask(rina.principal, t, rina.membership, input))).toBe('allow');
  });

  it('lets any manager and Admin cancel', () => {
    for (const c of ['SA', 'AD', 'PM-K', 'M-K'] as PersonaCode[]) {
      const x = persona(c);
      expect(canCancelTask(x.principal, task(), x.membership, input).ok).toBe(true);
    }
  });

  it.each([
    [{ category: 'other', note: '' }, 'CANCEL_NOTE_REQUIRED'],
    [{ category: 'other', note: '   ' }, 'CANCEL_NOTE_REQUIRED'],
    [{ category: 'other', note: 'Klien membatalkan' }, 'allow'],
    [{ category: 'duplicate', note: '' }, 'allow'],
  ] as const)('input %j -> %s', (i, expected) => {
    const nico = persona('PM-K');
    expect(code(canCancelTask(nico.principal, task(), nico.membership, i))).toBe(expected);
  });

  it.each([
    ['todo', 'allow'],
    ['in_progress', 'allow'],
    ['in_review', 'allow'],
    ['done', 'WRONG_STATE'],
    ['canceled', 'WRONG_STATE'],
  ] as const)('cancel from %s -> %s', (status, expected) => {
    const nico = persona('PM-K');
    expect(code(canCancelTask(nico.principal, task({ status }), nico.membership, input))).toBe(
      expected,
    );
  });

  it('M9: uncancel follows the cancel rule and needs a canceled task', () => {
    const t = task({ status: 'canceled', createdBy: 'U-rina', assigneeId: 'U-dodi' });
    const out = (x: ReturnType<typeof persona>, tt = t) =>
      code(canUncancelTask(x.principal, tt, x.membership));
    expect(out(personaNamed('Rina'))).toBe('allow');
    expect(out(personaNamed('Dodi'))).toBe('NOT_OWNER');
    expect(out(persona('PM-K'))).toBe('allow');
    expect(out(persona('PT'))).toBe('NOT_MEMBER');
    expect(out(persona('BA'))).toBe('NOT_FOUND');
    expect(out(persona('PM-K'), task({ status: 'todo' }))).toBe('WRONG_STATE');
  });

  it('freezes both while the task or its project is in the Trash', () => {
    const nico = persona('PM-K');
    const canceled = task({ status: 'canceled', projectDeletedAt: NOW });
    expect(code(canUncancelTask(nico.principal, canceled, nico.membership))).toBe(
      'PROJECT_IN_TRASH',
    );
    const live = task({ status: 'todo', deletedAt: NOW });
    expect(code(canCancelTask(nico.principal, live, nico.membership, input))).toBe('WRONG_STATE');
  });
});

describe('primaryAction (C46)', () => {
  const pick = (name: string, t: TaskSubject, pool = POOL) => {
    const x = personaNamed(name);
    return primaryAction(x.principal, t, x.membership, pool);
  };

  it('C46: start / complete / approve / null / null for the five reference rows', () => {
    expect(pick('Dodi', task({ status: 'todo', assigneeId: 'U-dodi', needsReview: false }))).toBe(
      'start',
    );
    expect(pick('Nico', task({ status: 'in_progress', needsReview: false }))).toBe('complete');
    expect(pick('Nico', task({ status: 'in_review', assigneeId: 'U-rina' }))).toBe('approve');
    expect(pick('Dodi', task({ status: 'in_review', assigneeId: 'U-dodi' }))).toBeNull();
    expect(pick('Sri', task({ status: 'done', needsReview: false }))).toBeNull();
  });

  it('asks for review on an in-progress task that needs it, if someone else can decide', () => {
    const t = task({ status: 'in_progress', needsReview: true });
    expect(pick('Nico', t)).toBe('requestReview');
    const alone: ReviewerPool = { managers: [POOL.managers[0] as ManagerInfo], adminIds: [] };
    expect(pick('Nico', t, alone)).toBeNull();
  });

  it('offers reopen on a done task and restore on a canceled one', () => {
    expect(pick('Nico', task({ status: 'done' }))).toBe('reopen');
    expect(pick('Dodi', task({ status: 'done', assigneeId: 'U-rina' }))).toBeNull();
    expect(pick('Rina', task({ status: 'canceled' }))).toBe('uncancel');
    expect(pick('Dodi', task({ status: 'canceled' }))).toBeNull();
  });

  it('offers nothing to a non-member, an observer, or on a trashed task', () => {
    const open = task({ status: 'todo', assigneeId: null, needsReview: false });
    expect(pick('Bella', open)).toBeNull();
    expect(pick('Sri', open)).toBeNull();
    expect(pick('Nico', { ...open, deletedAt: NOW })).toBeNull();
    expect(pick('Nico', { ...open, projectDeletedAt: NOW })).toBeNull();
  });
});
