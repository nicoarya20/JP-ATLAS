import { describe, expect, it } from 'bun:test';
import type { Decision } from '../../server/access/decision';
import {
  canApproveTask,
  canRequestReview,
  canReturnTask,
  type ReviewerPool,
} from '../../server/access/review.policy';
import { ACCESS_RULES } from '../../server/access/rules';
import {
  canComment,
  canEditTask,
  canToggleNeedsReview,
  canViewTask,
} from '../../server/access/task.policy';
import {
  canCancelTask,
  canCompleteTask,
  canReopenTask,
  canStartTask,
  canUncancelTask,
  canUnstartTask,
  type FlowAction,
  nextStatuses,
} from '../../server/access/task-flow.policy';
import type { Membership, Principal, TaskSubject } from '../../server/access/types';
import { TASK_STATUSES, type TaskStatus } from '../../server/pm/enums';
import { PERSONA_CODES, type Persona, type PersonaCode, persona } from './fixtures';

// R03 §3.8 layer 2: status(5) × needsReview(2) × persona(8) × relation(4) = 320 per action.
const RELATIONS = ['creator', 'assignee', 'both', 'neither'] as const;
type Relation = (typeof RELATIONS)[number];
const NOW = new Date('2026-10-07T00:00:00Z');
const NOTE = 'Alasan yang cukup jelas';
const POOL: ReviewerPool = { managers: [], adminIds: ['U-someone-else'] };

/** A task related to `who` as creator, assignee, both, or neither; strangers are fixed ids. */
function subject(who: Persona, rel: Relation, status: TaskStatus, needsReview: boolean) {
  const creator = rel === 'creator' || rel === 'both';
  const assignee = rel === 'assignee' || rel === 'both';
  return {
    id: 'T-m',
    projectId: 'P-atlas',
    status,
    createdBy: creator ? who.principal.id : 'U-stranger-1',
    assigneeId: assignee ? who.principal.id : 'U-stranger-2',
    reviewerId: null,
    needsReview,
    deletedAt: null,
    deletedBy: null,
    projectDeletedAt: null,
  } satisfies TaskSubject;
}

// What the matrix of R03 §2.2 says about the actor alone, written as data and not derived from the policies.
type Verdict = 'ok' | 'NOT_MEMBER' | 'NOT_MANAGER' | 'NOT_OWNER' | 'NOT_FOUND';
type Member = (rel: Relation) => Verdict;
const creatorOrAssignee: Member = (r) => (r === 'neither' ? 'NOT_OWNER' : 'ok');
const creatorOnly: Member = (r) => (r === 'creator' || r === 'both' ? 'ok' : 'NOT_OWNER');
// Assignees are always set in this matrix, so "taking an unassigned task" never applies here.
const assigneeOnly: Member = (r) => (r === 'assignee' || r === 'both' ? 'ok' : 'NOT_OWNER');

type RoleRow = Record<PersonaCode, Verdict | Member>;
const row = (ag: Member | Verdict, pmx: Verdict, pt: Verdict): RoleRow => ({
  SA: 'ok',
  AD: 'ok', // K6: an Admin is never limited by the project role they happen to hold
  'PM-K': 'ok',
  'PM-X': pmx,
  'M-K': 'ok',
  AG: ag,
  PT: pt,
  BA: 'NOT_FOUND', // M21: a Member outside the project gets 404
});
const writer = (ag: Member): RoleRow => row(ag, 'NOT_MEMBER', 'NOT_MEMBER');
const managerOnly = row('NOT_MANAGER', 'NOT_MANAGER', 'NOT_MANAGER');

const open = () => 'ok';
const only =
  (...statuses: TaskStatus[]) =>
  (s: TaskStatus) =>
    statuses.includes(s) ? 'ok' : 'WRONG_STATE';
const complete = (s: TaskStatus, review: boolean) =>
  only('todo', 'in_progress')(s) === 'ok' && review
    ? 'REVIEW_REQUIRED'
    : only('todo', 'in_progress')(s);
const unlocked = (s: TaskStatus) =>
  s === 'in_review' || s === 'done' || s === 'canceled' ? 'LOCKED_BY_STATUS' : 'ok';

