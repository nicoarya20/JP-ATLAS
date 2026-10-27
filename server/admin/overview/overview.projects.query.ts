/**
 * Projects per status for the Admin Beranda: a single GROUP BY over live projects, workspace-wide.
 * The Admin Beranda summarises the whole workspace (unlike the Beranda produk, which is scoped to
 * "my" projects), so no membership filter applies here — only the soft-delete filter does.
 */
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { project } from '../../db/schema';
import { PROJECT_STATUSES, type ProjectStatus } from '../../pm/enums';
import { isLive } from '../../pm/soft-delete';
import type { Executor } from '../../pm/tx';
import type { ProjectsSummary } from './overview.dto';

export async function getProjectsByStatus(exec: Executor = db): Promise<ProjectsSummary> {
  const rows = await exec
    .select({ status: project.status, count: sql<number>`count(*)::int` })
    .from(project)
    .where(isLive(project))
    .groupBy(project.status);
  const counts = new Map<string, number>(rows.map((r) => [r.status, r.count]));
  // Emit every status in the enum order so the card's legend is stable and a zero still shows.
  const byStatus = PROJECT_STATUSES.map((status: ProjectStatus) => ({
    status,
    count: counts.get(status) ?? 0,
  }));
  const total = byStatus.reduce((sum, s) => sum + s.count, 0);
  return { total, byStatus };
}
