import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';

/**
 * Role model for this app. `super-admin` is controlled exclusively by the
 * SUPER_ADMIN_EMAILS env and a verified email (see reconcileRole); `admin` is
 * granted by a super-admin through the /dev UI; `member` is the default and
 * `project_manager` is a member who may also run projects.
 */
export const ROLES = {
  MEMBER: 'member',
  PROJECT_MANAGER: 'project_manager',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Roles a super-admin may assign via the UI. super-admin is env-only. */
export const ASSIGNABLE_ROLES: Role[] = [ROLES.MEMBER, ROLES.PROJECT_MANAGER, ROLES.ADMIN];

function isRole(value: unknown): value is Role {
  return (
    value === ROLES.MEMBER ||
    value === ROLES.PROJECT_MANAGER ||
    value === ROLES.ADMIN ||
    value === ROLES.SUPER_ADMIN
  );
}

/**
 * Coerce a stored role (possibly null/legacy) to a known Role, defaulting to
 * member. The legacy `'user'` value is only ever read, never written, so old
 * rows keep working regardless of deploy/migration order.
 */
export function normalizeRole(role: unknown): Role {
  return isRole(role) ? role : ROLES.MEMBER;
}

export function isAdminRole(role: unknown): boolean {
  const r = normalizeRole(role);
  return r === ROLES.ADMIN || r === ROLES.SUPER_ADMIN;
}

/** /dev access: super-admin only (the /dev layout already requires it). */
export function canAccessDev(role: unknown): boolean {
  return normalizeRole(role) === ROLES.SUPER_ADMIN;
}

/**
 * Single source of truth for each role's home area. Strict isolation: a role
 * may only see its own area, so cross-area guards redirect here.
 *   member/project_manager -> /app, admin -> /dashboard, super-admin -> /dev
 */
export function homeFor(role: unknown): string {
  const r = normalizeRole(role);
  if (r === ROLES.SUPER_ADMIN) return '/dev';
  if (r === ROLES.ADMIN) return '/dashboard';
  return '/app';
}

export function isSuperAdminEmail(email: string, superAdminEmails: ReadonlySet<string>): boolean {
  return superAdminEmails.has(email.trim().toLowerCase());
}

/**
 * Desired role given env membership, email verification and the stored role.
 * env is the single source of truth for super-admin, but only for a verified
 * email: an unverified sign-up must not be able to claim a super-admin address.
 *  - email in env and verified   -> super-admin
 *  - was super-admin but no longer qualifies (email gone/unverified) -> demote to member
 *  - otherwise                   -> keep stored role (member/project_manager/admin via UI)
 */
export function reconcileRole(
  email: string,
  currentRole: unknown,
  superAdminEmails: ReadonlySet<string>,
  emailVerified: boolean,
): Role {
  if (emailVerified === true && isSuperAdminEmail(email, superAdminEmails)) {
    return ROLES.SUPER_ADMIN;
  }
  const current = normalizeRole(currentRole);
  if (current === ROLES.SUPER_ADMIN) return ROLES.MEMBER;
  return current;
}

/** Only super-admin may change roles. */
export function canSetRole(actorRole: unknown): boolean {
  return normalizeRole(actorRole) === ROLES.SUPER_ADMIN;
}

/** super-admin acts on anyone; admin acts only on non-admin (regular) users. */
export function canActOnTarget(actorRole: unknown, targetRole: unknown): boolean {
  const actor = normalizeRole(actorRole);
  if (actor === ROLES.SUPER_ADMIN) return true;
  if (actor === ROLES.ADMIN) return !isAdminRole(targetRole);
  return false;
}

/** Only super-admin may impersonate. */
export function canImpersonate(actorRole: unknown): boolean {
  return normalizeRole(actorRole) === ROLES.SUPER_ADMIN;
}

export function isAssignableRole(role: unknown): role is Role {
  return isRole(role) && ASSIGNABLE_ROLES.includes(role);
}

// --- Better Auth access control ------------------------------------------
// Statement mirrors Better Auth's admin defaults so role permissions line up
// with the plugin's own endpoint guards.
const statement = { ...defaultStatements } as const;

export const ac = createAccessControl(statement);

export const roles = {
  [ROLES.MEMBER]: ac.newRole({}),
  [ROLES.PROJECT_MANAGER]: ac.newRole({}),
  [ROLES.ADMIN]: ac.newRole({ user: ['list', 'ban'], session: ['list'] }),
  [ROLES.SUPER_ADMIN]: ac.newRole({
    ...adminAc.statements,
    user: [...adminAc.statements.user, 'impersonate-admins'],
  }),
};
