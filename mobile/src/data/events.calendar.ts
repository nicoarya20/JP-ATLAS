// Events ② calendar getter (prototype events.calendar.jsx): a month or week of dates with their
// dots and spoken counts, and the picked date's agenda. Re-exported by events.ts.
//
// The window comes from the server: `GET /api/app/events?from=&to=` (GAP-A9, built for this).
// The tabs cannot stand in for it — they cut on *now*, so the running month is always half
// missing — and the dates themselves are still worked out here, because a grid is layout.
import { today } from './clock';
import { type EventCalendarKey, eventsWindowResource } from './events.api';
import {
  addDays,
  col,
  dateLabel,
  dayOfMonth,
  monthOf,
  monthTitle,
  stepMonth,
  weekOf,
  weekTitle,
} from './events.dates';
import { type ServerEvent, toServerEvent } from './events.map';
import { type EventsQuery, isFiltered, kindOfFilter } from './events.query';
import { type EventHref, type EventStatusLabel, eventStatus } from './events.shared';
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

export type AgendaItem = { event: ServerEvent; href: EventHref; status: EventStatusLabel };

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
  /** The filters leave nothing in the shown month or week; Reset filters takes the agenda's place. */
  hiddenByFilters: boolean;
  /**
   * The window held more events than one read may carry, so the dots undercount. Said out loud
   * rather than drawn as if it were the whole month.
   */
  truncated: boolean;
};

/** Picked date after an arrow: a week moves 7 days, a month picks its 1st (today back in today's month). */
export const stepCalendar = (view: CalendarView, picked: string, by: number) =>
  view === 'week' ? addDays(picked, 7 * by) : stepMonth(picked, by);

/** The dates a view shows around `picked`. */
export const calendarDates = (view: CalendarView, picked: string): string[] =>
  view === 'week' ? weekOf(picked) : monthOf(picked);

/** What `GET /api/app/events` is asked for by the shown window and the filters (Show is ignored). */
export function windowKeyOf(view: CalendarView, picked: string, q: EventsQuery): EventCalendarKey {
  const dates = calendarDates(view, picked);
  return {
    from: dates[0] ?? picked,
    to: dates[dates.length - 1] ?? picked,
    kind: kindOfFilter(q.type),
    projectId: q.project || undefined,
  };
}

/** Calendar around the picked date; past and upcoming alike (the query's Show is ignored). */
export function getEventsCalendar(
  _role: Role,
  { view, picked = today(), query }: { view: CalendarView; picked?: string; query: EventsQuery },
): EventsCalendarData {
  const held = eventsWindowResource.current();
  const events = (held?.items ?? []).map((item) => toServerEvent(item));
  const dates = calendarDates(view, picked);
  const filtered = isFiltered({ ...query, when: 0 });
  const onDay = (date: string) => events.filter((e) => e.date === date);
  const days = dates.map((date): CalendarDay => {
    const n = onDay(date).length;
    return {
      date,
      day: dayOfMonth(date),
      label: n ? `${dateLabel(date)}, ${n} event${n === 1 ? '' : 's'}` : dateLabel(date),
      dots: n > 1 ? 2 : n ? 1 : 0,
      selected: date === picked,
    };
  });
  const agenda = onDay(picked)
    // By the instant, not by the label: "2:00" has lost its AM/PM, and ISO instants sort as text.
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((e) => ({ event: e, href: `/events/${e.id}` as EventHref, status: eventStatus(e) }));
  return {
    title: view === 'week' ? weekTitle(dates) : monthTitle(picked),
    lead: view === 'week' ? 0 : col(dates[0] ?? picked),
    days,
    agendaDate: dateLabel(picked),
    agenda,
    filtered,
    // One read, not two: asking the server again without the filters to prove the month has
    // something would double every calendar fetch. "Filters on and nothing here" is enough to
    // offer Reset filters, which is all this flag does.
    hiddenByFilters: filtered && !!held && days.every((d) => !d.dots),
    truncated: held?.truncated ?? false,
  };
}
