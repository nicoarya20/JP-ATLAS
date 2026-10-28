/**
 * `/api/app/events` reads (map `phase2-map-events.md` §0, pattern `phase2-pola-data.md`): the list a page at a time,
 * a calendar window whole, one event, and the guest search. The server decides who sees which event, so nothing here
 * filters by role.
 *
 * Lists and windows are kept per query (the last few, like `tasks.api.ts`): going back to a filter shows what it had
 * at once, and a write refetches only what is still kept.
 */
import { apiGet } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError, sessionStore } from '@/session/session.state';

import { BASE_QUERY, type EventsQuery } from './events.query';
import type { EventDetailWire, EventPersonWire, EventsPageWire } from './events.wire';
import { type Resource, type ResourceState, resource } from './resource';
import { createStore, useStore } from './store';
import { loadMorePaged, type Paged, pagedResource, TASKS_PAGE_MAX } from './tasks.paged';

/** Lists and calendar windows kept loaded: the tab shows one of each and remembers the last few. */
export const EVENTS_CACHE = 8;
/**
 * Pages one calendar window may take (100 events each, the server's most). A month busier than this shows its first
 * 1,000 events; the rest is a gap (E-7), not an error.
 */
export const WINDOW_PAGES_MAX = 10;

/** The Filter & sort query, shared by the list and the calendar (K4). */
const queryStore = createStore<EventsQuery>(BASE_QUERY);
export const setEventsQuery = (q: EventsQuery) => queryStore.set(q);
export const getEventsQuery = () => queryStore.get();
export const useEventsQuery = () => useStore(queryStore);
/** Back to the default filters. test-only */
export const resetEventsQuery = () => queryStore.reset();

// The next account starts with the default filters, like it starts with no data (`forgetAllResources`).
sessionStore.subscribe(() => {
  if (sessionStore.get().status === 'signed-out') queryStore.reset();
});

/** A per-key cache that keeps the last EVENTS_CACHE entries and forgets the resource of the one it drops. */
function kept<T>(make: (key: string) => T, resOf: (made: T) => Resource<unknown>) {
  const made = new Map<string, T>();
  const get = (key: string): T => {
    const had = made.get(key);
    if (had) {
      // Insertion order is use order: a key read again moves to the end.
      made.delete(key);
      made.set(key, had);
      return had;
    }
    const fresh = make(key);
    made.set(key, fresh);
    if (made.size > EVENTS_CACHE) {
      const [oldest, old] = made.entries().next().value as [string, T];
      made.delete(oldest);
      resOf(old).forget();
    }
    return fresh;
  };
  return { get, all: () => [...made.values()].map(resOf) };
}

const lists = kept<Paged<EventsPageWire>>(
  (params) => pagedResource<EventsPageWire>(`events:list:${params}`, `/api/app/events?${params}`),
  (p) => p.res as Resource<unknown>,
);

/** The list a query string asks for (`eventsParams`). */
export const eventsListResource = (params: string): Resource<EventsPageWire> =>
  lists.get(params).res;

/** The next page of that list, appended; nothing while a request is out or when it is all shown. */
export const loadMoreEvents = (params: string): Promise<ResourceState<EventsPageWire>> =>
  loadMorePaged(lists.get(params));

/** Every calendar window `from`–`to` (both ends counted, at most 92 days) with the filters in `params`. */
async function loadWindow(key: string): Promise<EventsPageWire> {
  const base = `/api/app/events?${key}&limit=${TASKS_PAGE_MAX}`;
  let page = await apiGet<EventsPageWire>(base);
  const items = [...page.items];
  for (let n = 1; page.nextCursor && n < WINDOW_PAGES_MAX; n += 1) {
    page = await apiGet<EventsPageWire>(`${base}&cursor=${encodeURIComponent(page.nextCursor)}`);
    items.push(...page.items);
  }
  return { ...page, items };
}

const windows = kept<Resource<EventsPageWire>>(
  (key) => resource<EventsPageWire>(`events:window:${key}`, () => loadWindow(key)),
  (r) => r as Resource<unknown>,
);

/** The events touching the days `from`–`to`, past ones included, narrowed by `params` (no `tab`, no `q`). */
export function eventsWindowResource(
  from: string,
  to: string,
  params: string,
): Resource<EventsPageWire> {
  const window = new URLSearchParams(params);
  window.set('from', from);
  window.set('to', to);
  return windows.get(window.toString());
}

/** Every list and window still kept: what any event write can make wrong. */
export const eventListTargets = (): Resource<unknown>[] => [...lists.all(), ...windows.all()];

const details = new Map<string, Resource<EventDetailWire>>();

/** `GET /events/:id`: the event with its guests, minutes and `can{}`; hidden, missing and trashed are the same 404. */
export function eventResource(id: string): Resource<EventDetailWire> {
  const had = details.get(id);
  if (had) return had;
  const made = resource<EventDetailWire>(`event:${id}`, () =>
    apiGet<EventDetailWire>(`/api/app/events/${encodeURIComponent(id)}`),
  );
  details.set(id, made);
  return made;
}

const SEARCH_MAX = 100;

/**
 * Guest candidates by name (`GET /events/people`, which is the team picker: the first 20 by name). Not a resource:
 * each search is its own short-lived answer, kept by the picker that asked.
 */
export async function searchEventPeople(q: string): Promise<EventPersonWire[]> {
  const params = new URLSearchParams();
  const text = q.trim().slice(0, SEARCH_MAX);
  if (text) params.set('q', text);
  try {
    const answer = await apiGet<{ items: EventPersonWire[] }>(`/api/app/events/people?${params}`);
    return answer.items;
  } catch (e) {
    if (isApiError(e)) applyApiError(e);
    throw e;
  }
}
