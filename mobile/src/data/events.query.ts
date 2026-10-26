// Events Filter & sort: its options, applying a query to the events, the search field, and grouping the list.
// Ported from the prototype's events.query.js; the query itself lives in the events store (phase1-screens.md K4).
import { daysBetween } from './dates';
import { groupLabel } from './events.dates';
import { type EventItem, eventProject, TYPES } from './events.shared';
import { me } from './people';
import { PROJECTS, type Role, TODAY } from './sample';

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

/** Project picker options of the filter. */
export const projectOptions = () => [
  { value: '', label: 'All projects' },
  ...PROJECTS.map((p) => ({ value: p.id, label: p.name })),
];

/**
 * True when the query narrows the events beyond the default (the dot on the filter icon): Past, a type or a project.
 * Upcoming is the default and grouping alone does not count; the calendar has no Show, so pass `when: 0` there.
 */
export const isFiltered = (q: EventsQuery) => !!(q.when || q.type || q.project);

/** Past: already done, or its first date is before today; everything else is upcoming. */
export const isPast = (e: EventItem) => e.status === 'Done' || daysBetween(TODAY, e.date) < 0;

/** The events `role` sees: a Member only those they attend, everyone else all of them. */
export function eventsFor(role: Role, events: readonly EventItem[]): EventItem[] {
  if (role !== 'member') return [...events];
  const name = me(role).name;
  return events.filter((e) => e.attendees.includes(name));
}

/** Events of the picked time (upcoming / past; when = null keeps both), type and project. */
export function applyQuery(events: readonly EventItem[], q: EventsQuery): EventItem[] {
  const name = q.project ? PROJECTS.find((p) => p.id === q.project)?.name : undefined;
  return events
    .filter((e) => q.when == null || isPast(e) === (q.when === WHEN_PAST))
    .filter((e) => !q.type || e.type === TYPE_FILTERS[q.type])
    .filter((e) => !name || name === eventProject(e));
}

/** Events whose title or place holds the search text (case-insensitive); blank text keeps them all. */
export function searchEvents(events: readonly EventItem[], text: string): EventItem[] {
  const needle = text.trim().toLowerCase();
  if (!needle) return [...events];
  return events.filter((e) => `${e.title}\n${e.place}`.toLowerCase().includes(needle));
}

export type EventGroup = { title: string; data: EventItem[] };

/** List sections: by schedule (each date's group, in data order) or by type (form order); empty groups are left out. */
export function groupEvents(events: readonly EventItem[], q: EventsQuery): EventGroup[] {
  const byType = q.group === GROUP_TYPE;
  const of = (e: EventItem): string => (byType ? e.type : groupLabel(e.date));
  const keys = byType
    ? TYPES.filter((t) => events.some((e) => e.type === t))
    : [...new Set(events.map(of))];
  return keys.map((title) => ({ title, data: events.filter((e) => of(e) === title) }));
}
