/** The `HomeNow` of a request: greeting, date and clock label in the team zone (never the browser's). */
import { isoDateIn } from '../metrics/dates';
import { getMetrics } from '../pm/metrics-env';
import { greetingFor } from './home.copy';
import type { HomeNow } from './home.dto';

const LOCALE = 'id-ID';

const formatter = (timeZone: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone, ...opts });

/** `07.30` in `timeZone`; id-ID writes the colon as a dot, which is how people here read the clock. */
export function clockLabel(at: Date, timeZone: string): string {
  return formatter(timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
}

/** Hour of the day (0-23) in `timeZone`. */
export function hourIn(at: Date, timeZone: string): number {
  const part = formatter(timeZone, { hour: 'numeric', hourCycle: 'h23' })
    .formatToParts(at)
    .find((p) => p.type === 'hour');
  return Number(part?.value ?? 0);
}

/** Weekday name of a calendar date (`YYYY-MM-DD`), e.g. "Selasa"; the date is read as plain UTC, so no zone shifts it. */
export function weekdayOf(day: string): string {
  return formatter('UTC', { weekday: 'long' }).format(new Date(`${day}T00:00:00Z`));
}

/** "Now" of one request; `at` is injectable so tests can place the request in time. */
export function homeNow(at: Date = new Date(), timeZone: string = getMetrics().TIME_ZONE): HomeNow {
  return {
    iso: at.toISOString(),
    today: isoDateIn(at, timeZone),
    timeZone,
    greeting: greetingFor(hourIn(at, timeZone)),
    dateLabel: formatter(timeZone, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(at),
    timeLabel: clockLabel(at, timeZone),
  };
}
