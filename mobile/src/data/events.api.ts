/**
 * Everything the Events module asks of `/api/app/events*`: the list (keyset-paged), the calendar
 * window, one event, the guest picker, and the writes. Follows `mobile/docs/phase2-pola-data.md` —
 * one `load` per resource, `get*()` left synchronous, and every write naming the resources it could
 * have made wrong.
 *
 * Two things are worth knowing before changing this file.
 *
 * **Paging.** A `resource` holds one value, so "load more" cannot append to it from outside. It is
 * done by asking for one page more and reloading from the first page: `loadMoreEvents()` raises the
 * page count and refetches. That costs the earlier pages again, which is cheap at 30 rows a page and
 * buys the only thing that matters here — the list is always one consistent read of the server,
 * never a stitched-together mix of pages taken before and after someone else's change.
 *
 * **Keys.** The list and the calendar are read differently depending on the filters, the search text
 * and (for the calendar) the shown month. A `resource` has no key, so the wanted key is kept beside
 * it and `syncEventsList`/`syncEventsCalendar` refetch when it changes. Both are idempotent: called
 * with the key already loaded they do nothing, so a screen may call them from any effect.
 */
import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';
import {
  type CreateEventBody,
  EVENT_LIST_LIMIT,
  type EventDetailWire,
  type EventKind,
  type EventListItemWire,
  type EventsPageWire,
  type PickerPersonWire,
  type TrashedEventWire,
  type UpdateEventBody,
} from './events.wire';
import { homeResource } from './home.api';
import { type Resource, resource, write } from './resource';

/** Which half of the list the server should cut to. */
export type EventTab = 'upcoming' | 'past';

/** What narrows a list read; every field goes into the query string the server validates. */
export type EventListKey = {
  tab: EventTab;
  kind?: EventKind;
  projectId?: string;
  /** Free text, matched by the server against the title only (GAP-A10). */
  q?: string;
};

/** What narrows a calendar read: a window of days in the team zone, in place of the tab's cut. */
export type EventCalendarKey = {
  from: string;
  to: string;
  kind?: EventKind;
  projectId?: string;
};

/** One consistent read of the list: the pages fetched so far and whether the server has more. */
export type EventsList = {
  items: EventListItemWire[];
  /** The server's `caps.createEvent` for this page — the "New event" button (B1). */
  createEvent: boolean;
  /** A further page exists; `loadMoreEvents()` fetches it. */
  more: boolean;
  /** No filter and no search text were in force, so an empty `items` really means "nothing yet". */
  unfiltered: boolean;
};

/** Every event touching the shown window, with the capability the empty state needs. */
export type EventsWindow = { items: EventListItemWire[]; truncated: boolean };

const MAX_LIST_PAGES = 20;
/**
 * Pages one calendar window may take. A window is at most 92 days (`EVENT_RANGE_DAYS_MAX`), so this
 * allows 300 events in a month; past it the dots would be wrong, which `truncated` says out loud
 * instead of quietly undercounting.
 */
const MAX_CALENDAR_PAGES = 10;

const BAD_CURSOR = 'BAD_CURSOR';

const query = (parts: readonly (readonly [string, string | undefined])[]): string => {
  const set = parts.filter(([, v]) => v !== undefined && v !== '') as [string, string][];
  return set.length ? `?${set.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}` : '';
};

const listUrl = (key: EventListKey, cursor?: string) =>
  `/api/app/events${query([
    ['tab', key.tab],
    ['kind', key.kind],
    ['projectId', key.projectId],
    ['q', key.q],
    ['limit', String(EVENT_LIST_LIMIT)],
    ['cursor', cursor],
  ])}`;

const windowUrl = (key: EventCalendarKey, cursor?: string) =>
  `/api/app/events${query([
    ['from', key.from],
    ['to', key.to],
    ['kind', key.kind],
    ['projectId', key.projectId],
    ['limit', String(EVENT_LIST_LIMIT)],
    ['cursor', cursor],
  ])}`;

const keyText = (key: EventListKey | EventCalendarKey) => JSON.stringify(key);

