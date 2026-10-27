/**
 * Upcoming agenda for the Admin Beranda: the next few events anywhere in the workspace, plus a total.
 * "Upcoming" is measured against the server clock (`at`) — an event still running counts, because it
 * has not ended yet — so nothing here reads the browser's time. Cancelled and trashed events drop out.
 *
 * Two statements: the page of rows (project name from a left join, so no query per event) and the count.
 */
import { and, asc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '../../db';
import { event, project } from '../../db/schema';
import type { Executor } from '../../pm/tx';
import { OVERVIEW_LIST_LIMIT } from './overview.config';
import type { AgendaSummary } from './overview.dto';

export async function getAgenda(at: Date, exec: Executor = db): Promise<AgendaSummary> {
  const upcoming = and(isNull(event.deletedAt), isNull(event.canceledAt), gt(event.endsAt, at));
  const [rows, [totals]] = await Promise.all([
    exec
      .select({
        id: event.id,
        title: event.title,
        kind: event.kind,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        projectName: project.name,
      })
      .from(event)
      .leftJoin(project, eq(project.id, event.projectId))
      .orderBy(asc(event.startsAt), asc(event.id))
      .where(upcoming)
      .limit(OVERVIEW_LIST_LIMIT),
    exec.select({ count: sql<number>`count(*)::int` }).from(event).where(upcoming),
  ]);
  const items = rows.map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    projectName: r.projectName,
  }));
  return { items, total: totals?.count ?? 0 };
}
