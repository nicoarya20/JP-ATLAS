/**
 * Reads of project membership and the reviewer pool (S0B-10). The only place that turns
 * `project_member` rows into the shapes `server/access/*` consumes; `access/` stays pure (X3 M4).
 */
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import type { ManagerInfo, ReviewerPool } from '../access/review.policy';
import type { Membership, Principal } from '../access/types';
import { db } from '../db';
import { projectMember, user } from '../db/schema';
import { normalizeRole, ROLES, type Role } from '../permissions';
import type { Executor } from '../pm/tx';

/**
 * Structural actor: `guard.Actor` satisfies it without this file importing `guard.ts` (import cycle).
 * `impersonatedBy` is optional so a bare `{ user, role }` still works; `resolveActor` already sets it.
 */
export type PrincipalSource = {
  user: { id: string };
  role: Role;
  impersonatedBy?: string | null;
};

/** Maps an authenticated actor to the policy's `Principal`; a set `impersonatedBy` marks Q9 impersonation. */
export function toPrincipal(actor: PrincipalSource): Principal {
  return {
    id: actor.user.id,
    // Legacy 'user' (or any unknown value) reads as member; the policy never sees a raw DB string.
    appRole: normalizeRole(actor.role),
    impersonating: Boolean(actor.impersonatedBy),
  };
}

/**
 * Loads the user's membership for many projects with one query, keyed by project id.
 * Non-members are absent from the Map. Trashed projects are NOT filtered out: the policies
 * decide `PROJECT_IN_TRASH` themselves and a manager must still be recognised to restore one (R03 §2.2).
 */
export async function loadMembership(
  userId: string,
  projectIds: readonly string[],
  exec: Executor = db,
): Promise<Map<string, Membership>> {
  const found = new Map<string, Membership>();
  // `IN ()` is invalid SQL; an empty page needs no round trip anyway.
  if (projectIds.length === 0) return found;
  const rows = await exec
    .select({
      projectId: projectMember.projectId,
      role: projectMember.role,
      joinedAt: projectMember.createdAt,
    })
    .from(projectMember)
    .where(
      and(
        eq(projectMember.userId, userId),
        inArray(projectMember.projectId, [...new Set(projectIds)]),
      ),
    );
  // M2: `project_member` has no joined_at column; `created_at` is the join date.
  for (const r of rows) found.set(r.projectId, { role: r.role, joinedAt: r.joinedAt });
  return found;
}

// Same rule as `isBanActive` (server/ban.ts), evaluated by the DB. `ban_expires` is a plain `timestamp`
// and the session zone is UTC (X1 D7), so `now()` is shifted before comparing; an expired ban does not hold.
const accountActive = sql<boolean>`(
  ${user.approvalStatus} = 'approved'
  AND NOT (
    coalesce(${user.banned}, false)
    AND (${user.banExpires} IS NULL OR ${user.banExpires} > (now() AT TIME ZONE 'UTC'))
  )
)`;

/**
 * Loads who may review tasks of a project with one query: its managers (each flagged `active`
 * when approved and not banned) plus every approved, unbanned Admin/Super-admin. Inactive managers
 * stay in the list because `pickReviewer` and the capability checks filter on `active` themselves.
 */
export async function loadReviewerPool(
  projectId: string,
  exec: Executor = db,
): Promise<ReviewerPool> {
  const rows = await exec
    .select({
      userId: user.id,
      appRole: user.role,
      memberRole: projectMember.role,
      joinedAt: projectMember.createdAt,
      active: accountActive,
    })
    .from(user)
    .leftJoin(
      projectMember,
      and(eq(projectMember.userId, user.id), eq(projectMember.projectId, projectId)),
    )
    .where(
      or(
        eq(projectMember.role, 'manager'),
        and(inArray(user.role, [ROLES.ADMIN, ROLES.SUPER_ADMIN]), accountActive),
      ),
    )
    // Stable output order so callers and tests do not depend on heap order.
    .orderBy(user.id);

  const managers: ManagerInfo[] = [];
  const adminIds: string[] = [];
  for (const r of rows) {
    if (r.memberRole === 'manager' && r.joinedAt) {
      managers.push({ userId: r.userId, joinedAt: r.joinedAt, active: r.active });
    }
    // An Admin who also manages the project appears in both lists; `reviewerCandidates` de-duplicates.
    if (r.active && (r.appRole === ROLES.ADMIN || r.appRole === ROLES.SUPER_ADMIN)) {
      adminIds.push(r.userId);
    }
  }
  return { managers, adminIds };
}
