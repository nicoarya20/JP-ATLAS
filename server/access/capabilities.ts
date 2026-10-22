/**
 * Capability builder: folds the policy decisions into the small `can{}` map the API sends
 * with a record, so the UI shows, greys out or hides a control without ever branching on a
 * role (R03 §3.7, X3 M29). It composes the `canX` functions and adds no rule of its own.
 *
 * Shape of a value: `true` = shown and enabled; a deny code = shown but disabled, with the
 * tooltip from `DENY_UI`; key absent = hidden. Hide vs disable is owned by `DENY_UI.ui`.
 *
 * ORDER RULE for services: check `canViewTask`/`canViewProject` first and answer 404 when
 * it says "not visible", and only then call an action policy or `taskCaps`. Some action
 * policies (review) answer `NOT_MEMBER` (403) to a non-member, so skipping the view check
 * would leak that a hidden record exists. Capabilities of a hidden record are all absent.
 */
import { canAccessDev } from '../permissions';
import { isDenyCode, PM_ERRORS } from '../pm/errors';
import { DENY_UI, type DenyCode } from './decision';
import {
  canCancelEvent,
  canCreateEvent,
  canManageEvent,
  canManageParticipants,
  canTrashEvent,
  canWriteNote,
} from './event.policy';
import { canCreateProject, canManageProject, canTrashProject } from './project.policy';
import {
  canApproveTask,
  canChangeReviewer,
  canRequestReview,
  canReturnTask,
  REVIEW_NOTE_MIN_LENGTH,
  type ReviewerPool,
  reviewerCandidates,
} from './review.policy';
import { ACCESS_RULES, type AccessRules } from './rules';
import {
  canComment,
  canCreateTask,
  canEditTask,
  canManageKinds,
  canToggleNeedsReview,
} from './task.policy';
import {
  type CancelInput,
  canCancelTask,
  canCompleteTask,
  canReopenTask,
  canStartTask,
  canUncancelTask,
  canUnstartTask,
  type PrimaryAction,
  primaryAction,
} from './task-flow.policy';
import { canTrashTask } from './task-trash.policy';
import type { EventSubject, Membership, Principal, ProjectSubject, TaskSubject } from './types';
import { canManageUsers } from './user.policy';

/** Reviewer-pick failure from the API catalog (not a `DenyCode`); shown disabled, as R03 §3.7 says. */
const NO_ELIGIBLE_REVIEWER = 'NO_ELIGIBLE_REVIEWER';

/** A capability: `true` = enabled, a code = disabled with that reason; hidden ones are left out. */
export type CapValue = true | DenyCode | typeof NO_ELIGIBLE_REVIEWER;

/** Keys of a task's `can{}`: the policy function names without the `can` prefix (X3 M29). */
export const TASK_CAP_KEYS = [
  'update',
  'start',
  'unstart',
  'complete',
  'requestReview',
  'approve',
  'return',
  'reopen',
  'cancel',
  'uncancel',
  'comment',
  'needsReviewOn',
  'needsReviewOff',
  'changeReviewer',
  'trash',
] as const;
export type TaskCapKey = (typeof TASK_CAP_KEYS)[number];

/** Keys of a project's `can{}`; `untrash` joins with the Trash slice (S6) and `attach` with files (S5). */
export const PROJECT_CAP_KEYS = ['update', 'trash', 'createTask', 'manageKinds'] as const;
export type ProjectCapKey = (typeof PROJECT_CAP_KEYS)[number];

// `restore` is deliberately absent: it needs `now` for the retention check and belongs to the
// Trash page, so the Trash slice (S6/E-07) builds it from `canRestoreEvent` itself.
/** Keys of an event's `can{}`: the policy function names without the `can` prefix (X3 M29). */
export const EVENT_CAP_KEYS = [
  'update',
  'cancel',
  'trash',
  'manageParticipants',
  'writeNote',
] as const;
export type EventCapKey = (typeof EVENT_CAP_KEYS)[number];

/** A sparse capability map: a missing key means the control is hidden. */
export type Caps<K extends string> = Partial<Record<K, CapValue>>;
export type TaskCaps = Caps<TaskCapKey> & { primary: PrimaryAction | null };
export type ProjectCaps = Caps<ProjectCapKey>;
export type EventCaps = Caps<EventCapKey>;

/** App-wide capabilities the layout loader sends; the sidebar reads these instead of the role. */
export type AppCaps = {
  createProject: boolean;
  createEvent: boolean;
  dashboard: boolean;
  dev: boolean;
};

/** Any policy result: `Decision`, `FlowDecision`, `ReviewDecision` and the not-visible variants all fit. */
export type Verdict = { ok: true } | { ok: false; code: string };

