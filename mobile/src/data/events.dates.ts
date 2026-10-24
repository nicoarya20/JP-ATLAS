// Calendar maths and date labels of the Events module on ISO dates ("2026-10-07"), ported from the prototype's
// events.calendar.jsx / events.query.js / events.store.js. Labels come from fixed English arrays and the maths runs in
// UTC, never toLocaleDateString or the device clock, so Hermes, Jest and every time zone give the same strings.
import {
  daysBetween,
  daysSinceMonday,
  daysToSunday,
  monthDay,
  sameMonth,
  weekdayMonthDay,
} from './dates';
import { type EventItem, eventStart, eventStatus, REPEAT_DAYS } from './events.shared';
import { TODAY } from './sample';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Weekday heads of the calendar grid, Monday first. */
export const WEEKDAY_HEADS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// TODO(events): pakai toUtc dari dates.ts setelah diekspor Sesi B
/** [year, month 1–12, day] of an ISO date. */
function partsOf(iso: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Not an ISO date (YYYY-MM-DD): ${iso}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** ISO date of a UTC year, month (0-based, may overflow) and day (may overflow), like Date.UTC. */
const isoOf = (year: number, month0: number, day: number) =>
  new Date(Date.UTC(year, month0, day)).toISOString().slice(0, 10);

/** The date n days after iso (before it when n < 0). */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = partsOf(iso);
  return isoOf(y, m - 1, d + n);
}

/** Day of the month (the number in a grid cell). */
export const dayOfMonth = (iso: string) => partsOf(iso)[2];

/** Column of a date in a Monday-first week, Mon = 0. */
export const col = daysSinceMonday;

/** Every date of iso's month. */
export function monthOf(iso: string): string[] {
  const [y, m] = partsOf(iso);
  const length = dayOfMonth(isoOf(y, m, 0));
  return Array.from({ length }, (_, i) => isoOf(y, m - 1, i + 1));
}

/** The Mon–Sun week holding iso (it may run into the next or previous month). */
export const weekOf = (iso: string) =>
  Array.from({ length: 7 }, (_, i) => addDays(iso, i - col(iso)));

/** Month arrow: the 1st of the month `by` months away, or today when that is today's month. */
export function stepMonth(iso: string, by: number): string {
  const [y, m] = partsOf(iso);
  const first = isoOf(y, m - 1 + by, 1);
  return sameMonth(first, TODAY) ? TODAY : first;
}

/** "Thu, Oct 8" (the prototype's en-US weekday/month/day label). */
export const dateLabel = weekdayMonthDay;

/** "October 2026". */
export function monthTitle(iso: string): string {
  const [y, m] = partsOf(iso);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** Title of a week's dates: "Oct 5 – 11", or "Oct 26 – Nov 1" when it crosses into the next month. */
export function weekTitle(days: readonly string[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) throw new Error('A week title needs at least one date');
  return `${monthDay(first)} – ${sameMonth(first, last) ? dayOfMonth(last) : monthDay(last)}`;
}

/** Short day of an event's date in a card: "Today", else "Thu 8". */
export function dayLabel(iso: string): string {
  if (iso === TODAY) return 'Today';
  const [y, m, d] = partsOf(iso);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d}`;
}

/** List group of a date: Earlier · / Today · / Tomorrow · <date>, This week (up to Sunday), else Later. */
export function groupLabel(iso: string): string {
  const gap = daysBetween(TODAY, iso);
  if (gap < 0) return `Earlier · ${dateLabel(iso)}`;
  if (gap === 0) return `Today · ${dateLabel(iso)}`;
  if (gap === 1) return `Tomorrow · ${dateLabel(iso)}`;
  return gap <= daysToSunday(TODAY) ? 'This week' : 'Later';
}

/** Minutes since midnight of a clock time ("2:00 PM" → 840). */
export function clockMinutes(time: string): number {
  const m = /^(\d+):(\d+) (AM|PM)$/.exec(time);
  if (!m) throw new Error(`Not a clock time (h:mm AM/PM): ${time}`);
  return (Number(m[1]) % 12) * 60 + Number(m[2]) + (m[3] === 'PM' ? 720 : 0);
}

/** Minutes since midnight of an event's start, to order the agenda. */
export const startMinutes = (e: EventItem) => clockMinutes(eventStart(e));

/** An event's own date (a recurring event's first occurrence). */
export const firstDate = (e: EventItem) => e.date;

/**
 * True when an event falls on iso: its own date, or (recurring) every REPEAT_DAYS after it, into any later month.
 * A series canceled as a whole stops repeating; its own date stays, marked Canceled.
 */
export function occursOn(e: EventItem, iso: string): boolean {
  const gap = daysBetween(firstDate(e), iso);
  const step = e.canceled && !e.canceled.once ? 0 : e.repeat ? REPEAT_DAYS[e.repeat] : 0;
  return gap === 0 || (step > 0 && gap > 0 && gap % step === 0);
}

/** Events falling on iso, for the calendar dots and agenda. */
export const eventsOn = (events: readonly EventItem[], iso: string) =>
  events.filter((e) => occursOn(e, iso));

/** Status of one calendar occurrence: when only one occurrence was canceled, the later dates are still Upcoming. */
export const occurrenceStatus = (e: EventItem, iso: string) =>
  e.canceled?.once && iso !== firstDate(e) ? 'Upcoming' : eventStatus(e);
