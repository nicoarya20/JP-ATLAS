/** Pure week boundary for "selesai minggu ini": Monday is the first day, same as `scheduleBounds`. */
import type { IsoDate } from './types';

const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 86_400_000;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The Monday on or before `today` (a Sunday belongs to the week that started six days earlier); throws on a malformed date. */
export function weekStartDate(today: IsoDate): IsoDate {
  const m = ISO_DATE_RE.exec(today);
  if (!m) throw new Error(`Invalid ISO date: ${JSON.stringify(today)}`);
  const day = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // getUTCDay: Sunday = 0, so (d + 6) % 7 is the number of days since Monday.
  const sinceMonday = (new Date(day).getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
  return new Date(day - sinceMonday * MS_PER_DAY).toISOString().slice(0, 10);
}
