/**
 * One ordered access level per (principal, project): every project permission is a
 * comparison on it, so `appRole` branching stays in this file (K1/K6).
 */
import { isAdminRole, ROLES } from '../permissions';
import { ACCESS_RULES, type AccessRules } from './rules';
import type { Membership, Principal } from './types';

/** Strongest first; `reader` is a non-member Project Manager with read-only access. */
export const LEVELS = ['admin', 'manager', 'member', 'viewer', 'reader', 'none'] as const;
export type Level = (typeof LEVELS)[number];

/** Rank where bigger means more access, for monotonic comparisons. */
export const LEVEL_RANK: Readonly<Record<Level, number>> = Object.freeze({
  admin: 5,
  manager: 4,
  member: 3,
  viewer: 2,
  reader: 1,
  none: 0,
});

/** The principal's level on one project; an Admin wins over any project role (K6). */
export function levelOf(p: Principal, m: Membership, rules: AccessRules = ACCESS_RULES): Level {
  if (isAdminRole(p.appRole)) return 'admin';
  if (m) return m.role; // 'manager' | 'member' | 'viewer' are also Level names
  // Impersonation changes what a super-admin may *do*, not what they may see (Q9), so it is ignored here.
  return p.appRole === ROLES.PROJECT_MANAGER && rules.P_A1_PM_NON_MEMBER_READS ? 'reader' : 'none';
}

/** Whether `level` is at least `min`. */
export function atLeast(level: Level, min: Level): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[min];
}
