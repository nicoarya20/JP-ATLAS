/**
 * Pure time helpers of the event form: a date and a clock time typed in the team zone become the ISO
 * instant the API stores. The browser's own zone and clock never take part (R03 D9): a phone set to
 * another zone still creates "09.00" as 09.00 WIB (`APP_TIME_ZONE`), the way the list prints it.
 */
import type { IsoDate } from '@server/metrics/dates';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MINUTES_PER_DAY = 1_440;
const MS_PER_SECOND = 1_000;

const clocks = new Map<string, Intl.DateTimeFormat>();
function clockIn(timeZone: string): Intl.DateTimeFormat {
  let f = clocks.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    clocks.set(timeZone, f);
  }
  return f;
}

/** How far the zone's wall clock is ahead of UTC at `instant` (ms); WIB is always +7 hours. */
function offsetAt(instant: number, timeZone: string): number {
  const parts = clockIn(timeZone).formatToParts(new Date(instant));
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return wall - Math.floor(instant / MS_PER_SECOND) * MS_PER_SECOND;
}

/** `HH:mm` text to minutes since midnight; null when it is not a clock time (empty, `24:00`, `9:5`). */
export function timeToMinutes(time: string): number | null {
  const m = TIME_RE.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * `time` plus `minutes`, still on the same day; null when either is unusable or the sum would pass
 * midnight (the form has one date, so an event that ends the next day is not offered a guess).
 */
export function addMinutes(time: string, minutes: number): string | null {
  const from = timeToMinutes(time);
  if (from === null) return null;
  const to = from + minutes;
  if (to < 0 || to >= MINUTES_PER_DAY) return null;
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${pad(Math.floor(to / 60))}:${pad(to % 60)}`;
}

/**
 * The instant at which the wall clock of `timeZone` reads `date` + `time`, as an ISO string; null for
 * a date or time that does not exist (`2026-02-30`, `25:00`). The offset is read twice so a zone
 * whose offset changes near that moment lands on the right side of it; WIB never changes.
 */
export function zonedInstant(
  date: IsoDate | string,
  time: string,
  timeZone: string,
): string | null {
  const d = DATE_RE.exec(date);
  const t = TIME_RE.exec(time);
  if (!d || !t) return null;
  const [year, month, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const wall = Date.UTC(year, month - 1, day, Number(t[1]), Number(t[2]));
  const check = new Date(wall);
  // `Date.UTC` rolls 30 Feb over to 2 Mar; a date that changed on the way is not a date.
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  const first = wall - offsetAt(wall, timeZone);
  return new Date(wall - offsetAt(first, timeZone)).toISOString();
}
