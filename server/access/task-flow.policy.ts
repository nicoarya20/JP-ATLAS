/**
 * Pure task workflow policy: the status state machine as data (`TASK_TRANSITIONS`) and who
 * may take each step (R03 §3.4, K8/K9, T-A4, M9, M25). The service, the tests and the
 * "next step" button all read the same table, so a transition cannot exist in one place only.
 * Review steps (request, approve, return) are decided in `review.policy`.
 */
import type { TaskCancelCategory, TaskStatus } from '../pm/enums';
import { allow, type Decision, deny } from './decision';
import {
  canApproveTask,
  canRequestReview,
  REVIEW_NOTE_MAX_LENGTH,
  REVIEW_NOTE_MIN_LENGTH,
  type ReviewerPool,
} from './review.policy';
import { ACCESS_RULES, type AccessRules } from './rules';
import { guardTask, type NotVisible, type TaskActor } from './task.policy';
import type { Membership, Principal, TaskSubject } from './types';

/** The nine workflow actions; `FlowAction` names double as the `can` keys the UI derives (M29). */
export type FlowAction =
  | 'start'
  | 'unstart'
  | 'complete'
  | 'requestReview'
  | 'approve'
  | 'return'
  | 'reopen'
  | 'cancel'
  | 'uncancel';

/** One allowed status change; `when`/`rule` narrow it, `needs` names the input the caller must supply. */
export type TaskTransition = {
  from: TaskStatus;
  to: TaskStatus;
  action: FlowAction;
  when?: 'needsReview=true' | 'needsReview=false';
  /** Only available while this `ACCESS_RULES` flag is on. */
  rule?: 'T_A4_COMPLETE_FROM_TODO';
  needs?: 'note' | 'reason' | 'category';
};

// One row per from→to pair (12) so "every other pair is rejected" is a plain lookup. A pair
// maps to exactly one action, which is what `findTransition` relies on.
/** The only legal status changes of a task; anything else is `WRONG_STATE`. */
export const TASK_TRANSITIONS: readonly TaskTransition[] = Object.freeze([
  { from: 'todo', to: 'in_progress', action: 'start' },
  { from: 'in_progress', to: 'todo', action: 'unstart' },
  {
    from: 'todo',
    to: 'done',
    action: 'complete',
    when: 'needsReview=false',
    rule: 'T_A4_COMPLETE_FROM_TODO',
  },
  { from: 'in_progress', to: 'done', action: 'complete', when: 'needsReview=false' },
  { from: 'in_progress', to: 'in_review', action: 'requestReview', when: 'needsReview=true' },
  { from: 'in_review', to: 'done', action: 'approve' },
  { from: 'in_review', to: 'in_progress', action: 'return', needs: 'note' },
  { from: 'done', to: 'in_progress', action: 'reopen', needs: 'reason' },
  { from: 'todo', to: 'canceled', action: 'cancel', needs: 'category' },
  { from: 'in_progress', to: 'canceled', action: 'cancel', needs: 'category' },
  { from: 'in_review', to: 'canceled', action: 'cancel', needs: 'category' },
  { from: 'canceled', to: 'todo', action: 'uncancel' },
]);

/** What a step changes besides the status: the actor takes over an unassigned task (K9, T-A4). */
export type FlowEffect = 'BECOMES_ASSIGNEE';

/** Allow, optionally with effects the service must apply in the same transaction. */
export type FlowAllow = { ok: true; effects?: readonly FlowEffect[] };

/** Result of a workflow check. */
export type FlowDecision = FlowAllow | Extract<Decision, { ok: false }> | NotVisible;

/** The single control a task row shows (R03 §3.3); restoring from the Trash joins it with S6. */
export type PrimaryAction =
  | 'start'
  | 'complete'
  | 'requestReview'
  | 'approve'
  | 'reopen'
  | 'uncancel';

const BECOMES_ASSIGNEE: FlowAllow = { ok: true, effects: ['BECOMES_ASSIGNEE'] };

/** Steps where an actor working an unassigned task becomes its assignee. */
const TAKES_OVER: readonly FlowAction[] = ['start', 'complete'];

const whenHolds = (t: TaskTransition, task: TaskSubject) =>
  !t.when || (t.when === 'needsReview=true') === task.needsReview;

