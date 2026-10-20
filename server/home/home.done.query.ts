/** "Tasks Completed This Week": tasks finished since Monday 00.00 (team zone) in my projects, newest first. */
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { db } from '../db';
import { profile, project, task, user } from '../db/schema';
import { diffDays, isoDateIn } from '../metrics/dates';
import type { IsoDate } from '../metrics/types';
import { weekStartDate } from '../metrics/week';
import type { Executor } from '../pm/tx';
import { displayNameSql } from '../profile/profile.name';
import { liveTask, visibleTo } from '../task/task.sql';
import { HOME_DONE_MAX } from './home.config';
import { DONE_COPY } from './home.copy';
import type { HomeDone } from './home.dto';
import { weekdayOf } from './home.now';
import { mineScope } from './home.scope';

/** "hari ini", "kemarin" or the weekday of the day the task was finished. */
export function dayLabelOf(day: IsoDate, today: IsoDate): string {
  const ago = diffDays(day, today);
  if (ago === 0) return DONE_COPY.today;
  return ago === 1 ? DONE_COPY.yesterday : weekdayOf(day);
}

export async function getDone(
  p: Principal,
  clock: { today: IsoDate; timeZone: string },
  exec: Executor = db,
): Promise<HomeDone> {
  // Postgres turns local midnight of Monday into an instant, so DST or a zone change is never guessed in JS.
  const weekStart = sql`(${weekStartDate(clock.today)}::timestamp AT TIME ZONE ${clock.timeZone})`;
  const rows = await exec
    .select({
      id: task.id,
      number: task.number,
      title: task.title,
      projectId: task.projectId,
      projectName: project.name,
      assigneeId: task.assigneeId,
      assigneeName: displayNameSql,
      completedAt: task.completedAt,
      total: sql<number>`(count(*) OVER ())::int`,
    })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .leftJoin(user, eq(user.id, task.assigneeId))
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(
      and(
        liveTask,
        visibleTo(mineScope(p)),
        eq(task.status, 'done'),
        sql`${task.completedAt} >= ${weekStart}`,
      ),
    )
    .orderBy(desc(task.completedAt), desc(task.id))
    .limit(HOME_DONE_MAX);
  return {
    total: rows[0]?.total ?? 0,
    items: rows.map((r) => ({
      id: r.id,
      number: r.number,
      title: r.title,
      project: { id: r.projectId, name: r.projectName },
      byName:
        r.assigneeId === p.id ? DONE_COPY.me : r.assigneeId ? r.assigneeName : DONE_COPY.nobody,
      dayLabel: r.completedAt
        ? dayLabelOf(isoDateIn(r.completedAt, clock.timeZone), clock.today)
        : DONE_COPY.today,
    })),
  };
}
