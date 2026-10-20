/**
 * The whole Beranda in one call (P4 §5): every widget is read by its own aggregate query (no query per
 * row), scoped to what the caller may see, and wrapped so one failing section answers `{ ok: false }`
 * while the rest still load. "Today", the greeting and the briefing time all come from the server clock.
 */
import type { Principal } from '../access/types';
import { db } from '../db';
import { logger } from '../logger';
import type { Executor } from '../pm/tx';
import { getActivity } from './home.activity.query';
import { getAgenda } from './home.agenda.query';
import { composeAsk } from './home.ask';
import { getBusiest, getLongestOverdue } from './home.ask.query';
import { getDone } from './home.done.query';
import type {
  HomeAgendaItem,
  HomeBriefing,
  HomeData,
  HomeFocus,
  HomeNow,
  HomeProject,
  Widget,
} from './home.dto';
import { getFocus } from './home.focus.query';
import { homeNow } from './home.now';
import { getProjects } from './home.projects.query';
import { getCounters } from './home.stats.query';
import { composeBriefing } from './home.summary';

/** Runs one section; a failure is logged (never sent) and shows up as `{ ok: false }` on that card only. */
async function safely<T>(section: string, run: () => Promise<T>): Promise<Widget<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (err) {
    logger.error({ err, section }, 'home section failed');
    return { ok: false };
  }
}

const isAttention = (p: HomeProject) => p.condition === 'at_risk' || p.condition === 'off_track';

/** The briefing needs my tasks and my projects; the agenda only adds a count, so a missing agenda is read as none. */
function briefingOf(
  now: HomeNow,
  focus: Widget<HomeFocus>,
  projects: Widget<HomeProject[]>,
  agenda: Widget<HomeAgendaItem[]>,
): Widget<HomeBriefing> {
  if (!focus.ok || !projects.ok) return { ok: false };
  const oldest = focus.data.items.find((i) => i.group === 'overdue');
  // The list is worst first, so the first one that needs a look is the one to name.
  const attention = projects.data.find(isAttention);
  const lines = composeBriefing({
    overdueTotal: focus.data.overdueTotal,
    oldestOverdue: oldest ? { title: oldest.title, days: oldest.overdueDays ?? 0 } : null,
    awaitingReviewTotal: focus.data.awaitingReviewTotal,
    todayTasks: focus.data.todayTotal,
    todayEvents: agenda.ok ? agenda.data.filter((e) => e.day === 'today').length : 0,
    attention:
      attention?.condition != null
        ? { name: attention.name, condition: attention.condition, reason: attention.reason }
        : null,
  });
  return { ok: true, data: { lines, updatedLabel: now.timeLabel } };
}

/** Everything the Beranda shows for `p`; `at` is injectable so tests can place the request in time. */
export async function getHome(
  p: Principal,
  at: Date = new Date(),
  exec: Executor = db,
): Promise<HomeData> {
  const now = homeNow(at);
  const clock = { now: at, today: now.today, timeZone: now.timeZone };
  const [counters, focus, projects, done, agenda, activity, overdue, busiest] = await Promise.all([
    safely('counters', () => getCounters(p, exec)),
    safely('focus', () => getFocus(p, clock, exec)),
    safely('projects', () => getProjects(p, at, exec)),
    safely('done', () => getDone(p, clock, exec)),
    safely('agenda', () => getAgenda(p, clock, exec)),
    safely('activity', () => getActivity(p, exec)),
    safely('ask.overdue', () => getLongestOverdue(p, now.today, exec)),
    safely('ask.busiest', () => getBusiest(p, exec)),
  ]);
  const ask: HomeData['ask'] =
    projects.ok && overdue.ok && busiest.ok
      ? {
          ok: true,
          data: composeAsk({
            projects: projects.data,
            overdue: overdue.data,
            busiest: busiest.data,
            today: now.today,
          }),
        }
      : { ok: false };
  return {
    now,
    briefing: briefingOf(now, focus, projects, agenda),
    counters,
    focus,
    done,
    projects,
    agenda,
    activity,
    ask,
  };
}