/** Reads pages from `url(cursor)` until the server runs out or `maxPages` is reached. */
async function pages(
  url: (cursor?: string) => string,
  maxPages: number,
): Promise<{ items: EventListItemWire[]; createEvent: boolean; more: boolean }> {
  const items: EventListItemWire[] = [];
  let cursor: string | undefined;
  let createEvent = false;
  for (let page = 0; page < maxPages; page += 1) {
    const answer = await apiGet<EventsPageWire>(url(cursor));
    items.push(...answer.items);
    createEvent = answer.caps.createEvent;
    if (!answer.nextCursor) return { items, createEvent, more: false };
    cursor = answer.nextCursor;
  }
  return { items, createEvent, more: true };
}

// --- the list ---------------------------------------------------------------------------------

let listKey: EventListKey = { tab: 'upcoming' };
let listPages = 1;

async function loadList(): Promise<EventsList> {
  const key = listKey;
  const wanted = listPages;
  const read = async (count: number) => pages((cursor) => listUrl(key, cursor), count);
  let answer: Awaited<ReturnType<typeof read>>;
  try {
    answer = await read(wanted);
  } catch (cause) {
    // A cursor the server will not read means the list moved under us: start over from page one
    // rather than leaving the screen on a failure it cannot act on.
    if (!isApiError(cause) || cause.code !== BAD_CURSOR) throw cause;
    listPages = 1;
    answer = await read(1);
  }
  return {
    items: answer.items,
    createEvent: answer.createEvent,
    more: answer.more,
    unfiltered: key.tab === 'upcoming' && !key.kind && !key.projectId && !key.q,
  };
}

export const eventsListResource = resource<EventsList>('events.list', loadList);

/**
 * Point the list at `key` and fetch it when that is not what is loaded. Idempotent: the same key
 * twice is one request (rule 1). Changing the key drops the extra pages, because a cursor belongs
 * to one list and the first page of the new one is where the user is put.
 */
export function syncEventsList(key: EventListKey): Promise<unknown> {
  if (keyText(key) === keyText(listKey)) return eventsListResource.ensure();
  listKey = key;
  listPages = 1;
  return eventsListResource.reload();
}

/** One page more of the list (the "Load more" button); no-op when the server has no more. */
export function loadMoreEvents(): Promise<unknown> {
  const state = eventsListResource.peek();
  if (!state.data?.more || listPages >= MAX_LIST_PAGES) return Promise.resolve(state);
  listPages += 1;
  return eventsListResource.reload();
}

/** The list key loaded now. test-only */
export const peekEventsListKey = (): EventListKey => listKey;

// --- the calendar window ----------------------------------------------------------------------

let windowKey: EventCalendarKey | null = null;

async function loadWindow(): Promise<EventsWindow> {
  if (!windowKey) return { items: [], truncated: false };
  const key = windowKey;
  const answer = await pages((cursor) => windowUrl(key, cursor), MAX_CALENDAR_PAGES);
  return { items: answer.items, truncated: answer.more };
}

export const eventsWindowResource = resource<EventsWindow>('events.window', loadWindow);

/** Point the calendar at a window of days and fetch it when that is not what is loaded. */
export function syncEventsWindow(key: EventCalendarKey): Promise<unknown> {
  if (windowKey && keyText(key) === keyText(windowKey)) return eventsWindowResource.ensure();
  windowKey = key;
  return eventsWindowResource.reload();
}

// --- one event --------------------------------------------------------------------------------

const details = new Map<string, Resource<EventDetailWire>>();

/**
 * The resource for one event id. One per id, not one shared resource with the id beside it: no
 * screen unmounts when another is pushed, so a shared one would redraw the event you left with the
 * event you opened (`phase2-pola-data.md` rule 2).
 */
export function eventDetailResource(id: string): Resource<EventDetailWire> {
  const held = details.get(id);
  if (held) return held;
  const made = resource<EventDetailWire>(`events.detail:${id}`, () =>
    apiGet<EventDetailWire>(`/api/app/events/${encodeURIComponent(id)}`),
  );
  details.set(id, made);
  return made;
}

/** Every event detail read so far, so a write can mark the right ones stale. */
const openDetails = (id?: string): Resource<unknown>[] => {
  const held = id ? details.get(id) : undefined;
  return held ? [held as Resource<unknown>] : [];
};

