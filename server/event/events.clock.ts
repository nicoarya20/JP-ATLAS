/**
 * Server-only: the `EventClock` of one request (P6 §6 E-06), the twin of `server/task/task.clock.ts`.
 * "Now", "today" and the team zone are read once per request and passed down, so no query calls
 * `new Date()` itself and a day boundary is never cached between requests.
 *
 * The zone is the team's single `APP_TIME_ZONE` (Q1: everyone is on one zone, there is no per-user
 * setting), which is what turns "today and tomorrow" of the Agenda into instants Postgres can cut on.
 */
import { isoDateIn } from '../metrics/dates';
import { getMetrics } from '../pm/metrics-env';
import type { EventClock } from './events.dto';

/** "Now", "today" and the team zone; `now` is injectable so a test can place a request in time. */
export function requestEventClock(now: Date = new Date()): EventClock {
  const timeZone = getMetrics().TIME_ZONE;
  return { now, today: isoDateIn(now, timeZone), timeZone };
}
