// Events Filter & sort: its options, the search text, and turning both into the query the server
// takes. Ported from the prototype's events.query.js; the query itself lives in the events query
// store (phase1-screens.md K4).
//
// Phase 2 moved the narrowing itself to the server: the tab, the kind, the project and the search
// text are query parameters of `GET /api/app/events`, and who may see which event is already
// decided by its SQL. What is left here is the option lists, the grouping (purely visual) and the
// translation into an `EventListKey`.
import type { EventListKey, EventTab } from './events.api';
import { eventsListResource } from './events.api';
import { groupLabel } from './events.dates';
import { kindOfType } from './events.map';
import { type EventItem, TYPES } from './events.shared';
import type { EventKind } from './events.wire';
import type { Role } from './sample';
import { createStore, useStore } from './store';
import { viewer as signedIn, someSamePerson } from './viewer';

/** Show options; index 0 (Upcoming) is the default. */
export const WHEN = ['Upcoming', 'Past'] as const;
const WHEN_PAST = 1;
/** Event type options; index 0 (All) keeps every type. */
export const TYPE_FILTERS = ['All', ...TYPES] as const;
/** Group by options; index 0 (Schedule) is the default. */
export const GROUPS = ['Schedule', 'Type'] as const;
export const GROUP_TYPE = 1;

export type EventsQuery = {
  /** Index in WHEN; null keeps past and upcoming alike, as the calendar does. */
  when: number | null;
  /** Index in TYPE_FILTERS. */
  type: number;
  /** Project id; '' = every project. */
  project: string;
  /** Index in GROUPS. */
  group: number;
};

/** Query a list starts with: upcoming events, every type, every project, grouped by schedule. */
export const BASE_QUERY: EventsQuery = { when: 0, type: 0, project: '', group: 0 };

/**
 * The search text of the list, kept in a store rather than in the screen: it is part of what the
 * server is asked for (`?q=`), so the fetch layer has to be able to read it.
 */
export const eventsSearchStore = createStore('');

/** Save the search text (the Events search box). */
export const setEventsSearch = (text: string) => eventsSearchStore.set(text);

/** The search text in a component. */
export const useEventsSearch = () => useStore(eventsSearchStore);

/**
 * Project options of the filter, built from the projects the loaded events belong to.
 *
 * Mobile has no project list of its own yet (that is the Projects module, a later wave), and
 * inventing one here would mean a second source of project names. The cost is that a project whose
 * events are all on a page not yet fetched is not offered; the filter still works for everything on
 * screen, and "All projects" always is.
 */
export function projectOptions(): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const item of eventsListResource.current()?.items ?? []) {
    if (item.project) seen.set(item.project.id, item.project.name);
  }
  return [
    { value: '', label: 'All projects' },
    ...[...seen].map(([value, label]) => ({ value, label })),
  ];
}

/**
 * True when the query narrows the events beyond the default (the dot on the filter icon): Past, a
 * type or a project. Upcoming is the default and grouping alone does not count; the calendar has no
 * Show, so pass `when: 0` there.
 */
export const isFiltered = (q: EventsQuery) => !!(q.when || q.type || q.project);

/** The `kind` the type filter asks for, or undefined for "All". */
export const kindOfFilter = (type: number): EventKind | undefined => {
  const label = TYPE_FILTERS[type];
  return !type || !label || label === 'All' ? undefined : kindOfType(label);
};

/** What `GET /api/app/events` is asked for by a query and a search text. */
export const listKeyOf = (q: EventsQuery, search: string): EventListKey => ({
  tab: (q.when === WHEN_PAST ? 'past' : 'upcoming') satisfies EventTab,
  kind: kindOfFilter(q.type),
  projectId: q.project || undefined,
  q: search.trim() || undefined,
});

export type EventGroup = { title: string; data: EventItem[] };

/** List sections: by schedule (each date's group, in data order) or by type (form order); empty groups are left out. */
export function groupEvents<T extends EventItem>(
  events: readonly T[],
  q: EventsQuery,
): { title: string; data: T[] }[] {
  const byType = q.group === GROUP_TYPE;
  const of = (e: EventItem): string => (byType ? e.type : groupLabel(e.date));
  const keys = byType
    ? TYPES.filter((t) => events.some((e) => e.type === t))
    : [...new Set(events.map(of))];
  return keys.map((title) => ({ title, data: events.filter((e) => of(e) === title) }));
}

/**
 * The events `role` sees: a Member only those they attend, everyone else all of them.
 *
 * Not used by the Events screens any more — the server's SQL decides visibility, and asking twice
 * would disagree with it. Still here for the Profile calendar, which reads the sample events until
 * its own wave ports it.
 */
export function eventsFor(role: Role, events: readonly EventItem[]): EventItem[] {
  if (role !== 'member') return [...events];
  const who = signedIn(role);
  return events.filter((e) => someSamePerson(e.attendees, who));
}