/** The capability for one decision: allow → true, deny+disable → code, deny+hide (or 404) → undefined. */
export function capOf(d: Verdict): CapValue | undefined {
  if (d.ok) return true;
  if (d.code === NO_ELIGIBLE_REVIEWER) return NO_ELIGIBLE_REVIEWER;
  // `NOT_FOUND`/`NOT_VISIBLE` and any unknown code fall through to hidden: fail closed.
  return isDenyCode(d.code) && DENY_UI[d.code].ui === 'disable' ? d.code : undefined;
}

/** Fold named decisions into a capability map (R03 §3.7); hidden actions get no key. */
export function buildCaps<K extends string>(results: Record<K, Verdict>): Caps<K> {
  const out: Caps<K> = {};
  for (const key of Object.keys(results) as K[]) {
    const cap = capOf(results[key]);
    if (cap !== undefined) out[key] = cap;
  }
  return out;
}

/** The tooltip for a disabled capability, in Indonesian. */
export function capMessage(code: Exclude<CapValue, true>): string {
  return code === NO_ELIGIBLE_REVIEWER ? PM_ERRORS[code].message : DENY_UI[code].message;
}

// Capabilities describe the control, not a particular submission, so the checks that need
// user input (a note, a reason, a cancel category, a reviewer) run with the smallest valid
// input. Otherwise an empty form would grey out every button for "REASON_REQUIRED".
const PROBE_TEXT = 'x'.repeat(REVIEW_NOTE_MIN_LENGTH);
const PROBE_CANCEL: CancelInput = { category: 'duplicate', note: '' };

/** Capabilities of a task for one principal; `pool` is the reviewer pool the service loaded once per project. */
export function taskCaps(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  pool: ReviewerPool,
  rules: AccessRules = ACCESS_RULES,
): TaskCaps {
  // An id outside the pool makes `canChangeReviewer` report NO_ELIGIBLE_REVIEWER when nobody can review.
  const reviewerProbe = reviewerCandidates(pool, task.assigneeId)[0] ?? '';
  const can = buildCaps<TaskCapKey>({
    update: canEditTask(p, task, m, rules),
    start: canStartTask(p, task, m, rules),
    unstart: canUnstartTask(p, task, m, rules),
    complete: canCompleteTask(p, task, m, rules),
    requestReview: canRequestReview(p, task, m, pool, rules),
    approve: canApproveTask(p, task, m, rules),
    return: canReturnTask(p, task, m, PROBE_TEXT, rules),
    reopen: canReopenTask(p, task, m, PROBE_TEXT, rules),
    cancel: canCancelTask(p, task, m, PROBE_CANCEL, rules),
    uncancel: canUncancelTask(p, task, m, rules),
    comment: canComment(p, task, m, rules),
    needsReviewOn: canToggleNeedsReview(p, task, m, true, rules),
    needsReviewOff: canToggleNeedsReview(p, task, m, false, rules),
    changeReviewer: canChangeReviewer(p, task, m, reviewerProbe, pool, rules),
    trash: canTrashTask(p, task, m, rules),
  });
  return { ...can, primary: primaryAction(p, task, m, pool, rules) };
}

/** Capabilities of a project for one principal. */
export function projectCaps(
  p: Principal,
  project: ProjectSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): ProjectCaps {
  return buildCaps<ProjectCapKey>({
    update: canManageProject(p, project, m, rules),
    trash: canTrashProject(p, project, m, rules),
    createTask: canCreateTask(p, project, m, rules),
    manageKinds: canManageKinds(p, project, m, rules),
  });
}

/** Capabilities of an event for one principal; `m` is their membership of the event's project, if any. */
export function eventCaps(
  p: Principal,
  event: EventSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): EventCaps {
  return buildCaps<EventCapKey>({
    update: canManageEvent(p, event, m, rules),
    cancel: canCancelEvent(p, event, m, rules),
    trash: canTrashEvent(p, event, m, rules),
    manageParticipants: canManageParticipants(p, event, m, rules),
    writeNote: canWriteNote(p, event, m, rules),
  });
}

/**
 * App-wide capabilities: `/dashboard` is for Admin and Super-admin, `/dev` for Super-admin only.
 * `createEvent` asks about a personal event, the one every signed-in user may make; whether a
 * *project* may be picked is decided per project by `canCreateEvent`.
 */
export function appCaps(p: Principal): AppCaps {
  return {
    createProject: canCreateProject(p).ok,
    createEvent: canCreateEvent(p, null, null).ok,
    dashboard: canManageUsers(p).ok,
    dev: canAccessDev(p.appRole),
  };
}
