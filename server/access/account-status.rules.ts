/**
 * Pure rules for moving an account between approval statuses. No env/db/Bun
 * imports (the browser uses it to decide which buttons to show).
 * Owned by the S0.b lane after S0A-03 merges; new deny codes go in `pm/errors` (additively).
 */
import type { ApprovalStatus } from '../pm/enums';
import { allow, type Decision, deny } from './decision';
import type { Principal } from './types';
import { canActOnUser, type UserTarget } from './user.policy';

// Single source of the status tuple lives with the other shared enums; re-exported for rule consumers.
export { APPROVAL_STATUSES, type ApprovalStatus } from '../pm/enums';

/** Rejection reason bounds, counted in characters after trimming (shown to the rejected user). */
export const REJECT_REASON_MIN = 3;
export const REJECT_REASON_MAX = 200;

/**
 * The only legal moves. `approved → rejected` is deliberately absent: an
 * approved account is taken away with suspend (ban), not with a rejection.
 */
export const ACCOUNT_TRANSITIONS: readonly (readonly [ApprovalStatus, ApprovalStatus])[] = [
  ['pending', 'approved'],
  ['pending', 'rejected'],
  ['rejected', 'approved'],
];

export type AccountTransitionInput = {
  actor: Principal;
  target: UserTarget;
  /** Required (3-200 characters) only when moving to `rejected`. */
  reason?: string | null;
};

/** Whether `reason` is a usable rejection reason (3-200 characters once trimmed). */
export function isValidRejectReason(reason: string | null | undefined): boolean {
  if (typeof reason !== 'string') return false;
  const length = Array.from(reason.trim()).length;
  return length >= REJECT_REASON_MIN && length <= REJECT_REASON_MAX;
}

/**
 * Whether `actor` may move `target` from `from` to `to`. Order: who may act
 * (shared with the other account actions), then the transition itself, then
 * the reason; so a stale button reports `WRONG_STATE` rather than a reason error.
 */
export function canTransitionAccount(
  from: ApprovalStatus,
  to: ApprovalStatus,
  i: AccountTransitionInput,
): Decision {
  const onTarget = canActOnUser(i.actor, i.target);
  if (!onTarget.ok) return onTarget;
  if (!ACCOUNT_TRANSITIONS.some(([f, t]) => f === from && t === to)) return deny('WRONG_STATE');
  if (to === 'rejected' && !isValidRejectReason(i.reason)) return deny('REASON_REQUIRED');
  return allow();
}
