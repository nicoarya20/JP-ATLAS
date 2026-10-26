/**
 * Task list and counts (S2-02). Visibility is decided in SQL (`visibleTo`, the twin of
 * `matchesProjectScope`), so a page never holds a row the viewer may not see, and the number of
 * queries stays constant however many tasks match (the "Tugas saya" budget is at most 6).
 */
import { and, eq, inArray, type SQL, sql } from 'drizzle-orm';
import { type capOf, projectCaps } from '../access/capabilities';
import { atLeast, levelOf } from '../access/level';
import { projectListScope } from '../access/project.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { project, projectMember, projectPhase, task } from '../db/schema';
import { SCHEDULE_GROUPS, type ScheduleGroup, scheduleBounds } from '../metrics/schedule';
import { TASK_STATUSES, type TaskStatus } from '../pm/enums';
import { decodeCursor, encodeCursor } from '../pm/keyset';
import { PAGE_LIMIT_DEFAULT, PAGE_LIMIT_MAX } from '../pm/limits';
import type { Executor } from '../pm/tx';
import { loadMembership } from '../project/membership.query';
import type {
  ListTasksInput,
  ListTasksResult,
  TaskCardRow,
  TaskClock,
  TaskCounts,
  TaskListItem,
} from './task.dto';
import { TASK_SEARCH_MAX, TASK_SORT_DEFAULT } from './task.limits';
import { loadPeople, loadReviewerPools } from './task.lookup.query';
import {
  afterCursor,
  cardColumns,
  groupCase,
  inGroup,
  liveTask,
  onTaskPhase,
  orderBy,
  SORTS,
  taskSearch,
  visibleTo,
} from './task.sql';
import { phaseOf, viewOf } from './task.view';

const clampLimit = (n: number | undefined) =>
  Math.min(Math.max(Math.trunc(n ?? PAGE_LIMIT_DEFAULT), 1), PAGE_LIMIT_MAX);

/** The WHERE conditions the caller's filters add; undefined entries are dropped by `and`. */
function filtersOf(p: Principal, i: ListTasksInput, today: string): (SQL | undefined)[] {
  const q = i.q?.trim().slice(0, TASK_SEARCH_MAX);
  return [
    i.scope === 'mine' ? eq(task.assigneeId, p.id) : undefined,
    // Whenever a project is named, not only for `scope=project`: the Proyek filter of the Tugas page sends it with `mine` and `all`.
    i.projectId ? eq(task.projectId, i.projectId) : undefined,
    i.status?.length ? inArray(task.status, [...i.status]) : undefined,
    i.assigneeId ? eq(task.assigneeId, i.assigneeId) : undefined,
    i.priority?.length ? inArray(task.priority, [...i.priority]) : undefined,
    q ? taskSearch(q) : undefined,
    i.due ? inGroup(i.due, scheduleBounds(today)) : undefined,
  ];
}

/** The create-task capability of the response: of one project for `scope=project`, else "is there any project I can add to". */
async function createTaskCap(
  p: Principal,
  i: ListTasksInput,
  memberships: Awaited<ReturnType<typeof loadMembership>>,
  exec: Executor,
): Promise<{ createTask?: true | NonNullable<ReturnType<typeof capOf>> }> {
  if (i.scope === 'project') {
    const [row] = await exec
      .select({
        id: project.id,
        status: project.status,
        leadId: project.leadId,
        deletedAt: project.deletedAt,
        deletedBy: project.deletedBy,
      })
      .from(project)
      .where(eq(project.id, i.projectId as string));
    // A missing project answers like a hidden one: no capability, no hint that it exists.
    const cap = row ? projectCaps(p, row, memberships.get(row.id) ?? null).createTask : undefined;
    return cap === undefined ? {} : { createTask: cap };
  }
  const anywhere = atLeast(levelOf(p, null), 'admin');
  const [hit] = anywhere
    ? await exec
        .select({ one: sql<number>`1` })
        .from(project)
        .where(sql`${project.deletedAt} IS NULL`)
        .limit(1)
    : await exec
        .select({ one: sql<number>`1` })
        .from(projectMember)
        .innerJoin(project, eq(project.id, projectMember.projectId))
        .where(
          and(
            eq(projectMember.userId, p.id),
            inArray(projectMember.role, ['manager', 'member']),
            sql`${project.deletedAt} IS NULL`,
          ),
        )
        .limit(1);
  return hit ? { createTask: true } : {};
}

