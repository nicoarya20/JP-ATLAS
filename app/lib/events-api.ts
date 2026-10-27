/**
 * Client for `/api/app/events` through Eden: keyset pages (`nextCursor`), one event, the writes
 * (create, change, cancel, send to the Trash, restore), the DTO types the server sends, and the
 * react-query keys.
 */
import type { EventDetail, EventListItem, PersonRef } from '@server/event/events.dto';
import type { EventKind, EventLocationType } from '@server/pm/enums';
import type { ListTeamOk } from '@server/team/team.dto';
import { type InfiniteData, keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { client } from './eden';
import type { EventListQuery } from './events-filters';
import { ApiError, type ApiIssue, redirectToSession } from './http';

export type { EventDetail, EventListItem, PersonRef };
/** One keyset page; `caps.createEvent` false or absent = the "Event baru" button is hidden. */
export type EventPage = {
  items: EventListItem[];
  nextCursor: string | null;
  caps: { createEvent?: boolean };
};

/** React-query keys; invalidate `eventKeys.all` after any write so lists and detail agree. */
export const eventKeys = {
  all: ['events'] as const,
  list: (q: EventListQuery) => ['events', 'list', q] as const,
  detail: (id: string) => ['events', 'detail', id] as const,
  people: (q: string, projectId: string | null) => ['events', 'people', q, projectId] as const,
};

/** Where the event pages live; the form is built by its own slice. */
export const EVENTS_PATH = '/app/events';
export const NEW_EVENT_PATH = '/app/events/new';
export const eventHref = (id: string) => `/app/events/${encodeURIComponent(id)}`;
export const eventEditHref = (id: string) => `${eventHref(id)}/edit`;

type ErrorValue = { error?: unknown; code?: unknown; requestId?: unknown; issues?: unknown };
type EdenResult<T> = {
  data: T | null;
  error: { status: unknown; value: unknown } | null;
  response?: Response;
};

const text = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : undefined);

/** Eden `{ data, error }` → data, or throws an `ApiError` (401 leaves for login). */
export function unwrapEvent<T>(res: EdenResult<T>, onUnauthorized = redirectToSession): T {
  if (!res.error) return res.data as T;
  const status = typeof res.error.status === 'number' ? res.error.status : 500;
  const v = (res.error.value ?? {}) as ErrorValue;
  if (status === 401) onUnauthorized();
  throw new ApiError({
    message: text(v.error),
    status,
    code: text(v.code),
    requestId: text(v.requestId) ?? res.response?.headers.get('x-request-id') ?? undefined,
    issues: status === 422 && Array.isArray(v.issues) ? (v.issues as ApiIssue[]) : undefined,
  });
}

export async function fetchEvents(query: EventListQuery, cursor?: string): Promise<EventPage> {
  return unwrapEvent(
    await client.api.app.events.get({ query: cursor ? { ...query, cursor } : query }),
  ) as EventPage;
}

/** Eden pastes path params as they are, so ids are escaped here. */
const pathId = (id: string) => encodeURIComponent(id);

/** One event with its guests and `can{}`; 404 when it is missing, in the Trash or hidden from the viewer. */
export async function fetchEvent(id: string): Promise<EventDetail> {
  return unwrapEvent(await client.api.app.events({ id: pathId(id) }).get()) as EventDetail;
}

/** Cancels an event with the reason its guests read; the answer is the event as it is now. */
export async function cancelEvent(id: string, reason: string): Promise<EventDetail> {
  return unwrapEvent(
    await client.api.app.events({ id: pathId(id) }).cancel.post({ reason }),
  ) as EventDetail;
}

/** What `DELETE /events/:id` answers: enough to name the event and to restore it by id. */
export type TrashedEvent = { kind: 'event'; id: string; label: string };

/** Sends the event to the Trash (a soft delete the Trash page can undo). */
export async function trashEvent(id: string): Promise<TrashedEvent> {
  const res = unwrapEvent(await client.api.app.events({ id: pathId(id) }).delete());
  return (res as { trash: TrashedEvent }).trash;
}

