/**
 * What `/api/admin/users*` sends (`server/api/admin-users.query.ts` `listAdminUsers`, `adminUserStats`; map
 * `phase2-map-profile-archive.md` §5, GAP U-1). Only the fields the Users screen reads are named here.
 */
import type { AccountRoleWire } from './team.api';

/** One account in the admin directory. `role` may still be null or the legacy `'user'`: both read as member. */
export type AdminUserWire = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
  banned: boolean | null;
  /** `approved` | `pending` | `rejected`. */
  approvalStatus: string | null;
  /** Instant the account was made: when the sign-up asked to join. */
  createdAt: string;
};

export type AdminUsersPageWire = {
  users: AdminUserWire[];
  total: number;
  page: number;
  limit: number;
};

export type AdminUserStatsWire = {
  total: number;
  admins: number;
  superAdmins: number;
  banned: number;
  pending: number;
  verified: number;
  new7d: number;
  active24h: number;
};

/** The roles an Admin may give (`ADMIN_GRANTABLE`, `server/access/user.policy.ts`); a Super-admin may also give Admin. */
export const GRANTABLE: readonly AccountRoleWire[] = ['member', 'project_manager'];

/** A role as the server stores it, read the way `normalizeRole` does: unknown, null and `'user'` are member. */
export function roleOf(role: string | null): AccountRoleWire {
  return role === 'project_manager' || role === 'admin' || role === 'super-admin' ? role : 'member';
}