type ActionSpec = {
  role: RoleRow;
  state: (s: TaskStatus, review: boolean) => string;
  run: (p: Principal, t: TaskSubject, m: Membership) => { ok: boolean; code?: string };
};
const ACTIONS: Record<string, ActionSpec> = {
  'task.view': { role: row('ok', 'ok', 'ok'), state: open, run: (p, t, m) => canViewTask(p, t, m) },
  'comment.add': {
    role: row('ok', 'NOT_MEMBER', 'ok'),
    state: open,
    run: (p, t, m) => canComment(p, t, m),
  },
  'task.update': {
    role: writer(creatorOrAssignee),
    state: open,
    run: (p, t, m) => canEditTask(p, t, m),
  },
  'task.start': {
    role: writer(assigneeOnly),
    state: only('todo'),
    run: (p, t, m) => canStartTask(p, t, m),
  },
  'task.unstart': {
    role: writer(assigneeOnly),
    state: only('in_progress'),
    run: (p, t, m) => canUnstartTask(p, t, m),
  },
  'task.complete': {
    role: writer(assigneeOnly),
    state: complete,
    run: (p, t, m) => canCompleteTask(p, t, m),
  },
  'task.reopen': {
    role: writer(creatorOrAssignee),
    state: only('done'),
    run: (p, t, m) => canReopenTask(p, t, m, NOTE),
  },
  'task.cancel': {
    role: writer(creatorOnly),
    state: only('todo', 'in_progress', 'in_review'),
    run: (p, t, m) => canCancelTask(p, t, m, { category: 'duplicate', note: '' }),
  },
  'task.uncancel': {
    role: writer(creatorOnly),
    state: only('canceled'),
    run: (p, t, m) => canUncancelTask(p, t, m),
  },
  'needsReview.on': {
    role: writer(creatorOrAssignee),
    state: unlocked,
    run: (p, t, m) => canToggleNeedsReview(p, t, m, true),
  },
  'needsReview.off': {
    role: managerOnly,
    state: unlocked,
    run: (p, t, m) => canToggleNeedsReview(p, t, m, false),
  },
};

function expected(spec: ActionSpec, code: PersonaCode, rel: Relation, s: TaskStatus, nr: boolean) {
  const cell = spec.role[code];
  const verdict = typeof cell === 'function' ? cell(rel) : cell;
  return verdict !== 'ok' ? verdict : spec.state(s, nr);
}

const label = (d: { ok: boolean; code?: string }) => (d.ok ? 'ok' : d.code);

describe('task matrix: status × needsReview × persona × relation', () => {
  it.each(Object.keys(ACTIONS))('%s agrees with R03 §2.2 on all 320 combinations', (name) => {
    const spec = ACTIONS[name] as ActionSpec;
    const mismatches: string[] = [];
    let combos = 0;
    for (const code of PERSONA_CODES) {
      const who = persona(code);
      for (const rel of RELATIONS)
        for (const status of TASK_STATUSES)
          for (const nr of [false, true]) {
            combos++;
            const want = expected(spec, code, rel, status, nr);
            const got = label(
              spec.run(who.principal, subject(who, rel, status, nr), who.membership),
            );
            if (got !== want)
              mismatches.push(`${code}/${rel}/${status}/nr=${nr}: ${got} != ${want}`);
          }
    }
    expect(combos).toBe(320);
    expect(mismatches).toEqual([]);
  });
});

// "Every pair outside TASK_TRANSITIONS is WRONG_STATE": one actor who may do everything, every action,
// every status, both review flags. Allowed exactly when the shared table offers that action.
type FlowRun = (
  p: Principal,
  t: TaskSubject,
  m: Membership,
) => Decision | { ok: false; code: string } | { ok: true };
const FLOW_RUNS: Record<FlowAction, FlowRun> = {
  start: canStartTask,
  unstart: canUnstartTask,
  complete: canCompleteTask,
  requestReview: (p, t, m) => canRequestReview(p, t, m, POOL),
  approve: canApproveTask,
  return: (p, t, m) => canReturnTask(p, t, m, NOTE),
  reopen: (p, t, m) => canReopenTask(p, t, m, NOTE),
  cancel: (p, t, m) => canCancelTask(p, t, m, { category: 'duplicate', note: '' }),
  uncancel: canUncancelTask,
};

