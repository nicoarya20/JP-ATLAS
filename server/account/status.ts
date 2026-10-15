/** Pure account-hold rules shared by guards, the API gate and the API-key plugin. No DB, no request. */
import { type BanFields, isBanActive } from '../ban';
import type { ApprovalStatus } from '../pm/enums';

/** Why an account may not use the app: suspended (ban), awaiting approval, or turned down. */
export type HeldKind = 'banned' | 'pending' | 'rejected';

export type AccountStatusFields = BanFields & { approvalStatus?: ApprovalStatus | string | null };

/**
 * The reason an account is held, or null when it may proceed. An active ban wins
 * over approval status (suspension has its own page). Anything that is not
 * exactly 'approved' or 'rejected' — including a missing value — counts as
 * pending, so a row or session payload without the field fails closed.
 */
export function heldKindOf(u: AccountStatusFields, now = Date.now()): HeldKind | null {
  if (isBanActive(u, now)) return 'banned';
  if (u.approvalStatus === 'approved') return null;
  return u.approvalStatus === 'rejected' ? 'rejected' : 'pending';
}
