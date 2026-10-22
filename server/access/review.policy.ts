/**
 * Pure review policy: who reviews a task, and who may request, approve, return or
 * re-assign a review (R03 §3.4, K2/K3, Q6). Logic only: the `task_review` table and
 * the review UI arrive in S4, so nothing here reads storage or runtime globals.
 */
import { allow, type Decision, deny } from './decision';
import { atLeast, levelOf } from './level';
import { ACCESS_RULES, type AccessRules } from './rules';
import type { Membership, Principal, TaskSubject } from './types';

/** Shortest and longest return note, matching the "3–200 karakter" hint in `DENY_UI.REASON_REQUIRED`. */
export const REVIEW_NOTE_MIN_LENGTH = 3;
export const REVIEW_NOTE_MAX_LENGTH = 200;

/** A project manager as the reviewer picker sees them; `active` = approved and not banned. */
export type ManagerInfo = { userId: string; joinedAt: Date; active: boolean };

/** Reviewer candidates loaded by the service in one query: project managers plus active Admin/Super-admin ids. */
export type ReviewerPool = { managers: readonly ManagerInfo[]; adminIds: readonly string[] };

/** The reviewer chosen for a task; `admin-pool` stores no reviewer id and prompts for a second manager. */
export type ReviewerPick =
  | { kind: 'user'; userId: string; via: 'creator' | 'lead' | 'manager' }
  | { kind: 'admin-pool'; suggestSecondManager: true };

/** Inputs of `pickReviewer`; creator and Lead are nullable because their FKs are ON DELETE SET NULL. */
export type PickReviewerInput = {
  creatorId: string | null;
  assigneeId: string | null;
  leadId: string | null;
  managers: readonly ManagerInfo[];
};

// `NO_ELIGIBLE_REVIEWER` lives in the API catalog (`PmApiCode`, HTTP 409), not in `DENY_CODES`,
// so it cannot go through `deny()`; this type keeps it out of the shared `Decision` union.
/** Denial for a review that nobody but the assignee could decide (K3). */
export type NoEligibleReviewer = { ok: false; code: 'NO_ELIGIBLE_REVIEWER' };

/** A `Decision` that may also carry `NO_ELIGIBLE_REVIEWER`. */
export type ReviewDecision = Decision | NoEligibleReviewer;

const NO_ELIGIBLE: NoEligibleReviewer = { ok: false, code: 'NO_ELIGIBLE_REVIEWER' };

const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Pick the default reviewer: creator (if an active manager) → Lead → longest-serving other
 * manager → Admin pool. The assignee is never picked (CHECK in DB, K2); ties on join date
 * fall to the smallest id so the result is deterministic.
 */
export function pickReviewer(i: PickReviewerInput): ReviewerPick {
  const eligible = i.managers.filter((m) => m.active && m.userId !== i.assigneeId);
  const has = (id: string) => eligible.some((m) => m.userId === id);
  if (i.creatorId && has(i.creatorId)) return { kind: 'user', userId: i.creatorId, via: 'creator' };
  if (i.leadId && has(i.leadId)) return { kind: 'user', userId: i.leadId, via: 'lead' };
  const oldest = [...eligible].sort(
    (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || compareIds(a.userId, b.userId),
  )[0];
  return oldest
    ? { kind: 'user', userId: oldest.userId, via: 'manager' }
    : { kind: 'admin-pool', suggestSecondManager: true };
}

/** Ids allowed to review a task: active managers and Admin/SA ids, minus the assignee (K2). */
export function reviewerCandidates(pool: ReviewerPool, assigneeId: string | null): string[] {
  const ids = new Set<string>();
  for (const m of pool.managers) if (m.active) ids.add(m.userId);
  for (const id of pool.adminIds) ids.add(id);
  if (assigneeId) ids.delete(assigneeId);
  return [...ids];
}

// A task in the Trash is frozen like its project: only restore is allowed (R03 §2.2).
function taskOpen(task: TaskSubject): Decision {
  if (task.projectDeletedAt) return deny('PROJECT_IN_TRASH');
  if (task.deletedAt) return deny('WRONG_STATE');
  return allow();
}

// Order matters for the message shown: role, then trash, then status, then self-review.
// A non-member gets NOT_MEMBER; visibility (404) is decided before this by the task view check.
function decideReview(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  rules: AccessRules,
): Decision {
  const level = levelOf(p, m, rules);
  if (!atLeast(level, 'manager')) return deny(level === 'none' ? 'NOT_MEMBER' : 'NOT_MANAGER');
  const open = taskOpen(task);
  if (!open.ok) return open;
  if (task.status !== 'in_review') return deny('WRONG_STATE');
  // Applies to Admin and Super-admin too: a second pair of eyes is the point of review (Q6).
  if (task.assigneeId === p.id) return deny('SELF_REVIEW');
  return allow();
}

/**
 * Whether `p` may send `task` to review. The actor is an Admin/manager, or the assignee
 * for a Member; the task must be in progress with review on, and someone other than the
 * assignee must be able to decide it, otherwise the task would hang in review (K3).
 */
export function canRequestReview(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  pool: ReviewerPool,
  rules: AccessRules = ACCESS_RULES,
): ReviewDecision {
  const level = levelOf(p, m, rules);
  if (!atLeast(level, 'member')) return deny('NOT_MEMBER');
  if (level === 'member' && task.assigneeId !== p.id) return deny('NOT_OWNER');
  const open = taskOpen(task);
  if (!open.ok) return open;
  if (task.status !== 'in_progress' || !task.needsReview) return deny('WRONG_STATE');
  return reviewerCandidates(pool, task.assigneeId).length > 0 ? allow() : NO_ELIGIBLE;
}

/** Whether `p` may approve `task`: an Admin or manager other than the assignee, while it is in review. */
export function canApproveTask(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): Decision {
  return decideReview(p, task, m, rules);
}

/** Whether `p` may return `task` to work; same rules as approving plus a 3–200 character note. */
export function canReturnTask(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  note: string,
  rules: AccessRules = ACCESS_RULES,
): Decision {
  const base = decideReview(p, task, m, rules);
  if (!base.ok) return base;
  // Code points, not UTF-16 units, so an emoji counts as one character in the UI counter.
  const length = [...note.trim()].length;
  if (length < REVIEW_NOTE_MIN_LENGTH || length > REVIEW_NOTE_MAX_LENGTH)
    return deny('REASON_REQUIRED');
  return allow();
}

/**
 * Whether `p` may set `nextReviewerId` as the reviewer. Admin/manager, or the task's
 * creator (K8); the choice must be a candidate other than the assignee (mirrors the DB CHECK).
 */
export function canChangeReviewer(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  nextReviewerId: string,
  pool: ReviewerPool,
  rules: AccessRules = ACCESS_RULES,
): ReviewDecision {
  const level = levelOf(p, m, rules);
  if (!atLeast(level, 'member')) return deny('NOT_MEMBER');
  if (level === 'member' && task.createdBy !== p.id) return deny('NOT_OWNER');
  const open = taskOpen(task);
  if (!open.ok) return open;
  // Swapping the reviewer mid-review is allowed (the new reviewer gets the card); done/canceled are final.
  if (task.status === 'done' || task.status === 'canceled') return deny('LOCKED_BY_STATUS');
  if (nextReviewerId === task.assigneeId) return deny('SELF_REVIEW');
  return reviewerCandidates(pool, task.assigneeId).includes(nextReviewerId) ? allow() : NO_ELIGIBLE;
}
