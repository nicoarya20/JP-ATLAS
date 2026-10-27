// My calendar (prototype profile.calendar.dates.js): a Sunday-first week, as in iOS Calendar (the Events calendar is
// Monday-first), and the signed-in person's events placed on dates and minutes. ISO dates in UTC, like src/data/dates.ts.
import { toUtc } from './dates';
import { addDays, clockMinutes, monthTitle } from './events.dates';
import { type EventItem, eventEnd, eventStart } from './events.shared';
import { CLOCK } from './tasks.shared';

/** Height of one hour row, in points. */
export const HOUR_PX = 56;
/** A day without events opens scrolled to 8 AM. */
export const FIRST_MIN = 8 * 60;
/** The sample clock (9:41) as minutes after midnight: where the now line sits on today. */
export const NOW_MIN = (([h, m]) => h * 60 + m)(CLOCK.split(':').map(Number));

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

/** One event on the person's calendar: start/end in minutes after midnight, every = repeat interval in days. */
export type CalendarItem = {
  e: EventItem;
  date: string;
  start: number;
  end: number;
  every: number;
};

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

/** Clock text of a minute count: "9:41". */
export const clock = (min: number) =>
  `${Math.floor(min / 60) % 12 || 12}:${String(min % 60).padStart(2, '0')}`;

/**
 * Repeat interval in days: the prototype counts only "every N weeks", so a daily event shows once (ported as is,
 * docs/phase1-screens.more.md §8.1).
 */
function repeatDays(repeat: string | undefined): number {
  const m = /every (\d+ )?weeks?/.exec(repeat ?? '');
  return m ? Number(m[1] ?? 1) * 7 : 0;
}

/** Events `name` attends, placed on their first date with their start and end minute. */
export const eventsFor = (events: readonly EventItem[], name: string): CalendarItem[] =>
  events
    .filter((e) => e.attendees.includes(name))
    .map((e) => ({
      e,
      date: e.date,
      start: clockMinutes(eventStart(e)),
      end: clockMinutes(eventEnd(e)),
      every: repeatDays(e.repeat),
    }));

/** True when the item (or one of its repeats) falls on iso. */
export function occursOn(item: CalendarItem, iso: string): boolean {
  const n = Math.round((toUtc(iso).getTime() - toUtc(item.date).getTime()) / 864e5);
  return n === 0 || (item.every > 0 && n > 0 && n % item.every === 0);
}

/** The items on iso, earliest first. */
export const itemsOn = (items: readonly CalendarItem[], iso: string) =>
  items.filter((it) => occursOn(it, iso)).sort((a, b) => a.start - b.start);

/** Where the day grid opens: an hour before now (today), else before the first event, else before 8 AM. */
export function initialScroll(today: boolean, items: readonly CalendarItem[]): number {
  const focus = today ? NOW_MIN : (items[0]?.start ?? FIRST_MIN);
  return (Math.max(focus - 60, 0) / 60) * HOUR_PX;
}
