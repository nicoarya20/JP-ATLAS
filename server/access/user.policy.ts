/**
 * Pure account-management policy (who may act on, re-role or invite which user).
 * No env/db/Bun imports: the same functions gate the API and the UI buttons.
 * Owned by the S0.b lane after S0A-03 merges; new deny codes go in `pm/errors` (additively).
 */
import { isAdminRole, normalizeRole, ROLES, type Role } from '../permissions';
import { allow, type Decision, deny } from './decision';
import type { Principal } from './types';

// Re-exported so existing importers keep working; the canonical definition is `./types`.
export type { Principal } from './types';

/** The user an account action is aimed at. */
export type UserTarget = { id: string; appRole: Role };

/** Roles an Admin may grant or invite; `admin` is super-admin only and `super-admin` is env-only. */
const ADMIN_GRANTABLE: readonly Role[] = [ROLES.MEMBER, ROLES.PROJECT_MANAGER];

const isSuperAdmin = (p: Principal) => normalizeRole(p.appRole) === ROLES.SUPER_ADMIN;

/** Whether `p` may open the user-management area at all (Admin or Super-admin). */
export function canManageUsers(p: Principal): Decision {
  return isAdminRole(p.appRole) ? allow() : deny('NOT_ADMIN');
}

/**
 * Whether `p` may suspend, approve, reject or delete `target`.
 * Check order matters for the error shown: impersonation first (it is blocked
 * regardless of role, Q9), then role, then self, then target protection.
 */
export function canActOnUser(p: Principal, target: UserTarget): Decision {
  if (p.impersonating) return deny('IMPERSONATING');
  if (!isAdminRole(p.appRole)) return deny('NOT_ADMIN');
  // Self before protection so a super-admin acting on themselves is told "self", not "protected".
  if (p.id === target.id) return deny('SELF_TARGET');
  const targetRole = normalizeRole(target.appRole);
  if (targetRole === ROLES.SUPER_ADMIN) return deny('TARGET_PROTECTED');
  // Admins are peers: only a super-admin may act on one.
  if (targetRole === ROLES.ADMIN && !isSuperAdmin(p)) return deny('TARGET_PROTECTED');
  return allow();
}

/**
 * Whether `p` may record or end somebody's leave (P14 D3). Deliberately not `canActOnUser`: every
 * target an Admin can see is fair game, because a super-admin and an Admin take leave too and an
 * Admin writing down their own is the ordinary case. Impersonation is still refused — the audit
 * entry would name the account being impersonated instead of the person who acted (Q9).
 */
export function canRecordUserLeave(p: Principal): Decision {
  if (p.impersonating) return deny('IMPERSONATING');
  return canManageUsers(p);
}

/**
 * Whether `p` may change `target`'s role to `next`. The target must be
 * actionable, then: Admin only moves Member↔PM, `admin` is granted by a
 * super-admin, and `super-admin` is never assignable (env only).
 */
export function canSetUserRole(p: Principal, target: UserTarget, next: Role): Decision {
  const onTarget = canActOnUser(p, target);
  if (!onTarget.ok) return onTarget;
  return canGrantRole(p, next);
}

/** Whether `p` may invite someone with `role`; same grant ceiling as role changes. */
export function canInviteWithRole(p: Principal, role: Role): Decision {
  if (!isAdminRole(p.appRole)) return deny('NOT_ADMIN');
  return canGrantRole(p, role);
}

function canGrantRole(p: Principal, role: Role): Decision {
  if (ADMIN_GRANTABLE.includes(role)) return allow();
  if (role === ROLES.ADMIN && isSuperAdmin(p)) return allow();
  // Covers `admin` for a plain Admin, `super-admin` for everyone, and unknown values (fail closed).
  return deny('TARGET_PROTECTED');
}