describe('task matrix: transitions outside TASK_TRANSITIONS', () => {
  const boss = persona('SA');

  it.each(Object.keys(FLOW_RUNS) as FlowAction[])(
    '%s is allowed from a status exactly when nextStatuses offers it, else WRONG_STATE',
    (action) => {
      const run = FLOW_RUNS[action];
      for (const status of TASK_STATUSES)
        for (const nr of [false, true]) {
          const t = subject(boss, 'neither', status, nr);
          const offered = nextStatuses(t).some((x) => x.action === action);
          const got = label(run(boss.principal, t, boss.membership));
          // `complete` on a reviewed task is REVIEW_REQUIRED: the pair exists, only the review rule blocks it.
          const blockedByReview =
            action === 'complete' && nr && ['todo', 'in_progress'].includes(status);
          const want = offered ? 'ok' : blockedByReview ? 'REVIEW_REQUIRED' : 'WRONG_STATE';
          expect({ action, status, nr, got }).toEqual({ action, status, nr, got: want });
        }
    },
  );

  it('removes todo→done everywhere when T-A4 is off', () => {
    const rules = { ...ACCESS_RULES, T_A4_COMPLETE_FROM_TODO: false };
    const t = subject(boss, 'neither', 'todo', false);
    expect(label(canCompleteTask(boss.principal, t, boss.membership, rules))).toBe('WRONG_STATE');
    expect(nextStatuses(t, rules).some((x) => x.action === 'complete')).toBe(false);
  });
});

describe('task matrix: invariants', () => {
  const combos = RELATIONS.flatMap((rel) =>
    TASK_STATUSES.flatMap((status) => [false, true].map((nr) => ({ rel, status, nr }))),
  );
  const ok = (spec: ActionSpec, code: PersonaCode, c: (typeof combos)[number]) => {
    const who = persona(code);
    return spec.run(who.principal, subject(who, c.rel, c.status, c.nr), who.membership).ok;
  };

  it.each(Object.keys(ACTIONS))(
    '%s: Super-admin ≡ Admin and Project Manager-manager ≡ Member-manager',
    (name) => {
      const spec = ACTIONS[name] as ActionSpec;
      for (const c of combos) {
        expect(ok(spec, 'AD', c)).toBe(ok(spec, 'SA', c));
        expect(ok(spec, 'M-K', c)).toBe(ok(spec, 'PM-K', c));
      }
    },
  );

  it.each(Object.keys(ACTIONS))('%s: admin ⊇ manager ⊇ member ⊇ viewer', (name) => {
    const spec = ACTIONS[name] as ActionSpec;
    for (const c of combos) {
      if (ok(spec, 'PT', c)) expect(ok(spec, 'AG', c)).toBe(true);
      if (ok(spec, 'AG', c)) expect(ok(spec, 'PM-K', c)).toBe(true);
      if (ok(spec, 'PM-K', c)) expect(ok(spec, 'SA', c)).toBe(true);
    }
  });

  it.each(Object.keys(ACTIONS))(
    '%s: nobody outside the project can write or see more than the matrix says',
    (name) => {
      const spec = ACTIONS[name] as ActionSpec;
      const readOnly = name === 'task.view';
      for (const c of combos) {
        expect(ok(spec, 'BA', c)).toBe(false);
        if (!readOnly) expect(ok(spec, 'PM-X', c)).toBe(false);
      }
    },
  );

  it.each(Object.keys(ACTIONS))(
    '%s: nothing but viewing works once the task or project is trashed',
    (name) => {
      if (name === 'task.view') return;
      const spec = ACTIONS[name] as ActionSpec;
      // A status where the action is otherwise legal, so the denial can only come from the Trash.
      const status = TASK_STATUSES.find((s) => spec.state(s, false) === 'ok') as TaskStatus;
      const boss = persona('SA');
      expect(
        spec.run(boss.principal, subject(boss, 'both', status, false), boss.membership).ok,
      ).toBe(true);
      for (const code of PERSONA_CODES) {
        const who = persona(code);
        for (const trash of [{ deletedAt: NOW }, { projectDeletedAt: NOW }]) {
          const t = { ...subject(who, 'both', status, false), ...trash };
          expect(spec.run(who.principal, t, who.membership).ok).toBe(false);
        }
      }
    },
  );
});
