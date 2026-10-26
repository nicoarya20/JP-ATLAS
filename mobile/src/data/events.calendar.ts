// Events ② calendar getter (prototype events.calendar.jsx): a month or week of dates with their dots and spoken
// counts, and the picked date's agenda. Re-exported by events.ts.

import { today } from './clock';
import {
  addDays,
  col,
  dateLabel,
  dayOfMonth,
  eventsOn,
  monthOf,
  monthTitle,
  occurrenceStatus,
  startMinutes,
  stepMonth,
  weekOf,
  weekTitle,
} from './events.dates';
import { applyQuery, type EventsQuery, eventsFor, isFiltered } from './events.query';
import { type EventHref, type EventItem, type EventStatusLabel, eventHref } from './events.shared';
import { eventsStore } from './events.store';
import type { Role } from './sample';

export type CalendarView = 'month' | 'week';

export type CalendarDay = {
  date: string;
  day: number;
  /** Accessibility label with the count the dots stand for: "Thu, Oct 8, 2 events" ("Thu, Oct 8" without events). */
  label: string;
  /** Dots under the number: none, one for one event, two for two or more. */
  dots: 0 | 1 | 2;
  selected: boolean;
};

export type AgendaItem = { event: EventItem; href: EventHref; status: EventStatusLabel };

export type EventsCalendarData = {
  /** "October 2026", or "Oct 5 – 11" for a week. */
  title: string;
  /** Empty cells before the first date, so it sits under its weekday (always 0 for a week). */
  lead: number;
  days: CalendarDay[];
  /** "Thu, Oct 8", the head of the agenda. */
  agendaDate: string;
  /** Events of the picked date by start time. */
  agenda: AgendaItem[];
  filtered: boolean;
  /** The type / project filters hide every event of the shown month or week (it has some without them). */
  hiddenByFilters: boolean;
};

/** Picked date after an arrow: a week moves 7 days, a month picks its 1st (today back in today's month). */
export const stepCalendar = (view: CalendarView, picked: string, by: number) =>
  view === 'week' ? addDays(picked, 7 * by) : stepMonth(picked, by);

/** Calendar of `role` around the picked date; past and upcoming alike (the query's Show is ignored). */
export function getEventsCalendar(
  role: Role,
  { view, picked = today(), query }: { view: CalendarView; picked?: string; query: EventsQuery },
): EventsCalendarData {
  const mine = eventsFor(role, eventsStore.get().list);
  const events = applyQuery(mine, { ...query, when: null });
  const dates = view === 'week' ? weekOf(picked) : monthOf(picked);
  const filtered = isFiltered({ ...query, when: 0 });
  const days = dates.map((date): CalendarDay => {
    const n = eventsOn(events, date).length;
    return {
      date,
      day: dayOfMonth(date),
      label: n ? `${dateLabel(date)}, ${n} event${n === 1 ? '' : 's'}` : dateLabel(date),
      dots: n > 1 ? 2 : n ? 1 : 0,
      selected: date === picked,
    };
  });
  const agenda = eventsOn(events, picked)
    .sort((a, b) => startMinutes(a) - startMinutes(b))
    .map((e) => ({ event: e, href: eventHref(e), status: occurrenceStatus(e, picked) }));
  return {
    title: view === 'week' ? weekTitle(dates) : monthTitle(picked),
    lead: view === 'week' ? 0 : col(dates[0] ?? picked),
    days,
    agendaDate: dateLabel(picked),
    agenda,
    filtered,
    hiddenByFilters:
      filtered &&
      days.every((d) => !d.dots) &&
      dates.some((date) => eventsOn(mine, date).length > 0),
  };
}
