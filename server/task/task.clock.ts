/** Server-only: the `TaskClock` of one request, "today" taken in the team zone (APP_TIME_ZONE). */
import { isoDateIn } from '../metrics/dates';
import { getMetrics } from '../pm/metrics-env';
import type { TaskClock } from './task.dto';

/** "Now" and "today" in the team zone, read per request so a day boundary is never cached. */
export function requestClock(now: Date = new Date()): TaskClock {
  return { now, today: isoDateIn(now, getMetrics().TIME_ZONE) };
}
