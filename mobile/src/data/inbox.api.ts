/**
 * `GET /api/app/inbox` (both lanes), `GET /api/app/inbox/count` and the two "mark read" writes.
 *
 * Follows `mobile/docs/phase2-pola-data.md`: one `resource` per thing fetched, a `load` that does
 * the request and nothing else, and writes that name every store they could have changed.
 *
 * There is no route that creates or deletes a card: cards appear because a service called `notify()`
 * and go when it resolves them (`server/api/app-inbox.ts`). So the app only reads and marks read.
 */
import { apiGet, apiPost } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { resource, write } from './resource';

/** Who acted; null when the system did, or when the account is gone (`notification.query.ts`). */
export type InboxActorWire = { id: string; name: string; image: string | null };

/** What the card points at. `number` is the human reference of a task ("#14"); null for the rest. */
export type InboxRefWire = { type: string; id: string; number: number | null };

/** The day bucket the **server** decided in the team zone; never recomputed here (K2). */
export type InboxGroupWire = 'today' | 'yesterday' | 'older';

/** One card as `server/notification/notification.query.ts` sends it. */
export type InboxItemWire = {
  id: string;
  kind: string;
  lane: 'action' | 'info';
  actor: InboxActorWire | null;
  ref: InboxRefWire;
  payload: Record<string, unknown>;
  /** "5 changes": how many events this card stands for. */
  bundleCount: number;
  read: boolean;
  group: InboxGroupWire;
  createdAt: string;
  updatedAt: string;
  /** The **web** path of the card's button; mapped to a route of this app in `inbox.links.ts`. */
  href: string;
  /** Indonesian, composed by the server; shown as it came (K5). Null for a kind this build lacks. */
  sentence: string | null;
  button: string | null;
};

/** One keyset page of a lane. */
export type InboxPageWire = { items: InboxItemWire[]; nextCursor: string | null };

/** The bell: open work, and unread news. */
export type InboxCountsWire = { action: number; infoUnread: number };

/**
 * Only the first page of each lane is read in this wave. The server's default limit (25) applies;
 * `nextCursor` is kept so the screen can say that older cards are not loaded rather than pretend
 * the lane ends here. See the Gelombang 1 handover for why "load more" waits.
 */
const lane = (which: 'action' | 'info') => () =>
  apiGet<InboxPageWire>(`/api/app/inbox?lane=${which}`);

/** "Needs your response": open cards, oldest first as the server orders them. */
export const inboxActionResource = resource<InboxPageWire>('inbox.action', lane('action'));

/** "Latest updates": the news lane, newest first. */
export const inboxInfoResource = resource<InboxPageWire>('inbox.info', lane('info'));

/** The two numbers behind the bell; the Home chip, the More tile and Profile all read this one. */
export const inboxCountResource = resource<InboxCountsWire>('inbox.count', () =>
  apiGet<InboxCountsWire>('/api/app/inbox/count'),
);

/**
 * A write outside a `resource`, so the session correction a resource gets for free is done here by
 * hand (pattern §3): an approval withdrawn mid-session lands on this request, not on the next
 * restart. The error is re-thrown, never swallowed — the caller shows it.
 */
async function post(path: string): Promise<void> {
  try {
    await apiPost<unknown>(path);
  } catch (failure) {
    if (isApiError(failure)) applyApiError(failure);
    throw failure;
  }
}

/**
 * Marks one card read. Both lanes are named stale: a card is read by id and the id may be in
 * either, and the bell's `infoUnread` changes with it.
 */
export const markCardRead = (id: string): Promise<void> =>
  write(() => post(`/api/app/inbox/${id}/read`), [
    inboxInfoResource,
    inboxActionResource,
    inboxCountResource,
  ]);

/** Marks every unread news card read. The work queue is untouched, so it is not named. */
export const markAllNewsRead = (): Promise<void> =>
  write(() => post('/api/app/inbox/read-all'), [inboxInfoResource, inboxCountResource]);

/** What the Inbox screen asks for on mount; `ensure` means a second screen adds no request. */
export const ensureInbox = (): Promise<unknown> =>
  Promise.all([
    inboxActionResource.ensure(),
    inboxInfoResource.ensure(),
    inboxCountResource.ensure(),
  ]);

/** Only the bell, for the screens that show the number without opening the Inbox. */
export const ensureInboxCount = (): Promise<unknown> => inboxCountResource.ensure();

/** Cards waiting for a response, or null while the count has not arrived. */
export const inboxActionCount = (): number | null =>
  inboxCountResource.current()?.action ?? null;
