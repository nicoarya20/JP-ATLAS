/**
 * Facts behind two of the Ask Data answers, one statement each, over the tasks of my projects:
 * the task that has been overdue longest and the people carrying the most open tasks.
 */
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { db } from '../db';
import { profile, project, task, user } from '../db/schema';
import { ACTIVE_STATUSES } from '../metrics/task.metrics';
import type { IsoDate } from '../metrics/types';
import type { Executor } from '../pm/tx';
import { displayNameSql } from '../profile/profile.name';
import { liveTask, visibleTo } from '../task/task.sql';
import { HOME_ASK_BARS_MAX } from './home.config';
import { mineScope } from './home.scope';

export type OverdueFact = { title: string; projectName: string; dueDate: string };
export type LoadFact = { name: string; open: number };

const active = inArray(task.status, [...ACTIVE_STATUSES]);

/** The open task with the earliest due date before `today`, or null when nothing is late. */
export async function getLongestOverdue(
  p: Principal,
  today: IsoDate,
  exec: Executor = db,
): Promise<OverdueFact | null> {
  const [row] = await exec
    .select({ title: task.title, projectName: project.name, dueDate: task.dueDate })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .where(and(liveTask, visibleTo(mineScope(p)), active, sql`${task.dueDate} < ${today}::date`))
    .orderBy(asc(task.dueDate), asc(task.id))
    .limit(1);
  return row?.dueDate
    ? { title: row.title, projectName: row.projectName, dueDate: row.dueDate }
    : null;
}

/** People with the most open tasks in my projects, busiest first. */
export async function getBusiest(p: Principal, exec: Executor = db): Promise<LoadFact[]> {
  const open = sql<number>`count(*)::int`;
  const rows = await exec
    .select({ name: displayNameSql, open })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .innerJoin(user, eq(user.id, task.assigneeId))
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(and(liveTask, visibleTo(mineScope(p)), active, isNotNull(task.assigneeId)))
    .groupBy(user.id, displayNameSql)
    .orderBy(desc(open), asc(displayNameSql))
    .limit(HOME_ASK_BARS_MAX);
  return rows;
}
