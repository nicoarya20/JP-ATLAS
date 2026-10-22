/**
 * Pure task policy: who may see, create, edit, comment on and configure tasks (R03 §2.2,
 * T-A2/T-A5, K10, Q12). The status workflow lives in `task-flow.policy`. Logic only: no
 * storage or runtime globals, so the same functions gate the API and the UI buttons.
 */
import { TASK_REVIEW_UI_ENABLED } from '../pm/limits';
import { allow, type Decision, deny } from './decision';
import { atLeast, type Level, levelOf } from './level';
import { type NotVisible as Hidden, notVisible } from './not-visible';
import { ACCESS_RULES, type AccessRules } from './rules';
import type { Membership, Principal, ProjectSubject, TaskSubject } from './types';

// 404 is not a `DenyCode` (a hidden record must look like a missing one, `pm/errors`), and
// `NOT_FOUND` lives in the API catalog, so it gets its own type, as `NO_ELIGIBLE_REVIEWER` does.
/** Denial for a task or project the principal may not even see (HTTP 404, never 403). */
export type NotVisible = Hidden<'NOT_FOUND'>;

/** A `Decision` that may also say "you cannot see this" (`NOT_FOUND`). */
export type TaskDecision = Decision | NotVisible;

/** Who a member-level principal must be to act: the others are decided by `Level` alone. */
export type TaskActor =
  | 'manager' // admin or project manager only
  | 'member' // any admin, manager or member
  | 'creator'
  | 'creatorOrAssignee'
  | 'assignee'
  | 'assigneeOrUnassigned'; // "taking" an unassigned task (K9)

const NOT_VISIBLE = notVisible('NOT_FOUND');

/** Project statuses where work has stopped; tasks stay writable there unless the Q12 flag is off. */
const CLOSED_PROJECT_STATUSES: readonly ProjectSubject['status'][] = [
  'on_hold',
  'completed',
  'canceled',
];

/** Whether the task is in the principal's own scope for a member-level action. */
function ownsTask(p: Principal, task: TaskSubject, who: TaskActor): boolean {
  const creator = task.createdBy === p.id;
  const assignee = task.assigneeId === p.id;
  switch (who) {
    case 'creator':
      return creator;
    case 'assignee':
      return assignee;
    case 'creatorOrAssignee':
      return creator || assignee;
    case 'assigneeOrUnassigned':
      return assignee || task.assigneeId === null;
    default:
      return true;
  }
}

/**
 * Role check for a task action. A non-member sees nothing (404); an Admin passes any `who`
 * (K6); a viewer or a non-member PM is told they are not a member (K10), except for
 * manager-only actions, which say "not manager" so the UI hides the control.
 */
export function authorizeTask(
  level: Level,
  p: Principal,
  task: TaskSubject,
  who: TaskActor,
): TaskDecision {
  if (level === 'none') return NOT_VISIBLE;
  if (atLeast(level, 'manager')) return allow();
  if (who === 'manager') return deny('NOT_MANAGER');
  if (level !== 'member') return deny('NOT_MEMBER');
  return ownsTask(p, task, who) ? allow() : deny('NOT_OWNER');
}

/** A task in the Trash, or whose project is, is frozen: only restore is allowed (R03 §2.2). */
export function taskOpen(task: TaskSubject): Decision {
  if (task.projectDeletedAt) return deny('PROJECT_IN_TRASH');
  if (task.deletedAt) return deny('WRONG_STATE');
  return allow();
}

/** Role check, then the trash freeze: the order decides which message the user sees. */
export function guardTask(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  who: TaskActor,
  rules: AccessRules = ACCESS_RULES,
): TaskDecision {
  const role = authorizeTask(levelOf(p, m, rules), p, task, who);
  return role.ok ? taskOpen(task) : role;
}

/** Whether `p` may open the task: any project role, or a non-member PM while P-A1 is on. */
export function canViewTask(
  p: Principal,
  _task: TaskSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): TaskDecision {
  return levelOf(p, m, rules) === 'none' ? NOT_VISIBLE : allow();
}

