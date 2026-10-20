/**
 * The three counters of the Beranda over the projects the viewer manages (`project_member.role =
 * 'manager'`), in one statement. Counts use the same definitions as the Tugas menu: live tasks in live
 * projects, "aktif" = `ACTIVE_STATUSES`. A viewer who manages nothing gets zeros plus the two project
 * counts, so the card can say why instead of showing a bare 0.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { db } from '../db';
import { project, projectMember, task } from '../db/schema';
import { ACTIVE_STATUSES } from '../metrics/task.metrics';
import type { Executor } from '../pm/tx';
import { liveTask } from '../task/task.sql';
import type { HomeCounters } from './home.dto';

const active = sql.join(
  ACTIVE_STATUSES.map((s) => sql`${s}`),
  sql`, `,
);

/** Live projects the user belongs to, optionally only as manager; uncorrelated, so it is evaluated once. */
const projectCount = (userId: string, managerOnly: boolean) => sql<number>`(
  SELECT count(*)::int FROM "project_member" pm
  INNER JOIN "project" pr ON pr."id" = pm."project_id"
  WHERE pm."user_id" = ${userId} AND pr."deleted_at" IS NULL
  ${managerOnly ? sql`AND pm."role" = 'manager'` : sql``})`;

export async function getCounters(p: Principal, exec: Executor = db): Promise<HomeCounters> {
  const managed = exec
    .select({ id: projectMember.projectId })
    .from(projectMember)
    .where(and(eq(projectMember.userId, p.id), eq(projectMember.role, 'manager')));
  const [row] = await exec
    .select({
      unassigned: sql<number>`count(*) FILTER (WHERE ${task.assigneeId} IS NULL AND ${task.status} IN (${active}))::int`,
      inProgress: sql<number>`count(*) FILTER (WHERE ${task.status} = 'in_progress')::int`,
      completed: sql<number>`count(*) FILTER (WHERE ${task.status} = 'done')::int`,
      managedProjects: projectCount(p.id, true),
      memberProjects: projectCount(p.id, false),
    })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .where(and(liveTask, inArray(task.projectId, managed)));
  return {
    unassigned: row?.unassigned ?? 0,
    inProgress: row?.inProgress ?? 0,
    completed: row?.completed ?? 0,
    managedProjects: row?.managedProjects ?? 0,
    memberProjects: row?.memberProjects ?? 0,
  };
}
