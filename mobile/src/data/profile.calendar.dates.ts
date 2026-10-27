// My calendar: a Sunday-first week, as in iOS Calendar (the Events calendar is Monday-first), and
// my events placed on dates and minutes. ISO dates in UTC, like src/data/dates.ts.
//
// Two things the prototype did are gone, because the server cannot back either:
//
// - **The red "now" line.** It sat at the sample's frozen 9:41. The server's clock gives this app
//   today's *date* and the team's zone but no instant (`SessionClock`), so there is no honest
//   minute to draw it at — and a line drawn at the wrong minute is worse than no line, because it
//   is read as the time. Listed in mobile/docs/phase2-gap-disembunyikan.md.
// - **Repeats.** The prototype expanded "every N weeks" itself; recurrence is a deferred server GAP
//   (K6 group B), so an event falls on its own day and no other.
import { toUtc } from './dates';
import { addDays, clockMinutes, monthTitle } from './events.dates';
import { type EventItem, eventEnd, eventStart } from './events.shared';

/** Height of one hour row, in points. */
export const HOUR_PX = 56;
/** A day without events opens scrolled to 8 AM. */
export const FIRST_MIN = 8 * 60;

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

/** One event on my calendar: its day, and start/end in minutes after midnight. */
export type CalendarItem = {
  e: EventItem;
  date: string;
  start: number;
  end: number;
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

/**
 * Events placed on their day with their start and end minute. The rows are already mine — the
 * server said so per row (`participants.isParticipant`) — so nothing is filtered by person here.
 */
export const eventsFor = (events: readonly EventItem[]): CalendarItem[] =>
  events.map((e) => ({
    e,
    date: e.date,
    start: clockMinutes(eventStart(e)),
    end: clockMinutes(eventEnd(e)),
  }));

/** The items on iso, earliest first. */
export const itemsOn = (items: readonly CalendarItem[], iso: string) =>
  items.filter((it) => it.date === iso).sort((a, b) => a.start - b.start);

/** Where the day grid opens: an hour before the first event of the day, else before 8 AM. */
export function initialScroll(items: readonly CalendarItem[]): number {
  const focus = items[0]?.start ?? FIRST_MIN;
  return (Math.max(focus - 60, 0) / 60) * HOUR_PX;
}
