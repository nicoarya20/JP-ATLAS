/** Why an account cannot be deleted yet: active projects it alone manages (P9 A7); one aggregate query, no per-project loop. */
import { and, asc, eq, exists, isNull, ne, notInArray, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { project, projectMember } from '../db/schema';
import type { Executor } from '../pm/tx';

/** How many blocking projects the answer names; `total` still counts them all. */
export const DELETE_BLOCKERS_MAX = 20;

/** Projects that no longer need a manager: finished or called off. */
const CLOSED_STATUSES = ['completed', 'canceled'] as const;

export type DeleteBlocker = { id: string; name: string };
export type DeleteBlockers = { projects: DeleteBlocker[]; total: number };

/**
 * Live, unfinished projects where `userId` is a manager (project lead or `manager` member) and
 * nobody else is, so deleting the account would leave them without one. Trashed, completed and
 * canceled projects never block.
 */
export async function getDeleteBlockers(
  userId: string,
  exec: Executor = db,
): Promise<DeleteBlockers> {
  const managedByMe = exists(
    exec
      .select({ one: sql`1` })
      .from(projectMember)
      .where(
        and(
          eq(projectMember.projectId, project.id),
          eq(projectMember.userId, userId),
          eq(projectMember.role, 'manager'),
        ),
      ),
  );
  const managedByAnother = exists(
    exec
      .select({ one: sql`1` })
      .from(projectMember)
      .where(
        and(
          eq(projectMember.projectId, project.id),
          eq(projectMember.role, 'manager'),
          ne(projectMember.userId, userId),
        ),
      ),
  );
  const rows = await exec
    .select({ id: project.id, name: project.name, total: sql<number>`count(*) OVER ()::int` })
    .from(project)
    .where(
      and(
        isNull(project.deletedAt),
        notInArray(project.status, [...CLOSED_STATUSES]),
        or(eq(project.leadId, userId), managedByMe),
        // A lead other than me still counts as a manager even if the member row is missing.
        or(isNull(project.leadId), eq(project.leadId, userId)),
        sql`NOT ${managedByAnother}`,
      ),
    )
    .orderBy(asc(project.name), asc(project.id))
    .limit(DELETE_BLOCKERS_MAX);
  return {
    projects: rows.map(({ id, name }) => ({ id, name })),
    total: rows[0]?.total ?? 0,
  };
}