/** Whether `p` may add a task to `project`; Completed, On-hold and Canceled projects still accept tasks (Q12). */
export function canCreateTask(
  p: Principal,
  project: ProjectSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): TaskDecision {
  const level = levelOf(p, m, rules);
  if (level === 'none') return NOT_VISIBLE;
  if (!atLeast(level, 'member')) return deny('NOT_MEMBER');
  if (project.deletedAt) return deny('PROJECT_IN_TRASH');
  const closed = CLOSED_PROJECT_STATUSES.includes(project.status);
  return closed && !rules.PROJECT_CLOSED_ALLOWS_TASK_WRITES ? deny('WRONG_STATE') : allow();
}

/** The member scope of editing: only own tasks (T-A2 `own`), or every task in the project (`all`). */
function editActor(rules: AccessRules): TaskActor {
  return rules.T_A2_MEMBER_EDIT_SCOPE === 'all' ? 'member' : 'creatorOrAssignee';
}

/** Whether `p` may change the task's content, checklist or assignee: managers always, a Member only on own tasks (T-A2). */
export function canEditTask(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): TaskDecision {
  return guardTask(p, task, m, editActor(rules), rules);
}

/** Whether `p` may comment: every project role including viewers; a non-member PM only if P-A1b is on (K10). */
export function canComment(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): TaskDecision {
  const level = levelOf(p, m, rules);
  if (level === 'none') return NOT_VISIBLE;
  if (level === 'reader' && !rules.P_A1B_PM_NON_MEMBER_COMMENTS) return deny('NOT_MEMBER');
  return taskOpen(task);
}

/** Whether `p` may add, rename or remove the project's task kinds: managers and Admin only. */
export function canManageKinds(
  p: Principal,
  project: ProjectSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): TaskDecision {
  const level = levelOf(p, m, rules);
  if (level === 'none') return NOT_VISIBLE;
  if (!atLeast(level, 'manager')) return deny('NOT_MANAGER');
  return project.deletedAt ? deny('PROJECT_IN_TRASH') : allow();
}

/** Statuses where "needs review" is frozen: the task is being reviewed or already finished. */
const REVIEW_LOCKED_STATUSES: readonly TaskSubject['status'][] = ['in_review', 'done', 'canceled'];

/**
 * Whether `p` may switch "needs review" to `next`. Turning it on follows the edit scope
 * (a Member only with T-A5); turning it off is manager-only. A locked status wins over
 * the no-op check, so the control is disabled even when the value would not change.
 */
export function canToggleNeedsReview(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  next: boolean,
  rules: AccessRules = ACCESS_RULES,
): TaskDecision {
  const memberMayEnable = rules.T_A5_MEMBER_ENABLES_REVIEW;
  const who: TaskActor = next && memberMayEnable ? editActor(rules) : 'manager';
  const base = guardTask(p, task, m, who, rules);
  if (!base.ok) return base;
  return REVIEW_LOCKED_STATUSES.includes(task.status) ? deny('LOCKED_BY_STATUS') : allow();
}

/** Inputs of `resolveNeedsReviewOnCreate`; `level` is the creator's level in the project. */
export type NeedsReviewOnCreate = {
  projectDefault: boolean;
  requested?: boolean;
  level: Level;
};

/**
 * Resolve "needs review" for a new task. A Member cannot opt out of a project default of
 * on (`ignored`, so CSV import can warn). While the review UI is off (M25) every `true` is
 * dropped, otherwise a task nobody can approve would block "complete".
 */
export function resolveNeedsReviewOnCreate(
  i: NeedsReviewOnCreate,
  reviewUiEnabled: boolean = TASK_REVIEW_UI_ENABLED,
): { value: boolean; ignored: boolean } {
  const wanted = i.requested ?? i.projectDefault;
  if (!reviewUiEnabled) return { value: false, ignored: wanted };
  if (i.level === 'member' && i.projectDefault && i.requested === false)
    return { value: true, ignored: true };
  return { value: wanted, ignored: false };
}
