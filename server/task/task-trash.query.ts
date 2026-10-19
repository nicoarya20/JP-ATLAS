/**
 * Read side of the task Trash (S6 D1): which trashed tasks the caller may see and how one Trash row
 * looks. A task that went with its project (`deleted_with_project_id`) is not a row of its own: the
 * project row stands for it. A task trashed before its project stays a row, flagged `blockedBy` while
 * the project is in the Trash. The page query (`server/trash/trash.list.query.ts`) picks the ids; this
 * file turns them into rows in two statements plus the caller's memberships, whatever the page size.
 */
import { and, eq, inArray, isNotNull, isNull, or, type SQL } from 'drizzle-orm';
import { buildCaps } from '../access/capabilities';
import {
  canPurge,
  canRestoreTask,
  type TrashItemCaps,
  trashListScope,
} from '../access/trash.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { project, projectMember, task, user } from '../db/schema';
import { METRICS } from '../metrics/config';
import { isoDateIn } from '../metrics/dates';
import { lastRestorableDate } from '../metrics/trash.metrics';
import type { IsoDate, MetricsConfig } from '../metrics/types';
import type { Executor } from '../pm/tx';
import { loadMembership } from '../project/membership.query';

/** One trashed task as the Trash page shows it; dates are decided by the server. */
export type TrashTaskItem = {
  kind: 'task';
  id: string;
  /** Global task number: stays the same after a restore. */
  number: number;
  title: string;
  project: { id: string; name: string };
  /** Set while the task's project is in the Trash: the task only comes back after the project does. */
  blockedBy: { projectId: string; name: string } | null;
  /** ISO instant of the delete. */
  deletedAt: string;
  /** Id and name only (Q8); null when the deleting account no longer exists. */
  deletedBy: { id: string; name: string } | null;
  /** Last calendar day (team zone) the task may still be restored. */
  restorableUntil: IsoDate;
  can: TrashItemCaps;
};

/** SQL twin of the task part of `trashListScope`: deleted by the caller, or in a project they manage. */
export function trashTaskWhere(p: Principal, exec: Executor): SQL {
  const own = and(isNotNull(task.deletedAt), isNull(task.deletedWithProjectId)) as SQL;
  const scope = trashListScope(p);
  if (scope.kind === 'all') return own;
  const managed = exec
    .select({ id: projectMember.projectId })
    .from(projectMember)
    .where(and(eq(projectMember.userId, scope.userId), eq(projectMember.role, 'manager')));
  return and(own, or(eq(task.deletedBy, scope.userId), inArray(task.projectId, managed))) as SQL;
}

/** The Trash rows of these task ids (already scoped by the caller's page query), keyed by id. */
export async function hydrateTrashTasks(
  p: Principal,
  ids: readonly string[],
  now: Date,
  metrics: MetricsConfig = METRICS,
  exec: Executor = db,
): Promise<Map<string, TrashTaskItem>> {
  const out = new Map<string, TrashTaskItem>();
  if (ids.length === 0) return out;
  const rows = await exec
    .select({
      id: task.id,
      number: task.number,
      title: task.title,
      status: task.status,
      createdBy: task.createdBy,
      assigneeId: task.assigneeId,
      reviewerId: task.reviewerId,
      needsReview: task.needsReview,
      deletedAt: task.deletedAt,
      deletedBy: task.deletedBy,
      deletedByName: user.name,
      projectId: project.id,
      projectName: project.name,
      projectDeletedAt: project.deletedAt,
    })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .leftJoin(user, eq(user.id, task.deletedBy))
    .where(and(inArray(task.id, [...ids]), isNotNull(task.deletedAt)));
  const memberships = await loadMembership(
    p.id,
    rows.map((r) => r.projectId),
    exec,
  );
  for (const r of rows) {
    // The `where` above already excludes live rows; the guard only narrows the type.
    if (!r.deletedAt) continue;
    const m = memberships.get(r.projectId) ?? null;
    out.set(r.id, {
      kind: 'task',
      id: r.id,
      number: r.number,
      title: r.title,
      project: { id: r.projectId, name: r.projectName },
      blockedBy: r.projectDeletedAt ? { projectId: r.projectId, name: r.projectName } : null,
      deletedAt: r.deletedAt.toISOString(),
      deletedBy: r.deletedBy && r.deletedByName ? { id: r.deletedBy, name: r.deletedByName } : null,
      restorableUntil: lastRestorableDate(isoDateIn(r.deletedAt, metrics.TIME_ZONE), metrics),
      can: buildCaps({
        restore: canRestoreTask(p, r, m, now, undefined, metrics),
        purge: canPurge(p),
      }),
    });
  }
  return out;
}
