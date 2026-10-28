// My calendar (prototype profile.calendar.dates.js): a Sunday-first week, as in iOS Calendar (the Events calendar is
// Monday-first), and labels for its days and hours. ISO dates in UTC, like src/data/dates.ts. The prototype's now line
// and "every N weeks" repeats are gone: the server sends no instant for "now" and has no repeats (GAP C-2).
import { toUtc } from './dates';
import { addDays, monthTitle } from './events.dates';

/** Height of one hour row, in points. */
export const HOUR_PX = 56;
/** A day without events opens scrolled to 8 AM. */
export const FIRST_MIN = 8 * 60;
export const MIN_PER_DAY = 24 * 60;

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Day of the week, Sunday = 0. */
export const weekday = (iso: string) => toUtc(iso).getUTCDay();

/** The seven days (Sunday first) of the week holding iso. */
export const weekOf = (iso: string) =>
  Array.from({ length: 7 }, (_, i) => addDays(iso, i - weekday(iso)));

/** "October 2026". */
export const monthLabel = monthTitle;

/** "Wednesday, Oct 7, 2026". */
export function dayLabel(iso: string): string {
  const d = toUtc(iso);
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Hour row label: "12 AM", "9 AM", "12 PM", "3 PM". */
export const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

/** Where the day grid opens: an hour before the first event, else before 8 AM. */
export function initialScroll(firstStart: number | undefined): number {
  return (Math.max((firstStart ?? FIRST_MIN) - 60, 0) / 60) * HOUR_PX;
}
