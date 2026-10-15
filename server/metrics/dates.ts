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
