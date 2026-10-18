/**
 * Open-task counts behind the Team pages (S6 M02). Visibility is part of the aggregate, not a
 * filter applied to a finished answer: a person the caller may not count simply never reaches this
 * file, and a project outside the caller's `LoadScope` is counted only into `alsoElsewhere`.
 *
 * One statement per call, whatever the page size, so the Team list stays inside its four-query
 * budget (P7 §5).
 */
import { and, eq, inArray, or, type SQL, sql } from 'drizzle-orm';
import { type LoadScope, scopeCovers } from '../access/team.policy';
import { db } from '../db';
import { project, task } from '../db/schema';
import { ACTIVE_STATUSES } from '../metrics/task.metrics';
import type { IsoDate } from '../metrics/types';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';
import type { TeamLoad, TeamTaskRef } from './team.dto';

/** The detail page shows a person's open work, not their whole backlog (P7 §4). */
export const PERSON_TASKS_MAX = 20;

/** One person whose load is wanted, with the projects the caller may count for them. */
export type LoadRequest = { userId: string; scope: LoadScope };

/** Open work in a live project: the SQL twin of `isActive` plus the project's own trash state. */
const openTask = and(
  isLive(task),
  isLive(project),
  inArray(task.status, [...ACTIVE_STATUSES]),
) as SQL;

/** Overdue in SQL: `due_date` strictly before today, so due today is not late (twin of `isOverdue`). */
const overdueOn = (today: IsoDate) => sql`${task.dueDate} < ${today}::date`;

/**
 * Rows the caller may count, as one predicate: everything of the people whose scope is `all`, and
 * the listed projects of everyone else. Written as a drizzle predicate rather than an `unnest` of
 * id arrays because the page is clamped to 50 people, so the statement stays small and typed.
 * Returns undefined when nobody has a scope, which the caller treats as "ask nothing".
 */
function countable(requests: readonly LoadRequest[]): SQL | undefined {
  const all = requests.filter((r) => 'all' in r.scope).map((r) => r.userId);
  const parts: (SQL | undefined)[] = all.length ? [inArray(task.assigneeId, all)] : [];
  for (const r of requests) {
    if (!('projectIds' in r.scope) || r.scope.projectIds.size === 0) continue;
    parts.push(
      and(eq(task.assigneeId, r.userId), inArray(task.projectId, [...r.scope.projectIds])),
    );
  }
  return parts.length ? (or(...parts) as SQL) : undefined;
}

const toCount = (v: unknown) => Number(v ?? 0);

/**
 * Open-task counts per person, keyed by user id. People with a scope but no open task get an
 * explicit `{active: 0, overdue: 0}` so the UI shows a number rather than an empty slot; people
 * with no scope are not asked about and are absent from the Map.
 */
export async function loadForPeople(
  requests: readonly LoadRequest[],
  today: IsoDate,
  exec: Executor = db,
): Promise<Map<string, TeamLoad>> {
  const out = new Map<string, TeamLoad>();
  const wanted = requests.filter((r) => !('none' in r.scope));
  const allowed = countable(wanted);
  if (!allowed) return out;
  for (const r of wanted) out.set(r.userId, { active: 0, overdue: 0 });
  const rows = await exec
    .select({
      userId: task.assigneeId,
      active: sql<number>`count(*) FILTER (WHERE ${allowed})`,
      overdue: sql<number>`count(*) FILTER (WHERE ${allowed} AND ${overdueOn(today)})`,
      // A project outside the scope is never counted, only acknowledged (D10).
      elsewhere: sql<boolean>`bool_or(NOT (${allowed}))`,
    })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .where(and(inArray(task.assigneeId, [...out.keys()]), openTask))
    .groupBy(task.assigneeId);
  for (const r of rows) {
    if (!r.userId) continue; // an unassigned task cannot be anybody's load
    const load: TeamLoad = { active: toCount(r.active), overdue: toCount(r.overdue) };
    if (r.elsewhere) load.alsoElsewhere = true;
    out.set(r.userId, load);
  }
  return out;
}

export type PersonWork = { tasks: TeamTaskRef[]; load: TeamLoad };

/**
 * One person's open tasks and their load, in one statement. Every open task is read and the
 * `LoadScope` is applied in memory through `scopeCovers`, so the counts are exact and
 * `alsoElsewhere` can be told from the rows the viewer may not see; the row set is one person's
 * open work, which the partial index on `(assignee_id, status, due_date)` serves directly.
 */
export async function loadPersonWork(
  userId: string,
  scope: LoadScope,
  today: IsoDate,
  exec: Executor = db,
): Promise<PersonWork> {
  const rows = await exec
    .select({
      number: task.number,
      title: task.title,
      status: task.status,
      dueDate: task.dueDate,
      projectId: task.projectId,
    })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .where(and(eq(task.assigneeId, userId), openTask))
    // Overdue first, then the nearest due date; a task without one comes last (P7 §4).
    .orderBy(
      sql`(${task.dueDate} IS NOT NULL AND ${task.dueDate} < ${today}::date) DESC`,
      sql`${task.dueDate} ASC NULLS LAST`,
      task.number,
    );
  const mine = rows.filter((r) => scopeCovers(scope, r.projectId));
  const load: TeamLoad = {
    active: mine.length,
    overdue: mine.filter((r) => r.dueDate !== null && r.dueDate < today).length,
  };
  if (mine.length < rows.length) load.alsoElsewhere = true;
  return { tasks: mine.slice(0, PERSON_TASKS_MAX), load };
}