/** The transition between two statuses, or undefined when the pair is not allowed. */
export function findTransition(from: TaskStatus, to: TaskStatus): TaskTransition | undefined {
  return TASK_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

/** The steps open to a task right now (no actor involved); a trashed task has none. */
export function nextStatuses(
  task: TaskSubject,
  rules: AccessRules = ACCESS_RULES,
): readonly TaskTransition[] {
  if (task.deletedAt || task.projectDeletedAt) return [];
  return TASK_TRANSITIONS.filter(
    (t) => t.from === task.status && whenHolds(t, task) && (!t.rule || rules[t.rule]),
  );
}

// Why a step is unavailable matters: "complete" on a reviewed task says review is required,
// not "the status changed", so the UI can offer the right next step.
function checkTransition(task: TaskSubject, action: FlowAction, rules: AccessRules): Decision {
  const t = TASK_TRANSITIONS.find((x) => x.action === action && x.from === task.status);
  if (!t) return deny('WRONG_STATE');
  if (t.rule && !rules[t.rule]) return deny('WRONG_STATE');
  if (!whenHolds(t, task)) return deny(action === 'complete' ? 'REVIEW_REQUIRED' : 'WRONG_STATE');
  return allow();
}

// Order matters for the message shown: role, then trash, then status, then caller input.
function flow(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  action: FlowAction,
  who: TaskActor,
  rules: AccessRules,
): FlowDecision {
  const base = guardTask(p, task, m, who, rules);
  if (!base.ok) return base;
  const state = checkTransition(task, action, rules);
  if (!state.ok) return state;
  return TAKES_OVER.includes(action) && task.assigneeId === null ? BECOMES_ASSIGNEE : allow();
}

/** Whether `p` may start `task`; anyone who may create tasks can take an unassigned one (K9). */
export function canStartTask(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): FlowDecision {
  return flow(p, task, m, 'start', 'assigneeOrUnassigned', rules);
}

/** Whether `p` may move `task` back to "todo"; same actors as starting it (K8). */
export function canUnstartTask(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): FlowDecision {
  return flow(p, task, m, 'unstart', 'assigneeOrUnassigned', rules);
}

/** Whether `p` may finish `task` directly; a task that needs review must be reviewed instead (T-A4). */
export function canCompleteTask(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): FlowDecision {
  return flow(p, task, m, 'complete', 'assigneeOrUnassigned', rules);
}

/** Whether `p` may reopen a finished task: its creator or assignee, or a manager. */
function reopenAccess(p: Principal, task: TaskSubject, m: Membership, rules: AccessRules) {
  return flow(p, task, m, 'reopen', 'creatorOrAssignee', rules);
}

/** Whether `p` may reopen `task` with a 3-200 character reason. */
export function canReopenTask(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  reason: string,
  rules: AccessRules = ACCESS_RULES,
): FlowDecision {
  const base = reopenAccess(p, task, m, rules);
  if (!base.ok) return base;
  // Code points, not UTF-16 units, so an emoji counts as one character in the UI counter.
  const length = [...reason.trim()].length;
  const valid = length >= REVIEW_NOTE_MIN_LENGTH && length <= REVIEW_NOTE_MAX_LENGTH;
  return valid ? base : deny('REASON_REQUIRED');
}

/** Why a task is canceled; "other" needs a note so the history stays explainable. */
export type CancelInput = { category: TaskCancelCategory; note: string };

/** Whether `p` may cancel `task`: its creator or a manager, with a note when the category is "other". */
export function canCancelTask(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  i: CancelInput,
  rules: AccessRules = ACCESS_RULES,
): FlowDecision {
  const base = flow(p, task, m, 'cancel', 'creator', rules);
  if (!base.ok) return base;
  return i.category === 'other' && i.note.trim() === '' ? deny('CANCEL_NOTE_REQUIRED') : base;
}

/** Whether `p` may restore a canceled task; same rule as canceling it (M9, K8). */
export function canUncancelTask(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): FlowDecision {
  return flow(p, task, m, 'uncancel', 'creator', rules);
}

/**
 * The one button a task row offers this principal, or null. The service computes it so the
 * UI never branches on roles (K1): start, then complete or request review, then approve;
 * a finished or canceled task offers reopen or restore.
 */
export function primaryAction(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  pool: ReviewerPool,
  rules: AccessRules = ACCESS_RULES,
): PrimaryAction | null {
  if (task.deletedAt || task.projectDeletedAt) return null;
  const ok = (d: { ok: boolean }) => d.ok;
  switch (task.status) {
    case 'todo':
      return ok(canStartTask(p, task, m, rules)) ? 'start' : null;
    case 'in_progress':
      if (!task.needsReview) return ok(canCompleteTask(p, task, m, rules)) ? 'complete' : null;
      return ok(canRequestReview(p, task, m, pool, rules)) ? 'requestReview' : null;
    case 'in_review':
      return ok(canApproveTask(p, task, m, rules)) ? 'approve' : null;
    case 'done':
      return ok(reopenAccess(p, task, m, rules)) ? 'reopen' : null;
    case 'canceled':
      return ok(canUncancelTask(p, task, m, rules)) ? 'uncancel' : null;
  }
}