/**
 * One keyset page of tasks the principal may see, with labels and `can{}` per row. A cursor that
 * is malformed or belongs to another sort answers `BAD_CURSOR` instead of throwing.
 */
export async function listTasks(
  p: Principal,
  input: ListTasksInput,
  clock: TaskClock,
  exec: Executor = db,
): Promise<ListTasksResult> {
  if (input.scope === 'project' && !input.projectId) {
    throw new Error('listTasks: scope "project" needs a projectId');
  }
  const sort = input.sort ?? TASK_SORT_DEFAULT;
  const limit = clampLimit(input.limit);
  let after: SQL | undefined;
  if (input.cursor !== undefined) {
    const cursor = decodeCursor(input.cursor);
    if (!cursor.ok || !SORTS[sort].valid(cursor.key.sortValue))
      return { ok: false, code: 'BAD_CURSOR' };
    after = afterCursor(sort, cursor.key);
  }

  const rows = await exec
    .select({ ...cardColumns, sortKey: SORTS[sort].key })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .leftJoin(projectPhase, onTaskPhase)
    .where(
      and(liveTask, visibleTo(projectListScope(p)), ...filtersOf(p, input, clock.today), after),
    )
    .orderBy(...orderBy(sort))
    // One extra row tells whether another page exists without a second count query.
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const nextCursor = rows.length > limit && last ? encodeCursor(last.sortKey, last.id) : null;

  const projectIds = [...new Set(page.map((r) => r.projectId))];
  const [people, memberships, pools] = await Promise.all([
    loadPeople(
      page.map((r) => r.assigneeId),
      exec,
    ),
    loadMembership(p.id, input.projectId ? [...projectIds, input.projectId] : projectIds, exec),
    loadReviewerPools(projectIds, exec),
  ]);
  const caps = await createTaskCap(p, input, memberships, exec);

  const items = page.map((r: TaskCardRow): TaskListItem => {
    const { labels, can, primary } = viewOf(
      p,
      r,
      memberships.get(r.projectId) ?? null,
      pools.get(r.projectId) ?? { managers: [], adminIds: [] },
      clock,
    );
    return {
      id: r.id,
      number: r.number,
      title: r.title,
      status: r.status,
      priority: r.priority,
      dueDate: r.dueDate,
      assignee: r.assigneeId ? (people.get(r.assigneeId) ?? null) : null,
      project: { id: r.projectId, name: r.projectName, status: r.projectStatus },
      phase: phaseOf(r),
      labels,
      checklist: { done: r.checklistDone, total: r.checklistTotal },
      primary,
      can,
    };
  });
  return { ok: true, items, nextCursor, caps };
}

/**
 * Counts for the "Tugas saya" tabs in one grouped query: my open tasks per schedule group and all
 * my tasks per status. Covers the same rows as `listTasks` with `scope: 'mine'`.
 */
export async function countTasks(
  p: Principal,
  clock: Pick<TaskClock, 'today'>,
  exec: Executor = db,
): Promise<TaskCounts> {
  const group = groupCase(scheduleBounds(clock.today));
  const rows = await exec
    .select({ status: task.status, group, n: sql<number>`count(*)::int` })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .where(and(liveTask, visibleTo(projectListScope(p)), eq(task.assigneeId, p.id)))
    // Ordinals, not the CASE text: its dates are bind parameters, and Postgres cannot match two
    // copies of an expression that carry different placeholders.
    .groupBy(sql`1`, sql`2`);

  const mine = Object.fromEntries(SCHEDULE_GROUPS.map((g) => [g, 0])) as Record<
    ScheduleGroup,
    number
  >;
  const byStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0])) as Record<
    TaskStatus,
    number
  >;
  for (const r of rows) {
    byStatus[r.status] += r.n;
    if (r.group) mine[r.group] += r.n;
  }
  return { mine, byStatus };
}
