/**
 * Read side of the project Trash (S1-18): one page of trashed projects the caller may see, with who
 * deleted each one (join, not a lookup per row), its `can{}` and how many tasks and events went with
 * it. Six statements whatever the page size: the total, the page, the caller's memberships and the
 * two cascade counts for that page.
 */
import { and, count, desc, eq, inArray, isNotNull, or, type SQL, sql } from 'drizzle-orm';
import { type TrashItemCaps, trashItemCaps, trashListScope } from '../access/trash.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { event, project, projectMember, task, user } from '../db/schema';
import { METRICS } from '../metrics/config';
import type { MetricsConfig } from '../metrics/types';
import type { Executor } from '../pm/tx';
import { type TrashTiming, trashTiming } from '../trash/trash.item';
import { loadMembership } from './membership.query';

/** One trashed project as the Trash page shows it; dates are decided by the server. */
export type TrashProjectItem = TrashTiming & {
  kind: 'project';
  id: string;
  name: string;
  /** Id and name only (Q8); null when the deleting account no longer exists. */
  deletedBy: { id: string; name: string } | null;
  /** What went to the Trash with the project and comes back with it. */
  cascade: { tasks: number; events: number };
  can: TrashItemCaps;
};

export type ListTrashInput = {
  limit: number;
  offset: number;
  now: Date;
  metrics?: MetricsConfig;
  /** Only these projects (the merged Trash list hydrates the ids of one page); still scoped to the caller. */
  ids?: readonly string[];
};

/** SQL twin of `trashListScope`/`canViewTrashItem`: deleted by the caller or managed by them. */
export function scopeWhere(p: Principal, exec: Executor): SQL | undefined {
  const scope = trashListScope(p);
  if (scope.kind === 'all') return undefined;
  const managed = exec
    .select({ id: projectMember.projectId })
    .from(projectMember)
    .where(and(eq(projectMember.userId, scope.userId), eq(projectMember.role, 'manager')));
  return or(eq(project.deletedBy, scope.userId), inArray(project.id, managed));
}

/** Tasks and events that went to the Trash with each project, one grouped query per kind. */
async function cascadeCounts(
  ids: readonly string[],
  exec: Executor,
): Promise<Map<string, { tasks: number; events: number }>> {
  const out = new Map<string, { tasks: number; events: number }>();
  if (ids.length === 0) return out;
  const list = [...ids];
  const [tasks, events] = await Promise.all([
    exec
      .select({ id: task.deletedWithProjectId, n: sql<number>`count(*)::int` })
      .from(task)
      .where(inArray(task.deletedWithProjectId, list))
      .groupBy(task.deletedWithProjectId),
    exec
      .select({ id: event.deletedWithProjectId, n: sql<number>`count(*)::int` })
      .from(event)
      .where(inArray(event.deletedWithProjectId, list))
      .groupBy(event.deletedWithProjectId),
  ]);
  for (const id of list) out.set(id, { tasks: 0, events: 0 });
  for (const r of tasks) if (r.id) (out.get(r.id) as { tasks: number }).tasks = r.n;
  for (const r of events) if (r.id) (out.get(r.id) as { events: number }).events = r.n;
  return out;
}

/** Trashed projects the caller may see, newest delete first, one page plus the total. */
export async function listTrashProjects(
  p: Principal,
  input: ListTrashInput,
  exec: Executor = db,
): Promise<{ items: TrashProjectItem[]; total: number }> {
  const cfg = input.metrics ?? METRICS;
  const where = and(
    isNotNull(project.deletedAt),
    scopeWhere(p, exec),
    input.ids ? inArray(project.id, [...input.ids]) : undefined,
  );
  const [[totalRow], rows] = await Promise.all([
    exec.select({ n: count() }).from(project).where(where),
    exec
      .select({
        id: project.id,
        name: project.name,
        status: project.status,
        leadId: project.leadId,
        deletedAt: project.deletedAt,
        deletedBy: project.deletedBy,
        deletedByName: user.name,
      })
      .from(project)
      .leftJoin(user, eq(user.id, project.deletedBy))
      .where(where)
      .orderBy(desc(project.deletedAt), desc(project.id))
      .limit(input.limit)
      .offset(input.offset),
  ]);
  const pageIds = rows.map((r) => r.id);
  const [memberships, cascade] = await Promise.all([
    loadMembership(p.id, pageIds, exec),
    cascadeCounts(pageIds, exec),
  ]);
  const items = rows.flatMap((r): TrashProjectItem[] => {
    // `where` already excludes live rows; the guard only narrows the type.
    if (!r.deletedAt) return [];
    const m = memberships.get(r.id) ?? null;
    return [
      {
        kind: 'project',
        id: r.id,
        name: r.name,
        ...trashTiming(r.deletedAt, input.now, cfg),
        deletedBy:
          r.deletedBy && r.deletedByName ? { id: r.deletedBy, name: r.deletedByName } : null,
        cascade: cascade.get(r.id) ?? { tasks: 0, events: 0 },
        can: trashItemCaps(p, r, m, input.now, undefined, cfg),
      },
    ];
  });
  return { items, total: totalRow?.n ?? 0 };
}
