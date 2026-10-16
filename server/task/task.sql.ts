/**
 * SQL fragments for task reads (S2-02): visibility, filters, sort registry and keyset conditions.
 * Kept apart from the query files so the list, the counts and the detail share one definition of
 * "which tasks may this person see" (the SQL twin of `matchesProjectScope`, D6).
 */
import { and, eq, gt, ilike, inArray, isNull, or, type SQL, sql } from 'drizzle-orm';
import type { ProjectListScope } from '../access/project.policy';
import { db } from '../db';
import { project, projectMember, task, taskChecklistItem } from '../db/schema';
import type { ScheduleBounds, ScheduleGroup } from '../metrics/schedule';
import { ACTIVE_STATUSES } from '../metrics/task.metrics';
import { PROJECT_PRIORITIES } from '../pm/enums';
import type { CursorSortValue } from '../pm/keyset';
import type { TaskSort } from './task.limits';

/** Live task in a live project; a task trashed on its own or with its project is never listed. */
export const liveTask = and(isNull(task.deletedAt), isNull(project.deletedAt));

/** Rows the scope may include: everything, or only projects the user is a member of. */
export function visibleTo(scope: ProjectListScope): SQL | undefined {
  if (scope.kind === 'all') return undefined;
  return inArray(
    task.projectId,
    db
      .select({ id: projectMember.projectId })
      .from(projectMember)
      .where(eq(projectMember.userId, scope.userId)),
  );
}

/** Open work only: the statuses shared with the pure `isActive`. */
export const activeTask = inArray(task.status, [...ACTIVE_STATUSES]);

/** `LIKE` search on the title; `%`, `_` and the escape character are literal, backslash being the Postgres default. */
export function titleMatches(q: string): SQL {
  return ilike(task.title, `%${q.replace(/[\\%_]/g, '\\$&')}%`);
}

const date = (v: string) => sql`${v}::date`;

/** `due_date` condition of one schedule group; mirrors `scheduleGroupOf`, and only open tasks belong to a group. */
export function inGroup(group: ScheduleGroup, b: ScheduleBounds): SQL {
  const due = task.dueDate;
  const by: Record<ScheduleGroup, SQL | undefined> = {
    overdue: sql`${due} < ${date(b.today)}`,
    today: sql`${due} = ${date(b.today)}`,
    tomorrow: sql`${due} = ${date(b.tomorrow)}`,
    week: sql`${due} > ${date(b.tomorrow)} AND ${due} <= ${date(b.weekEnd)}`,
    later: sql`${due} > ${date(b.weekEnd)}`,
    none: sql`${due} IS NULL`,
  };
  return and(activeTask, by[group]) as SQL;
}

/** The group of each row, computed by the database for `countTasks`; null for tasks that are not open. */
export function groupCase(b: ScheduleBounds): SQL<ScheduleGroup | null> {
  return sql<ScheduleGroup | null>`CASE
    WHEN ${task.status} NOT IN (${sql.join(
      ACTIVE_STATUSES.map((st) => sql`${st}`),
      sql`, `,
    )}) THEN NULL
    WHEN ${task.dueDate} IS NULL THEN 'none'
    WHEN ${task.dueDate} < ${date(b.today)} THEN 'overdue'
    WHEN ${task.dueDate} = ${date(b.today)} THEN 'today'
    WHEN ${task.dueDate} = ${date(b.tomorrow)} THEN 'tomorrow'
    WHEN ${task.dueDate} <= ${date(b.weekEnd)} THEN 'week'
    ELSE 'later' END`;
}

/** Checklist progress as two correlated counts; one query serves every row of the page. */
export const checklistDone = sql<number>`(
  SELECT count(*)::int FROM ${taskChecklistItem}
  WHERE ${taskChecklistItem.taskId} = ${task.id} AND ${taskChecklistItem.isDone})`;
export const checklistTotal = sql<number>`(
  SELECT count(*)::int FROM ${taskChecklistItem} WHERE ${taskChecklistItem.taskId} = ${task.id})`;

