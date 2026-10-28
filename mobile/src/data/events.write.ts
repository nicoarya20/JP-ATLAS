/**
 * `/api/app/events` writes (map §4, pattern `phase2-pola-data.md` §2–§3): create, edit with the guest list, cancel,
 * Move to Trash and its Undo. Each write reports a failure to the session itself (`applyApiError`) and re-throws it,
 * so the screen can say why; only a write the server accepted marks reads stale, and it names every read it could
 * have changed: the event, every kept list and calendar window, and Home (its agenda).
 */
import { apiDelete, apiPatch, apiPost } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { eventListTargets, eventResource } from './events.api';
import type { CreateEventBody, EventDetailWire, UpdateEventBody } from './events.wire';
import { homeResource } from './home.api';
import { invalidateAll, type Resource, write } from './resource';

/** A write outside a resource reports its own failure to the session, then re-throws it (pattern §3). */
async function send<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (isApiError(e)) applyApiError(e);
    throw e;
  }
}

const path = (id: string) => `/api/app/events/${encodeURIComponent(id)}`;

/** Everything that lists events. */
const listTargets = (): Resource<unknown>[] => [
  ...eventListTargets(),
  homeResource as Resource<unknown>,
];

const eventTargets = (id: string): Resource<unknown>[] => [
  eventResource(id) as Resource<unknown>,
  ...listTargets(),
];

/** `POST /events`: the new event's detail; its creator is a guest whether listed or not. */
export const createEvent = (body: CreateEventBody): Promise<EventDetailWire> =>
  write(() => send(() => apiPost<EventDetailWire>('/api/app/events', body)), listTargets());

/** Who joins and who leaves the guest list in an edit. */
export type GuestChange = { add: string[]; remove: string[] };

/**
 * Saves an edit in the server's steps, in order: the fields, the new guests, then each guest who leaves. A step that
 * fails stops the rest and is thrown; whatever was saved before it is still marked stale, so the screens show it.
 */
export async function saveEvent(
  id: string,
  fields: UpdateEventBody,
  guests: GuestChange,
): Promise<void> {
  const steps: (() => Promise<unknown>)[] = [];
  if (Object.keys(fields).length > 0) steps.push(() => apiPatch(path(id), fields));
  if (guests.add.length) {
    steps.push(() => apiPost(`${path(id)}/participants`, { userIds: guests.add }));
  }
  for (const userId of guests.remove) {
    steps.push(() => apiDelete(`${path(id)}/participants/${encodeURIComponent(userId)}`));
  }
  let saved = 0;
  try {
    for (const step of steps) {
      await send(step);
      saved += 1;
    }
  } finally {
    if (saved > 0) invalidateAll(eventTargets(id));
  }
}

/** `POST /events/:id/cancel`: the event stays listed, marked Canceled with the reason every guest reads. */
export const cancelEvent = (id: string, reason: string): Promise<EventDetailWire> =>
  write(
    () => send(() => apiPost<EventDetailWire>(`${path(id)}/cancel`, { reason })),
    eventTargets(id),
  );

export type EventTrashWire = { trash: { kind: 'event'; id: string; label: string } };

/**
 * `DELETE /events/:id`: the event moves to the Trash. Its detail is forgotten rather than refetched: kept, the last
 * copy would still show if it were opened again, where the server now answers 404.
 */
export async function trashEvent(id: string): Promise<EventTrashWire> {
  const moved = await write(() => send(() => apiDelete<EventTrashWire>(path(id))), listTargets());
  eventResource(id).forget();
  return moved;
}

/** `POST /trash/event/:id/restore`: the Undo of a move to the Trash. */
export const restoreEvent = (id: string): Promise<{ id: string }> =>
  write(
    () =>
      send(() => apiPost<{ id: string }>(`/api/app/trash/event/${encodeURIComponent(id)}/restore`)),
    eventTargets(id),
  );