/** Brings a trashed event back by id, with its guests and minutes. */
export async function restoreEvent(id: string): Promise<{ id: string }> {
  return unwrapEvent(await client.api.app.trash.event({ id: pathId(id) }).restore.post());
}

/** What the route loader hands over: the first page for exactly this query, if the server answered. */
export type EventsSeed = { query: EventListQuery; first: EventPage | null; loadedAt: number };

/** Keyset pages of one list; `fetchNextPage` follows `nextCursor` until it is null. */
export function useEventPages(query: EventListQuery, seed: EventsSeed) {
  // The SSR page only seeds the cache for the exact query the loader ran.
  const seeded = seed.first !== null && JSON.stringify(query) === JSON.stringify(seed.query);
  const initialData: InfiniteData<EventPage, string | undefined> | undefined =
    seeded && seed.first ? { pages: [seed.first], pageParams: [undefined] } : undefined;
  return useInfiniteQuery({
    queryKey: eventKeys.list(query),
    queryFn: ({ pageParam }) => fetchEvents(query, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData,
    initialDataUpdatedAt: seed.loadedAt,
    placeholderData: keepPreviousData,
  });
}

/** Loaded pages joined; an event that moved between pages while paging appears once. */
export function uniqueEvents(pages: readonly EventPage[]): EventListItem[] {
  const byId = new Map<string, EventListItem>();
  for (const item of pages.flatMap((p) => p.items)) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

/** Body of `POST /api/app/events`; stage 1 of the form fills the first group, stage 2 the rest. */
export type CreateEventBody = {
  title: string;
  /** ISO instants; the form builds them from the team-zone date and clock times (`events-time.ts`). */
  startsAt: string;
  endsAt: string;
  projectId?: string | null;
  /** The creator joins on their own; only the others are listed. */
  participantIds?: string[];
  kind?: EventKind;
  locationType?: EventLocationType | null;
  locationText?: string | null;
  meetingUrl?: string | null;
  agenda?: string | null;
  remindersMinutes?: number[];
};

/** Creates an event; answers with the detail the read would give (201). Throws `ApiError` on a refusal. */
export async function createEvent(body: CreateEventBody): Promise<EventDetail> {
  return unwrapEvent(await client.api.app.events.post(body)) as EventDetail;
}

/**
 * Body of `PATCH /api/app/events/:id`. The project and the guest list are `t.Never()` on the route
 * (an event cannot be moved between projects, and guests are invited from the detail page), so a
 * body carrying either is refused with 422 — the type leaves them out on purpose.
 */
export type UpdateEventBody = Omit<CreateEventBody, 'projectId' | 'participantIds'>;

/** Changes an event; answers with the detail as it is now. Throws `ApiError` on a refusal. */
export async function updateEvent(id: string, body: UpdateEventBody): Promise<EventDetail> {
  return unwrapEvent(await client.api.app.events({ id: pathId(id) }).patch(body)) as EventDetail;
}

/** Colleagues offered as guests: a person's id, name and job title, nothing more (Q8). */
export type GuestCandidate = { id: string; name: string; jobTitle: string | null };

/** How many colleagues one search lists; the guest picker is a short list, not a directory. */
export const GUEST_SEARCH_LIMIT = 20;

/**
 * People the caller may invite, by name. Reads the team list (open to every role, limited to people
 * who share a project with the caller) because `GET /events/people` refuses a Member; the caller
 * themselves is left out since the server adds the creator as a guest anyway.
 */
export async function fetchGuestCandidates(
  q: string,
  projectId: string | null,
): Promise<GuestCandidate[]> {
  const query = {
    limit: GUEST_SEARCH_LIMIT,
    offset: 0,
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(projectId ? { projectId } : {}),
  };
  const page = unwrapEvent(await client.api.app.team.get({ query })) as ListTeamOk;
  return page.people
    .filter((p) => !p.isSelf)
    .map((p) => ({ id: p.id, name: p.name, jobTitle: p.jobTitle }));
}
