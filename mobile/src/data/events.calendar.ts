/**
 * Events ② calendar from `GET /api/app/events?from=&to=` (map §1): the shown month or Mon–Sun week asked as one
 * window (past events included), its dots and spoken counts, and the picked date's agenda. The type and project
 * filters apply; Show and the search do not.
 */
import { useEffect } from 'react';

import type { ApiError } from '@/api/errors';

import { eventsWindowResource } from './events.api';
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
import { type EventsQuery, eventsParams, isFiltered } from './events.query';
import { type EventRow, rowOf, touches } from './events.view';
import type { ResourcePhase } from './resource';

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

export type EventsCalendarView = {
  /** "October 2026", or "Oct 5 – 11" for a week. */
  title: string;
  /** Empty cells before the first date, so it sits under its weekday (always 0 for a week). */
  lead: number;
  days: CalendarDay[];
  /** "Thu, Oct 8", the head of the agenda. */
  agendaDate: string;
  /** Events touching the picked date, by start. */
  agenda: EventRow[];
  phase: ResourcePhase;
  error: ApiError | null;
  /** The window has not come yet (or failed before it came). */
  blank: boolean;
  /** The type / project filters are on and the shown month or week has no event under them. */
  hiddenByFilters: boolean;
  /** Ask the shown window again ("Try again"). */
  retry: () => void;
};

/** Picked date after an arrow: a week moves 7 days, a month picks its 1st (today back in today's month). */
export const stepCalendar = (view: CalendarView, picked: string, by: number) =>
  view === 'week' ? addDays(picked, 7 * by) : stepMonth(picked, by);

/** The calendar around `picked`, kept up to date: fetches the window it shows. */
export function useEventsCalendar({
  view,
  picked,
  query,
}: {
  view: CalendarView;
  picked: string;
  query: EventsQuery;
}): EventsCalendarView {
  const dates = view === 'week' ? weekOf(picked) : monthOf(picked);
  const first = dates[0] ?? picked;
  const last = dates[dates.length - 1] ?? picked;
  const res = eventsWindowResource(first, last, eventsParams(query, '', { calendar: true }));
  const state = res.useSnapshot();
  useEffect(() => {
    void res.ensure();
  }, [res]);
  const items = [...(state.data?.items ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const days = dates.map((date): CalendarDay => {
    const n = items.filter((e) => touches(e, date)).length;
    return {
      date,
      day: dayOfMonth(date),
      label: n ? `${dateLabel(date)}, ${n} event${n === 1 ? '' : 's'}` : dateLabel(date),
      dots: n > 1 ? 2 : n ? 1 : 0,
      selected: date === picked,
    };
  });
  return {
    title: view === 'week' ? weekTitle(dates) : monthTitle(picked),
    lead: view === 'week' ? 0 : col(first),
    days,
    agendaDate: dateLabel(picked),
    agenda: items.filter((e) => touches(e, picked)).map(rowOf),
    phase: state.phase,
    error: state.error,
    blank: state.data === null,
    hiddenByFilters:
      isFiltered({ ...query, when: 0 }) && state.phase === 'ready' && items.length === 0,
    retry: () => void res.reload(),
  };
}
