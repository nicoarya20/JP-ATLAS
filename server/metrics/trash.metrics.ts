/** Trash retention in calendar days of the team zone (R03 §3.6): "deleted 3 Oct → 26 days left" on 7 Oct. */
import { METRICS } from './config';
import { diffDays, isoDateIn } from './dates';
import type { IsoDate, MetricsConfig } from './types';

/** Whole days left before an item deleted at `deletedAt` can no longer be restored; never negative. */
export function trashDaysLeft(deletedAt: Date, now: Date, c: MetricsConfig = METRICS): number {
  const elapsed = diffDays(isoDateIn(deletedAt, c.TIME_ZONE), isoDateIn(now, c.TIME_ZONE));
  return Math.max(0, c.TRASH_RETENTION_DAYS - elapsed);
}

/** Whether the item may still be restored; with 30 days it expires on the 31st calendar day (day of deletion = day 1). */
export function isRestorable(deletedAt: Date, now: Date, c: MetricsConfig = METRICS): boolean {
  return trashDaysLeft(deletedAt, now, c) > 0;
}

/**
 * The last calendar day (team zone) an item deleted on `deletedOn` may be restored: the day of
 * deletion counts as day 1, so it is `deletedOn + TRASH_RETENTION_DAYS - 1`, matching `isRestorable`.
 */
export function lastRestorableDate(deletedOn: IsoDate, c: MetricsConfig = METRICS): IsoDate {
  return shiftDate(deletedOn, c.TRASH_RETENTION_DAYS - 1);
}

/**
 * The retention cut-off as an instant: midnight (team zone) of the oldest day still inside the
 * window, `today - (TRASH_RETENTION_DAYS - 1)`. An item is purgeable exactly when
 * `deletedAt < purgeBefore(now)`, which is the same boundary `isRestorable` draws — one definition
 * for the list filter, the restore update and the purge job (P8 §5).
 */
export function purgeBefore(now: Date, c: MetricsConfig = METRICS): Date {
  const oldestDay = shiftDate(isoDateIn(now, c.TIME_ZONE), -(c.TRASH_RETENTION_DAYS - 1));
  return zonedDayStart(oldestDay, c.TIME_ZONE);
}

/** `date` moved by `days` calendar days, month and leap-year safe. */
function shiftDate(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid ISO date: ${JSON.stringify(date)}`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const OFFSET_RE = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/;
// Building a formatter is the slow part of Intl; the purge job asks for the same zone every time.
const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

function offsetFormatterFor(tz: string): Intl.DateTimeFormat {
  let f = offsetFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
    offsetFormatters.set(tz, f);
  }
  return f;
}

/** Minutes zone `tz` is ahead of UTC at instant `at` (negative when behind). */
function zoneOffsetMinutes(at: Date, tz: string): number {
  const name = offsetFormatterFor(tz)
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value;
  const m = name ? OFFSET_RE.exec(name) : null;
  if (!m) throw new Error(`Unsupported time zone offset: ${JSON.stringify(name ?? tz)}`);
  return m[1] ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/**
 * The instant calendar day `date` starts in zone `tz`. The offset is read twice because the first
 * guess is taken at UTC midnight, which can sit on the other side of a DST change than the result.
 */
function zonedDayStart(date: IsoDate, tz: string): Date {
  const utcMidnight = new Date(`${date}T00:00:00Z`).getTime();
  if (Number.isNaN(utcMidnight)) throw new Error(`Invalid ISO date: ${JSON.stringify(date)}`);
  const guess = utcMidnight - zoneOffsetMinutes(new Date(utcMidnight), tz) * 60_000;
  return new Date(utcMidnight - zoneOffsetMinutes(new Date(guess), tz) * 60_000);
}
