/** Calendar-day helpers: "today" in the team zone and whole-day differences, both free of DST traps. */
import type { IsoDate } from './types';

export type { IsoDate } from './types';

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;
// Building a formatter is the slow part of Intl; one per zone is enough for list-sized loops.
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(tz, f);
  }
  return f;
}

/** The calendar date of instant `d` in zone `tz`; throws on an unknown zone or an invalid Date. */
export function isoDateIn(d: Date, tz: string): IsoDate {
  const parts = formatterFor(tz).formatToParts(d);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

function utcDay(date: IsoDate): number {
  const m = ISO_DATE_RE.exec(date);
  if (!m) throw new Error(`Invalid ISO date: ${JSON.stringify(date)}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY;
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier); month and leap-year safe. */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return utcDay(to) - utcDay(from);
}

/** `date` moved by `days` calendar days, month and leap-year safe. */
export function shiftDate(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid ISO date: ${JSON.stringify(date)}`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10) as IsoDate;
}

const OFFSET_RE = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/;
// Building a formatter is the slow part of Intl; the callers ask for the same zone every time.
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
 *
 * This is the one way the server turns a day into an instant. Do not reach for Postgres'
 * `AT TIME ZONE` on a `date`: a `date` is cast to `timestamptz` first, so the operator renders an
 * instant in the zone instead of reading a local wall clock, and the boundary comes out shifted by
 * the offset in the wrong direction.
 */
export function zonedDayStart(date: IsoDate, tz: string): Date {
  const utcMidnight = new Date(`${date}T00:00:00Z`).getTime();
  if (Number.isNaN(utcMidnight)) throw new Error(`Invalid ISO date: ${JSON.stringify(date)}`);
  const guess = utcMidnight - zoneOffsetMinutes(new Date(utcMidnight), tz) * 60_000;
  return new Date(utcMidnight - zoneOffsetMinutes(new Date(guess), tz) * 60_000);
}

/**
 * Years a user-entered calendar date may fall in. A typo such as 2062 for 2026 is not worth a
 * timeline 36 years wide, and 9999 made the project Gantt unreadable and slow to draw for everyone
 * (PD-01); 2000-2100 covers every plan anyone can sensibly make.
 */
export const CALENDAR_YEAR_MIN = 2000;
export const CALENDAR_YEAR_MAX = 2100;
export const CALENDAR_DATE_MIN: IsoDate = `${CALENDAR_YEAR_MIN}-01-01`;
export const CALENDAR_DATE_MAX: IsoDate = `${CALENDAR_YEAR_MAX}-12-31`;

/** True when `date` lies inside the accepted calendar range; ISO dates compare correctly as text. */
export function isInCalendarRange(date: IsoDate): boolean {
  return date >= CALENDAR_DATE_MIN && date <= CALENDAR_DATE_MAX;
}