// --- the guest picker -------------------------------------------------------------------------

let peopleKey = '';

export const eventPeopleResource = resource<PickerPersonWire[]>('events.people', async () => {
  const answer = await apiGet<{ items: PickerPersonWire[] }>(
    `/api/app/events/people${query([['q', peopleKey]])}`,
  );
  return answer.items;
});

/** Search the guest picker. The server caps the answer, so this is a search box, not a full list. */
export function syncEventPeople(text: string): Promise<unknown> {
  const next = text.trim();
  if (next === peopleKey) return eventPeopleResource.ensure();
  peopleKey = next;
  return eventPeopleResource.reload();
}

// --- writes -----------------------------------------------------------------------------------

/**
 * Resources a write to one event can have made wrong: the list it may leave or join, the calendar
 * window it may appear in, its own detail, and Home (its agenda and chips count events).
 */
const touched = (id?: string): Resource<unknown>[] => [
  eventsListResource as Resource<unknown>,
  eventsWindowResource as Resource<unknown>,
  homeResource as Resource<unknown>,
  ...openDetails(id),
];

/**
 * Runs one write and reports its failure to the session before rethrowing. Inside a `resource` this
 * is automatic; a write is outside one, so it is done here (`phase2-pola-data.md` rule 3).
 */
async function send<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (cause) {
    if (isApiError(cause)) applyApiError(cause);
    throw cause;
  }
}

/** New event. Answers the created event, whose id the caller opens. */
export const createEvent = (body: CreateEventBody): Promise<EventDetailWire> =>
  write(() => send(() => apiPost<EventDetailWire>('/api/app/events', body)), touched());

/** Save the Edit form. The project and the guest list are not part of it (the server refuses both). */
export const updateEvent = (id: string, body: UpdateEventBody): Promise<EventDetailWire> =>
  write(
    () => send(() => apiPatch<EventDetailWire>(`/api/app/events/${encodeURIComponent(id)}`, body)),
    touched(id),
  );

/** Invite guests to an existing event (the Edit form's guest changes). */
export const addEventGuests = (id: string, userIds: readonly string[]): Promise<unknown> =>
  write(
    () =>
      send(() =>
        apiPost(`/api/app/events/${encodeURIComponent(id)}/participants`, {
          userIds: [...userIds],
        }),
      ),
    touched(id),
  );

/** Remove one guest from an existing event. */
export const removeEventGuest = (id: string, userId: string): Promise<unknown> =>
  write(
    () =>
      send(() =>
        apiDelete(
          `/api/app/events/${encodeURIComponent(id)}/participants/${encodeURIComponent(userId)}`,
        ),
      ),
    touched(id),
  );

/** Cancel the event with the reason every guest reads on its banner. */
export const cancelEvent = (id: string, reason: string): Promise<EventDetailWire> =>
  write(
    () =>
      send(() =>
        apiPost<EventDetailWire>(`/api/app/events/${encodeURIComponent(id)}/cancel`, { reason }),
      ),
    touched(id),
  );

/** Move the event to the Trash (the screens call it Archive); restorable for the retention period. */
export const trashEvent = (id: string): Promise<TrashedEventWire> =>
  write(
    () => send(() => apiDelete<TrashedEventWire>(`/api/app/events/${encodeURIComponent(id)}`)),
    touched(id),
  );

/**
 * Bring a trashed event back (the snack's Undo). Whether it may be restored is the server's call —
 * retention, a trashed project, impersonation — so there is no client-side check before it.
 */
export const restoreEvent = (id: string): Promise<unknown> =>
  write(
    () => send(() => apiPost(`/api/app/trash/event/${encodeURIComponent(id)}/restore`)),
    touched(id),
  );

/** Everything this module holds, dropped. test-only */
export function resetEventsApi(): void {
  listKey = { tab: 'upcoming' };
  listPages = 1;
  windowKey = null;
  peopleKey = '';
  for (const held of details.values()) held.forget();
  details.clear();
  eventsListResource.forget();
  eventsWindowResource.forget();
  eventPeopleResource.forget();
}
