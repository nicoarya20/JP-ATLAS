/**
 * The whole Admin Beranda in one call (P11 AD-14): six aggregates, each scoped to the workspace an
 * Admin oversees and each wrapped so one failing section answers `{ ok: false }` while the rest load.
 * Mirrors `server/home/home.service.ts` (the Beranda produk) — same soft-fail contract, workspace scope.
 *
 * "Today" (for overdue) and "now" (for the agenda) come from the server clock in the team zone; `at`
 * is injectable so tests can place the request in time.
 */
import { db } from '../../db';
import { logger } from '../../logger';
import { isoDateIn } from '../../metrics/dates';
import { getMetrics } from '../../pm/metrics-env';
import type { Executor } from '../../pm/tx';
import { getAgenda } from './overview.agenda.query';
import type { OverviewData, OverviewNow, Widget } from './overview.dto';
import { getMembers, getPendingApprovals } from './overview.members.query';
import { getProjectsByStatus } from './overview.projects.query';
import { getRoleChanges } from './overview.roles.query';
import { getOverdueTasks } from './overview.tasks.query';

/** Runs one section; a failure is logged (never sent) and shows up as `{ ok: false }` on that card only. */
async function safely<T>(section: string, run: () => Promise<T>): Promise<Widget<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (err) {
    logger.error({ err, section }, 'admin overview section failed');
    return { ok: false };
  }
}

/** "Now" of one request in the team zone; the browser's clock never decides what is overdue or upcoming. */
function overviewNow(at: Date, timeZone: string): OverviewNow {
  return { iso: at.toISOString(), today: isoDateIn(at, timeZone), timeZone };
}

export async function getOverview(at: Date = new Date(), exec: Executor = db): Promise<OverviewData> {
  const now = overviewNow(at, getMetrics().TIME_ZONE);
  const [pending, members, projects, overdue, agenda, roles] = await Promise.all([
    safely('pending', () => getPendingApprovals(exec)),
    safely('members', () => getMembers(exec)),
    safely('projects', () => getProjectsByStatus(exec)),
    safely('overdue', () => getOverdueTasks(now.today, exec)),
    safely('agenda', () => getAgenda(at, exec)),
    safely('roles', () => getRoleChanges(exec)),
  ]);
  return { now, pending, members, projects, overdue, agenda, roles };
}
