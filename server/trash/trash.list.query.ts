/**
 * The merged Trash list (S6 D1): trashed projects and trashed tasks the caller may see, newest delete
 * first, in one page. The page itself is one UNION of `(kind, id)` pairs ordered and cut in SQL, so
 * paging stays exact across both kinds; the rows are then hydrated per kind with one query each (no
 * statement per row). `kind` narrows the page to one kind; `counts` always covers both, so the
 * filter chips can show how many of each exist.
 */
import { and, count, desc, isNotNull, sql } from 'drizzle-orm';
import { unionAll } from 'drizzle-orm/pg-core';
import type { Principal } from '../access/types';
import { db } from '../db';
import { project, task } from '../db/schema';
import { METRICS } from '../metrics/config';
import type { MetricsConfig } from '../metrics/types';
import type { Executor } from '../pm/tx';
import {
  listTrashProjects,
  scopeWhere,
  type TrashProjectItem,
} from '../project/project-trash.query';
import { hydrateTrashTasks, type TrashTaskItem, trashTaskWhere } from '../task/task-trash.query';

export const TRASH_KINDS = ['all', 'project', 'task'] as const;
export type TrashKindFilter = (typeof TRASH_KINDS)[number];

export type TrashItem = TrashProjectItem | TrashTaskItem;
export type TrashCounts = { project: number; task: number };

export type ListTrashInput = {
  kind: TrashKindFilter;
  limit: number;
  offset: number;
  now: Date;
  metrics?: MetricsConfig;
};

/** One page of the Trash plus how many rows match the filter (`total`) and per kind (`counts`). */
export async function listTrash(
  p: Principal,
  input: ListTrashInput,
  exec: Executor = db,
): Promise<{ items: TrashItem[]; total: number; counts: TrashCounts }> {
  const cfg = input.metrics ?? METRICS;
  const projectWhere = and(isNotNull(project.deletedAt), scopeWhere(p, exec));
  const taskWhere = trashTaskWhere(p, exec);
  const wantsProjects = input.kind !== 'task';
  const wantsTasks = input.kind !== 'project';

  const projectPairs = exec
    .select({
      kind: sql<string>`'project'::text`.as('kind'),
      id: project.id,
      deletedAt: project.deletedAt,
    })
    .from(project)
    .where(projectWhere);
  const taskPairs = exec
    .select({ kind: sql<string>`'task'::text`.as('kind'), id: task.id, deletedAt: task.deletedAt })
    .from(task)
    .where(taskWhere);
  const order = [sql`deleted_at DESC`, sql`id DESC`] as const;
  const page = (() => {
    if (wantsProjects && wantsTasks) {
      return unionAll(projectPairs, taskPairs)
        .orderBy(...order)
        .limit(input.limit)
        .offset(input.offset);
    }
    const one = wantsProjects ? projectPairs : taskPairs;
    return one
      .orderBy(desc(sql`deleted_at`), desc(sql`id`))
      .limit(input.limit)
      .offset(input.offset);
  })();

  const [pairs, [projects], [tasks]] = await Promise.all([
    page,
    exec.select({ n: count() }).from(project).where(projectWhere),
    exec.select({ n: count() }).from(task).where(taskWhere),
  ]);
  const counts: TrashCounts = { project: projects?.n ?? 0, task: tasks?.n ?? 0 };

  const idsOf = (kind: 'project' | 'task') => pairs.filter((x) => x.kind === kind).map((x) => x.id);
  const projectIds = idsOf('project');
  const [projectRows, taskRows] = await Promise.all([
    projectIds.length > 0
      ? listTrashProjects(
          p,
          { limit: projectIds.length, offset: 0, now: input.now, metrics: cfg, ids: projectIds },
          exec,
        )
      : { items: [] as TrashProjectItem[], total: 0 },
    hydrateTrashTasks(p, idsOf('task'), input.now, cfg, exec),
  ]);
  const projectById = new Map(projectRows.items.map((i) => [i.id, i]));
  const items = pairs.flatMap((x): TrashItem[] => {
    const item = x.kind === 'project' ? projectById.get(x.id) : taskRows.get(x.id);
    return item ? [item] : [];
  });
  const total = input.kind === 'all' ? counts.project + counts.task : counts[input.kind];
  return { items, total, counts };
}
