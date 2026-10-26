/**
 * What the signed-in actor may do to one account, derived from the same pure policy the
 * API enforces (`access/user.policy`), so the UI never offers a button that is certain to 403.
 */
import { canTransitionAccount } from '@server/access/account-status.rules';
import { DENY_UI } from '@server/access/decision';
import {
  canActOnUser,
  canRecordUserLeave,
  canSetUserRole,
  type Principal,
} from '@server/access/user.policy';
import { canImpersonate, normalizeRole, ROLES, type Role } from '@server/permissions';
import type { AdminUser } from '~/lib/admin-users-api';

export type UserPermissions = {
  actorRole: string;
  currentUserId: string;
  /** True while a super-admin acts as someone else; every policy then refuses account changes. */
  impersonating: boolean;
};

/** Roles an Admin or Super-admin can ever hand out here; `super-admin` comes from env only. */
export const ASSIGNABLE_ROLES: readonly Role[] = [ROLES.MEMBER, ROLES.PROJECT_MANAGER, ROLES.ADMIN];

export type UserAccess = {
  isSelf: boolean;
  /** Roles the account can be switched to (its current role excluded). */
  roles: Role[];
  /** Roles selectable when approving (the current role included). */
  approveRoles: Role[];
  approve: boolean;
  reject: boolean;
  ban: boolean;
  impersonate: boolean;
  remove: boolean;
  /**
   * Whether the actor may record this person's leave. Unlike the actions above it does not depend on
   * the target: an Admin, a Super-admin and the actor themselves may all be recorded as away (P14
   * D3), so a protected account is still offered "Setel cuti". Impersonation is the only refusal.
   */
  leave: boolean;
  /** Why the account cannot be changed at all, or null when the policy lets the actor act. */
  blockedReason: string | null;
};

/** The actor as the policy sees them. */
export function principalOf(p: UserPermissions): Principal {
  return {
    id: p.currentUserId,
    appRole: normalizeRole(p.actorRole),
    impersonating: p.impersonating,
  };
}

/** Message for a denied account action, worded for the person looking at the screen. */
function blockedMessage(code: keyof typeof DENY_UI, targetRole: Role, actorRole: Role): string {
  if (code === 'TARGET_PROTECTED' && targetRole === ROLES.SUPER_ADMIN)
    return 'Super-admin dikelola lewat SUPER_ADMIN_EMAILS di env dan tidak bisa diubah di sini.';
  if (code === 'TARGET_PROTECTED' && targetRole === ROLES.ADMIN && actorRole === ROLES.ADMIN)
    return 'Hanya super-admin yang dapat mengubah Admin.';
  return DENY_UI[code].message;
}

/** Which actions `p` may take on `user`. */
export function userAccess(user: AdminUser, p: UserPermissions): UserAccess {
  const principal = principalOf(p);
  const target = { id: user.id, appRole: normalizeRole(user.role) };
  const onTarget = canActOnUser(principal, target);
  const canAct = onTarget.ok;
  const approveRoles = canAct
    ? ASSIGNABLE_ROLES.filter((r) => canSetUserRole(principal, target, r).ok)
    : [];
  // Rejecting needs a reason the dialog collects later, so a missing reason is not a denial here.
  const rejectDecision = canTransitionAccount(user.approvalStatus, 'rejected', {
    actor: principal,
    target,
  });
  return {
    isSelf: user.id === p.currentUserId,
    roles: approveRoles.filter((r) => r !== target.appRole),
    approveRoles,
    approve: canTransitionAccount(user.approvalStatus, 'approved', { actor: principal, target }).ok,
    reject: rejectDecision.ok || (!rejectDecision.ok && rejectDecision.code === 'REASON_REQUIRED'),
    ban: canAct,
    impersonate: canAct && !p.impersonating && canImpersonate(p.actorRole),
    // The API only lets a super-admin delete accounts (NOT_APP_ROLE for an Admin).
    remove: canAct && principal.appRole === ROLES.SUPER_ADMIN,
    leave: canRecordUserLeave(principal).ok,
    blockedReason: onTarget.ok
      ? null
      : blockedMessage(onTarget.code, target.appRole, principal.appRole),
  };
}

/**
 * True when at least one *account* action is open. Leave is deliberately not counted: it is open
 * for every target, so counting it would hide the reason an account cannot be changed.
 */
export function hasAnyAction(a: UserAccess): boolean {
  return a.roles.length > 0 || a.approve || a.reject || a.ban || a.impersonate || a.remove;
}
