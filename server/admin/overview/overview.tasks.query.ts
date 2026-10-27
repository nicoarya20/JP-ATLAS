/**
 * Overdue tasks for the Admin Beranda: the worst few plus a total, workspace-wide. "Overdue" is a
 * calendar fact — a due date earlier than today in the team zone — so `today` is passed in from the
 * server clock and compared as text against the `date` column (both `YYYY-MM-DD`), never `new Date()`.
 *
 * Two statements only: the page of rows (with project and assignee names from joins, so there is no
 * query per task) and the matching count.
 */
import { and, asc, eq, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { db } from '../../db';
import { project, task, user } from '../../db/schema';
import { diffDays } from '../../metrics/dates';
import type { IsoDate } from '../../metrics/types';
import { isLive } from '../../pm/soft-delete';
import type { Executor } from '../../pm/tx';
import { OVERVIEW_LIST_LIMIT } from './overview.config';
import type { OverdueTasksSummary } from './overview.dto';

/** A task counts as overdue only while it is still open; done and canceled tasks are settled. */
const OPEN_STATUSES = ['todo', 'in_progress', 'in_review'] as const;

export async function getOverdueTasks(
  today: IsoDate,
  exec: Executor = db,
): Promise<OverdueTasksSummary> {
  const overdue = and(
    isLive(task),
    isNotNull(task.dueDate),
    lt(task.dueDate, today),
    inArray(task.status, [...OPEN_STATUSES]),
  );
  const [rows, [totals]] = await Promise.all([
    exec
      .select({
        id: task.id,
        number: task.number,
        title: task.title,
        dueDate: task.dueDate,
        projectName: project.name,
        assigneeName: user.name,
      })
      .from(task)
      .innerJoin(project, eq(project.id, task.projectId))
      .leftJoin(user, eq(user.id, task.assigneeId))
      // Most overdue first (oldest due date), then the task number for a stable tie-break.
      .orderBy(asc(task.dueDate), asc(task.number))
      .where(overdue)
      .limit(OVERVIEW_LIST_LIMIT),
    exec.select({ count: sql<number>`count(*)::int` }).from(task).where(overdue),
  ]);
  const items = rows.map((r) => ({
    id: r.id,
    number: r.number,
    title: r.title,
    projectName: r.projectName,
    assigneeName: r.assigneeName,
    dueDate: r.dueDate as IsoDate,
    overdueDays: diffDays(r.dueDate as IsoDate, today),
  }));
  return { items, total: totals?.count ?? 0 };
}
