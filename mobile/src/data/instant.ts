/**
 * The one way to turn an *instant* from the server into a date or a time (K2).
 *
 * The server sends two different kinds of value, and only one of them is dangerous:
 *
 * - **Dates** (`YYYY-MM-DD`): a task's `due`, an event's `date`. Date-to-date maths on these lives
 *   in `dates.ts` and `events.dates.ts`, which anchor them at midnight UTC purely as stable
 *   arithmetic — the anchors cancel out and the result is a date string again. That is correct as
 *   it stands; do not route it through here.
 * - **Instants** (ISO datetimes): `createdAt`, `updatedAt`, `timeline.at`, `event.startsAt` and
 *   `endsAt`, `canceledAt`. A single point in time, which only becomes a day or a clock time once
 *   you pick a zone. Picking the wrong one is silent: an event at 06.00 WIB reads as the previous
 *   day in UTC, and a phone set to another zone shows a time that is hours off.
 *
 * So every instant goes through this module, with the team's zone from the server's clock (K1) —
 * never UTC, never the device's zone. To label an instant with one of the date helpers, convert it
 * here first and pass the resulting date on: `monthDay(instantDate(task.createdAt))`.
 */
import { teamTimeZone } from './clock';

/** An ISO datetime from the server; the zone it carries is the server's, not the one we display in. */
export type Instant = string;

/** An instant split into the pieces a screen shows, all in one zone. */
export type InstantParts = {
  /** `2026-10-27`, the calendar day in that zone. */
  date: string;
  /** `06:30`, 24-hour, in that zone. */
  time: string;
  year: number;
  /** 1-12. */
  month: number;
  day: number;
  hour: number;
  minute: number;
};

// Building a formatter is expensive and these run per row; one per zone is enough.
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached) return cached;
  // `formatToParts` instead of a locale pattern: the pieces are read by name, so no locale or ICU
  // version can reorder them. `h23` keeps midnight at 00, which `hour12: false` reports as 24 in
  // some ICU builds.
  const made = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  formatters.set(timeZone, made);
  return made;
}

/** Forget the cached formatters. test-only */
export const resetInstantFormatters = () => formatters.clear();

function msOf(instant: Instant): number {
  const ms = new Date(instant).getTime();
  if (Number.isNaN(ms)) throw new Error(`Not an ISO datetime: ${instant}`);
  return ms;
}

/**
 * An instant as it reads in `timeZone` (the team's zone by default, from the server's clock).
 * Throws when the clock has not loaded, rather than silently using the device's zone.
 */
export function instantParts(instant: Instant, timeZone: string = teamTimeZone()): InstantParts {
  const parts = formatterFor(timeZone).formatToParts(new Date(msOf(instant)));
  const get = (type: Intl.DateTimeFormatPartTypes): string => {
    const found = parts.find((p) => p.type === type);
    if (!found)
      throw new Error(
        `This runtime's Intl.DateTimeFormat gave no "${type}" for zone ${timeZone}; instants ` +
          'cannot be shown in the team zone without it.',
      );
    return found.value;
  };
  const [year, month, day, hour, minute] = (
    ['year', 'month', 'day', 'hour', 'minute'] as const
  ).map((type) => Number(get(type)));
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
    year,
    month,
    day,
    hour,
    minute,
  };
}

/** The calendar day an instant falls on, as `YYYY-MM-DD` in the team's zone. */
export const instantDate = (instant: Instant, timeZone?: string): string =>
  instantParts(instant, timeZone).date;

/** The clock time of an instant, as `06:30` in the team's zone. */
export const instantTime = (instant: Instant, timeZone?: string): string =>
  instantParts(instant, timeZone).time;

/** Whether an instant falls on `date` (an ISO date, usually the clock's `today`) in the team's zone. */
export const instantIsOn = (instant: Instant, date: string, timeZone?: string): boolean =>
  instantDate(instant, timeZone) === date;

/** Instants, newest first; comparison is on the instant itself, so no zone is involved. */
export const byNewestInstant = (a: Instant, b: Instant): number => msOf(b) - msOf(a);
