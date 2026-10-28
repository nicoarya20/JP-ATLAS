/**
 * Events Filter & sort: its options and the `GET /api/app/events` query a choice asks for (map
 * `phase2-map-events.md` §1). Show is the server's `tab`, the type its `kind`, the project its `projectId`, the search
 * its `q` (the title only, E-5); Group by stays on the phone. The query itself is kept in `events.api.ts` (K4).
 */
import { type EventType, TYPES } from './events.shared';
import type { EventKindWire } from './events.wire';

/** Show options; index 0 (Upcoming) is the default. */
export const WHEN = ['Upcoming', 'Past'] as const;
const WHEN_PAST = 1;
/** Event type options; index 0 (All) keeps every type. */
export const TYPE_FILTERS = ['All', ...TYPES] as const;
/** Group by options; index 0 (Schedule) is the default. */
export const GROUPS = ['Schedule', 'Type'] as const;
export const GROUP_TYPE = 1;

/** The server's kind of each type, in form order (TYPES). */
export const KINDS: readonly EventKindWire[] = ['meeting', 'review', 'important', 'team', 'other'];

/** A kind in the app's words. */
export const KIND_LABEL: Record<EventKindWire, EventType> = {
  meeting: 'Meeting',
  review: 'Review',
  important: 'Important',
  team: 'Team event',
  other: 'Other',
};

export type EventsQuery = {
  /** Index in WHEN. */
  when: number;
  /** Index in TYPE_FILTERS. */
  type: number;
  /** Server project id; '' = every project. */
  project: string;
  /** Index in GROUPS. */
  group: number;
};

/** Query a list starts with: upcoming events, every type, every project, grouped by schedule. */
export const BASE_QUERY: EventsQuery = { when: 0, type: 0, project: '', group: 0 };

/**
 * True when the query narrows the events beyond the default (the dot on the filter icon): Past, a type or a project.
 * Grouping alone does not count; the calendar has no Show, so pass `when: 0` there.
 */
export const isFiltered = (q: EventsQuery) => !!(q.when || q.type || q.project);

/** The kind a type filter asks for, or null for All. */
export const kindOf = (type: number): EventKindWire | null => KINDS[type - 1] ?? null;

/** Longest search the server reads; more is cut there anyway. */
const SEARCH_MAX = 100;

/**
 * The filters as a query string, in a fixed order so one choice is one list. The calendar leaves Show out: its
 * window (`from`/`to`) replaces the server's cut on now.
 */
export function eventsParams(q: EventsQuery, search = '', { calendar = false } = {}): string {
  const p = new URLSearchParams();
  if (!calendar) p.set('tab', q.when === WHEN_PAST ? 'past' : 'upcoming');
  const kind = kindOf(q.type);
  if (kind) p.set('kind', kind);
  if (q.project) p.set('projectId', q.project);
  const text = search.trim().slice(0, SEARCH_MAX);
  if (text && !calendar) p.set('q', text);
  return p.toString();
}
