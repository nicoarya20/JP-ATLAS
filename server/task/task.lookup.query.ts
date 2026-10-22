/**
 * Batched lookups the task reads need once per page rather than once per row (S2-02): people's
 * display names and the reviewer pool of every project on the page, so query count stays constant.
 */
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import type { ManagerInfo, ReviewerPool } from '../access/review.policy';
import { db } from '../db';
import { profile, projectMember, user } from '../db/schema';
import { ROLES } from '../permissions';
import type { Executor } from '../pm/tx';
import { displayNameSql } from '../profile/profile.name';

/** A person as a task shows them: id and name only, never email or phone (Q8). */
export type PersonRef = { id: string; name: string };

/** Display names for `ids` in one query; the profile name wins over the sign-in name when it is filled in. */
export async function loadPeople(
  ids: readonly (string | null)[],
  exec: Executor = db,
): Promise<Map<string, PersonRef>> {
  const wanted = [...new Set(ids.filter((id): id is string => id !== null))];
  const found = new Map<string, PersonRef>();
  if (wanted.length === 0) return found;
  const rows = await exec
    .select({
      id: user.id,
      name: displayNameSql,
    })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(inArray(user.id, wanted));
  for (const r of rows) found.set(r.id, r);
  return found;
}

// Same rule as `accountActive` in project/membership.query.ts (approved and not under an active ban);
// repeated because that constant is private to a file this slice does not own. The pool parity test
// compares both loaders so a change to one without the other fails.
const accountActive = sql<boolean>`(
  ${user.approvalStatus} = 'approved'
  AND NOT (
    coalesce(${user.banned}, false)
    AND (${user.banExpires} IS NULL OR ${user.banExpires} > (now() AT TIME ZONE 'UTC'))
  )
)`;

/**
 * The reviewer pool of many projects with one query: each project's managers plus the active
 * Admin/Super-admin ids (the same for every project). Same shape as `loadReviewerPool` per project.
 */
export async function loadReviewerPools(
  projectIds: readonly string[],
  exec: Executor = db,
): Promise<Map<string, ReviewerPool>> {
  const ids = [...new Set(projectIds)];
  const pools = new Map<string, ReviewerPool>();
  if (ids.length === 0) return pools;
  const rows = await exec
    .select({
      projectId: projectMember.projectId,
      userId: user.id,
      appRole: user.role,
      memberRole: projectMember.role,
      joinedAt: projectMember.createdAt,
      active: accountActive,
    })
    .from(user)
    .leftJoin(
      projectMember,
      and(eq(projectMember.userId, user.id), inArray(projectMember.projectId, ids)),
    )
    .where(
      or(
        eq(projectMember.role, 'manager'),
        and(inArray(user.role, [ROLES.ADMIN, ROLES.SUPER_ADMIN]), accountActive),
      ),
    )
    .orderBy(user.id);

  const managers = new Map<string, ManagerInfo[]>();
  const adminIds = new Set<string>();
  for (const r of rows) {
    if (r.memberRole === 'manager' && r.projectId && r.joinedAt) {
      const list = managers.get(r.projectId) ?? [];
      list.push({ userId: r.userId, joinedAt: r.joinedAt, active: r.active });
      managers.set(r.projectId, list);
    }
    if (r.active && (r.appRole === ROLES.ADMIN || r.appRole === ROLES.SUPER_ADMIN)) {
      adminIds.add(r.userId);
    }
  }
  for (const id of ids)
    pools.set(id, { managers: managers.get(id) ?? [], adminIds: [...adminIds] });
  return pools;
}
