/**
 * Read side of the project Trash (S1-18): one page of trashed projects the caller may see, with who
 * deleted each one (join, not a lookup per row) and its `can{}`. Three statements whatever the page
 * size: the total, the page, and the caller's memberships for that page.
 */
import { and, count, desc, eq, inArray, isNotNull, or, type SQL } from 'drizzle-orm';
import { type TrashItemCaps, trashItemCaps, trashListScope } from '../access/trash.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { project, projectMember, user } from '../db/schema';
import { METRICS } from '../metrics/config';
import { isoDateIn } from '../metrics/dates';
import { lastRestorableDate } from '../metrics/trash.metrics';
import type { IsoDate, MetricsConfig } from '../metrics/types';
import type { Executor } from '../pm/tx';
import { loadMembership } from './membership.query';

/** One trashed project as the Trash page shows it; dates are decided by the server. */
export type TrashProjectItem = {
  kind: 'project';
  id: string;
  name: string;
  /** ISO instant of the delete. */
  deletedAt: string;
  /** Id and name only (Q8); null when the deleting account no longer exists. */
  deletedBy: { id: string; name: string } | null;
  /** Last calendar day (team zone) the project may still be restored. */
  restorableUntil: IsoDate;
  can: TrashItemCaps;
};

export type ListTrashInput = { limit: number; offset: number; now: Date; metrics?: MetricsConfig };

/** SQL twin of `trashListScope`/`canViewTrashItem`: deleted by the caller or managed by them. */
function scopeWhere(p: Principal, exec: Executor): SQL | undefined {
  const scope = trashListScope(p);
  if (scope.kind === 'all') return undefined;
  const managed = exec
    .select({ id: projectMember.projectId })
    .from(projectMember)
    .where(and(eq(projectMember.userId, scope.userId), eq(projectMember.role, 'manager')));
  return or(eq(project.deletedBy, scope.userId), inArray(project.id, managed));
}

/** Trashed projects the caller may see, newest delete first, one page plus the total. */
export async function listTrashProjects(
  p: Principal,
  input: ListTrashInput,
  exec: Executor = db,
): Promise<{ items: TrashProjectItem[]; total: number }> {
  const cfg = input.metrics ?? METRICS;
  const where = and(isNotNull(project.deletedAt), scopeWhere(p, exec));
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
  const memberships = await loadMembership(
    p.id,
    rows.map((r) => r.id),
    exec,
  );
  const items = rows.flatMap((r): TrashProjectItem[] => {
    // `where` already excludes live rows; the guard only narrows the type.
    if (!r.deletedAt) return [];
    const m = memberships.get(r.id) ?? null;
    return [
      {
        kind: 'project',
        id: r.id,
        name: r.name,
        deletedAt: r.deletedAt.toISOString(),
        deletedBy:
          r.deletedBy && r.deletedByName ? { id: r.deletedBy, name: r.deletedByName } : null,
        restorableUntil: lastRestorableDate(isoDateIn(r.deletedAt, cfg.TIME_ZONE), cfg),
        can: trashItemCaps(p, r, m, input.now, undefined, cfg),
      },
    ];
  });
  return { items, total: totalRow?.n ?? 0 };
}
