/**
 * The merged Trash list (S6 D1, S7 E-07): trashed projects, tasks and events the caller may see,
 * newest delete first, in one page. The page itself is one UNION of `(kind, id)` pairs ordered and
 * cut in SQL, so paging stays exact across the kinds; the rows are then hydrated per kind with one
 * query each (no statement per row). `kind` narrows the page to one kind; `counts` always covers
 * all of them, so the filter chips can show how many of each exist.
 */
import { and, count, desc, isNotNull, sql } from 'drizzle-orm';
import { unionAll } from 'drizzle-orm/pg-core';
import type { Principal } from '../access/types';
import { db } from '../db';
import { event, project, task } from '../db/schema';
import {
  hydrateTrashEvents,
  type TrashEventItem,
  trashEventWhere,
} from '../event/events.trash.query';
import { METRICS } from '../metrics/config';
import type { MetricsConfig } from '../metrics/types';
import type { Executor } from '../pm/tx';
import {
  listTrashProjects,
  scopeWhere,
  type TrashProjectItem,
} from '../project/project-trash.query';
import { hydrateTrashTasks, type TrashTaskItem, trashTaskWhere } from '../task/task-trash.query';

export const TRASH_KINDS = ['all', 'project', 'task', 'event'] as const;
export type TrashKindFilter = (typeof TRASH_KINDS)[number];

export type TrashItem = TrashProjectItem | TrashTaskItem | TrashEventItem;
export type TrashCounts = { project: number; task: number; event: number };

export type ListTrashInput = {
  kind: TrashKindFilter;
  limit: number;
  offset: number;
  now: Date;
  metrics?: MetricsConfig;
};

type Kind = 'project' | 'task' | 'event';

/** One page of the Trash plus how many rows match the filter (`total`) and per kind (`counts`). */
export async function listTrash(
  p: Principal,
  input: ListTrashInput,
  exec: Executor = db,
): Promise<{ items: TrashItem[]; total: number; counts: TrashCounts }> {
  const cfg = input.metrics ?? METRICS;
  const projectWhere = and(isNotNull(project.deletedAt), scopeWhere(p, exec));
  const taskWhere = trashTaskWhere(p, exec);
  const eventWhere = trashEventWhere(p, exec);
  const wants = (kind: Kind) => input.kind === 'all' || input.kind === kind;

  // Each kind contributes `(kind, id, deleted_at)` rows; the tag is a literal so the UNION can sort and cut them as one.
  const pairs = {
    project: exec
      .select({
        kind: sql<string>`'project'::text`.as('kind'),
        id: project.id,
        deletedAt: project.deletedAt,
      })
      .from(project)
      .where(projectWhere),
    task: exec
      .select({
        kind: sql<string>`'task'::text`.as('kind'),
        id: task.id,
        deletedAt: task.deletedAt,
      })
      .from(task)
      .where(taskWhere),
    event: exec
      .select({
        kind: sql<string>`'event'::text`.as('kind'),
        id: event.id,
        deletedAt: event.deletedAt,
      })
      .from(event)
      .where(eventWhere),
  };
  // Drizzle types each column with its table name, which a UNION does not care about: at runtime the
  // three selects are the same `(kind, id, deleted_at)` shape, so they are typed as the first one.
  type Pair = typeof pairs.project;
  const wanted = (['project', 'task', 'event'] as const)
    .filter(wants)
    .map((k) => pairs[k] as unknown as Pair);
  const [first, second, ...rest] = wanted;
  const page = (() => {
    if (second) {
      return unionAll(first, second, ...rest)
        .orderBy(sql`deleted_at DESC`, sql`id DESC`)
        .limit(input.limit)
        .offset(input.offset);
    }
    return first
      .orderBy(desc(sql`deleted_at`), desc(sql`id`))
      .limit(input.limit)
      .offset(input.offset);
  })();

  const [picked, [projects], [tasks], [events]] = await Promise.all([
    page,
    exec.select({ n: count() }).from(project).where(projectWhere),
    exec.select({ n: count() }).from(task).where(taskWhere),
    exec.select({ n: count() }).from(event).where(eventWhere),
  ]);
  const counts: TrashCounts = {
    project: projects?.n ?? 0,
    task: tasks?.n ?? 0,
    event: events?.n ?? 0,
  };

  const idsOf = (kind: Kind) => picked.filter((x) => x.kind === kind).map((x) => x.id);
  const projectIds = idsOf('project');
  const [projectRows, taskRows, eventRows] = await Promise.all([
    projectIds.length > 0
      ? listTrashProjects(
          p,
          { limit: projectIds.length, offset: 0, now: input.now, metrics: cfg, ids: projectIds },
          exec,
        )
      : { items: [] as TrashProjectItem[], total: 0 },
    hydrateTrashTasks(p, idsOf('task'), input.now, cfg, exec),
    hydrateTrashEvents(p, idsOf('event'), input.now, cfg, exec),
  ]);
  const projectById = new Map(projectRows.items.map((i) => [i.id, i]));
  const items = picked.flatMap((x): TrashItem[] => {
    const item =
      x.kind === 'project'
        ? projectById.get(x.id)
        : x.kind === 'task'
          ? taskRows.get(x.id)
          : eventRows.get(x.id);
    return item ? [item] : [];
  });
  const total =
    input.kind === 'all' ? counts.project + counts.task + counts.event : counts[input.kind];
  return { items, total, counts };
}
