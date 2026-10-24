// Events data per screen, the swap point to the API: today each getter reads the in-memory events store
// (events.store.ts), in Phase 2 it becomes a fetch of /api/app/events… returning the same shape. Screens re-render
// through useEventsState() / useEventsQuery() and call these getters for what they show. Outcomes and results:
// events.results.ts.
import {
  addDays,
  col,
  dateLabel,
  dayLabel,
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
import {
  applyQuery,
  type EventGroup,
  type EventsQuery,
  eventsFor,
  groupEvents,
  isFiltered,
  searchEvents,
} from './events.query';
import {
  DEFAULT_PROJECT,
  type EventHref,
  type EventItem,
  type EventStatusLabel,
  eventEnd,
  eventHref,
  eventProject,
  eventStart,
  eventStatus,
  isConfirmed,
  TYPES,
} from './events.shared';
import { type EventFields, eventsStore, findEvent } from './events.store';
import { me } from './people';
import { type Role, TODAY } from './sample';

/** A card of the list: where it opens, its status pill, the time tile and which results button it has. */
export type EventCard = {
  event: EventItem;
  href: EventHref;
  status: EventStatusLabel;
  /** Time tile: the start time in the Today / Tomorrow groups, else the day ("Thu 8"). */
  when: string;
  /** Done events: View results (confirmed, or a Member) or Check results (PM / Admin, not yet confirmed). */
  results: 'view' | 'check' | null;
};

export type EventsListData = {
  groups: { title: string; data: EventCard[] }[];
  /** The filter icon's dot. */
  filtered: boolean;
  /** Nothing to list before any filter: a Member who attends no event (events.empty). */
  empty: boolean;
};

function cardOf(role: Role, e: EventItem, group: string): EventCard {
  const results =
    e.status !== 'Done' ? null : isConfirmed(e) || role === 'member' ? 'view' : 'check';
  const when = /^(Today|Tomorrow)/.test(group) ? e.time : dayLabel(e.date);
  return { event: e, href: eventHref(e), status: eventStatus(e), when, results };
}

/** Events list of `role`: the store's events narrowed by the query and the search text, grouped. */
export function getEventsList(
  role: Role,
  { query, search = '' }: { query: EventsQuery; search?: string },
): EventsListData {
  const mine = eventsFor(role, eventsStore.get().list);
  const groups = groupEvents(searchEvents(applyQuery(mine, query), search), query);
  return {
    groups: groups.map((g: EventGroup) => ({
      title: g.title,
      data: g.data.map((e) => cardOf(role, e, g.title)),
    })),
    filtered: isFiltered(query),
    empty: mine.length === 0,
  };
}

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
  { view, picked = TODAY, query }: { view: CalendarView; picked?: string; query: EventsQuery },
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

export type EventAttendee = { name: string; creator: boolean; noteTaker: boolean };

export type EventDetailData = {
  event: EventItem;
  status: EventStatusLabel;
  project: string;
  /** May change the event: everyone but a Member, or the Member who created it. */
  editor: boolean;
  /** ⋯ items for an editor: Cancel event (not yet canceled) and Move to Archive; none for others. */
  menu: ('cancel' | 'archive')[];
  /** Why the viewer may (or may not) change it; null for a PM who did not create it. */
  access: 'creator' | 'admin' | 'member' | null;
  /** Creator first. */
  attendees: EventAttendee[];
};

/** Detail of event id for `role`; null when no such event. */
export function getEventDetail(role: Role, id: string): EventDetailData | null {
  const e = findEvent(id);
  if (!e) return null;
  const name = me(role).name;
  const editor = role !== 'member' || name === e.creator;
  const access =
    name === e.creator
      ? 'creator'
      : role === 'admin'
        ? 'admin'
        : role === 'member'
          ? 'member'
          : null;
  const people = [e.creator, ...e.attendees.filter((n) => n !== e.creator)];
  return {
    event: e,
    status: eventStatus(e),
    project: eventProject(e),
    editor,
    menu: !editor ? [] : e.canceled ? ['archive'] : ['cancel', 'archive'],
    access,
    attendees: people.map((n) => ({
      name: n,
      creator: n === e.creator,
      noteTaker: n === e.noteTaker,
    })),
  };
}

/** Initial New event / Edit form: event id filled in, or a blank Meeting tomorrow 10–11 AM with me attending. */
export function getEventForm(
  role: Role,
  id?: string,
): { fields: EventFields; creator: string } | null {
  const name = me(role).name;
  if (id == null) {
    return {
      creator: name,
      fields: {
        title: '',
        date: addDays(TODAY, 1),
        start: '10:00 AM',
        end: '11:00 AM',
        mode: 'In person',
        place: '',
        attendees: [name],
        type: TYPES[0],
        project: DEFAULT_PROJECT,
        agenda: [],
        repeat: '',
      },
    };
  }
  const e = findEvent(id);
  if (!e) return null;
  return {
    creator: e.creator,
    fields: {
      title: e.title,
      date: e.date,
      start: eventStart(e),
      end: eventEnd(e),
      mode: e.mode,
      place: e.place === 'Online' ? '' : e.place,
      attendees: e.attendees,
      type: e.type,
      project: e.project ?? DEFAULT_PROJECT,
      agenda: e.agenda ?? [],
      repeat: e.repeat ?? '',
    },
  };
}