// Highest priority first: the enum tuple runs low to critical, so the rank is its mirror.
const PRIORITY_RANK = sql`(CASE ${task.priority} ${sql.join(
  PROJECT_PRIORITIES.map((p, i) => sql`WHEN ${p} THEN ${PROJECT_PRIORITIES.length - 1 - i}`),
  sql` `,
)} END)::int`;
const TIMESTAMP_TEXT = (col: SQL | typeof task.updatedAt) =>
  sql<string>`to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const validDay = (v: unknown) =>
  typeof v === 'string' &&
  ISO_DAY.test(v) &&
  // Date.parse alone rolls 30 Feb over to March; the round trip rejects it.
  new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);
const validInstant = (v: unknown) =>
  typeof v === 'string' && ISO_INSTANT.test(v) && Number.isFinite(Date.parse(`${v.slice(0, 19)}Z`));
const validRank = (v: unknown) =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < PROJECT_PRIORITIES.length;

/** One sortable key: how to order, how to read the key back for the cursor, how to bind a cursor value. */
type SortSpec = {
  /** Expression the rows are ordered by. */
  expr: SQL;
  /** The same key as a cursor-safe value (text keeps microseconds that a JS Date would lose). */
  key: SQL<CursorSortValue>;
  dir: 'asc' | 'desc';
  /** NULL sorts last; the cursor then needs the "key is NULL" branch. */
  nullable: boolean;
  /** Whether a decoded cursor value is well-formed for this sort, so a forged one never reaches Postgres. */
  valid: (v: unknown) => boolean;
  bind: (v: CursorSortValue) => SQL;
};

/** Registry of the list sorts; every sort ends in `id ASC`, which makes the order total for keyset paging. */
export const SORTS: Record<TaskSort, SortSpec> = {
  due: {
    expr: sql`${task.dueDate}`,
    key: sql<string | null>`to_char(${task.dueDate}, 'YYYY-MM-DD')`,
    dir: 'asc',
    nullable: true,
    valid: (v) => v === null || validDay(v),
    bind: (v) => sql`${v}::date`,
  },
  priority: {
    expr: PRIORITY_RANK,
    key: PRIORITY_RANK as SQL<number>,
    dir: 'asc',
    nullable: false,
    valid: validRank,
    bind: (v) => sql`${v}::int`,
  },
  updated: {
    expr: sql`${task.updatedAt}`,
    key: TIMESTAMP_TEXT(task.updatedAt),
    dir: 'desc',
    nullable: false,
    valid: validInstant,
    bind: (v) => sql`${v}::timestamptz`,
  },
  created: {
    expr: sql`${task.createdAt}`,
    key: TIMESTAMP_TEXT(task.createdAt),
    dir: 'desc',
    nullable: false,
    valid: validInstant,
    bind: (v) => sql`${v}::timestamptz`,
  },
};

/** `ORDER BY` list of a sort, with NULLs last and `id` as the tie-breaker. */
export function orderBy(sort: TaskSort): SQL[] {
  const s = SORTS[sort];
  const nulls = s.nullable ? sql` NULLS LAST` : sql``;
  return [sql`${s.expr} ${sql.raw(s.dir)}${nulls}`, sql`${task.id} ASC`];
}

/** Rows strictly after the cursor row in the order of `sort`; the caller has checked `valid`. */
export function afterCursor(sort: TaskSort, at: { sortValue: CursorSortValue; id: string }): SQL {
  const s = SORTS[sort];
  const sameKeyLaterId = (v: SQL) => and(sql`${s.expr} = ${v}`, gt(task.id, at.id));
  if (at.sortValue === null) return and(sql`${s.expr} IS NULL`, gt(task.id, at.id)) as SQL;
  const v = s.bind(at.sortValue);
  const beyond = s.dir === 'asc' ? sql`${s.expr} > ${v}` : sql`${s.expr} < ${v}`;
  // In an ascending nullable sort the NULL rows come after every real value.
  return or(beyond, sameKeyLaterId(v), s.nullable ? sql`${s.expr} IS NULL` : undefined) as SQL;
}

/** Columns of every task read, joined with the project (`TaskCardRow`). */
export const cardColumns = {
  id: task.id,
  number: task.number,
  title: task.title,
  status: task.status,
  priority: task.priority,
  dueDate: task.dueDate,
  projectId: task.projectId,
  projectName: project.name,
  projectStatus: project.status,
  assigneeId: task.assigneeId,
  reviewerId: task.reviewerId,
  createdBy: task.createdBy,
  needsReview: task.needsReview,
  reopenCount: task.reopenCount,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  completedAt: task.completedAt,
  canceledAt: task.canceledAt,
  lastActivityAt: task.lastActivityAt,
  checklistDone,
  checklistTotal,
};
