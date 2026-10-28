/**
 * `/api/app/inbox`: the two lanes, the bell numbers, and the two "read" writes (map
 * `phase2-map-home-inbox-team.md` §2, pattern `phase2-pola-data.md`).
 *
 * Paging without touching `resource.ts` (gap §4.3, agreed with the coordinator on 28 Oct 2026):
 * a lane's resource holds **every page loaded so far**. `load()` reads one module flag, `more`,
 * taken at its start:
 * - `more` → the next keyset page after `nextCursor`, appended;
 * - otherwise (ensure, reload, the invalidate after a write) → page one again, asking for as many
 *   cards as are on screen (25 to 100), so marking a card read does not fold a list the person
 *   had opened further. Past 100 it folds back to 100.
 * A `BAD_CURSOR` while loading more starts over from page one, which is what the server's own
 * message tells the person to do. After `forget()` (sign out) `current()` is null, so the size
 * falls back to one page with no state of its own to clear.
 */
import { apiGet, apiPost } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { type Resource, type ResourceState, resource, write } from './resource';

export type InboxLane = 'action' | 'info';
export type InboxGroup = 'today' | 'yesterday' | 'older';

/** `server/notification/notification.query.ts` `InboxItem`. */
export type InboxItemWire = {
  id: string;
  kind: string;
  lane: InboxLane;
  /** Null when the system acted or the account was removed. */
  actor: { id: string; name: string; image: string | null } | null;
  ref: { type: string; id: string; number: number | null };
  payload: Record<string, unknown>;
  bundleCount: number;
  read: boolean;
  /** Day bucket in the team zone, decided by the server. */
  group: InboxGroup;
  createdAt: string;
  updatedAt: string;
  /** A web path (`/app/tasks/12`); `inbox.links.ts` turns it into an app route. */
  href: string;
  /** Indonesian, from the server's catalogue; null for a kind this server build does not know. */
  sentence: string | null;
  button: string | null;
};

export type InboxPageWire = { items: InboxItemWire[]; nextCursor: string | null };

/** What a lane resource holds: all pages loaded so far. */
export type InboxLaneData = InboxPageWire;

/** `GET /api/app/inbox/count`: open work cards, and unread news. */
export type InboxCountWire = { action: number; infoUnread: number };

export const INBOX_PAGE = 25;
/** The server's `PAGE_LIMIT_MAX`; a refresh never asks for more than this in one request. */
export const INBOX_PAGE_MAX = 100;

const pageUrl = (lane: InboxLane, limit: number, cursor?: string) =>
  `/api/app/inbox?lane=${lane}&limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;

type LaneResource = Resource<InboxLaneData>;

function laneResource(lane: InboxLane): { res: LaneResource; wantMore: () => void } {
  let more = false;
  let res: LaneResource;
  const first = () => {
    const shown = res.current()?.items.length ?? 0;
    const limit = Math.min(INBOX_PAGE_MAX, Math.max(INBOX_PAGE, shown));
    return apiGet<InboxPageWire>(pageUrl(lane, limit));
  };
  const load = async (): Promise<InboxLaneData> => {
    const asked = more;
    more = false;
    const had = res.current();
    if (!asked || !had?.nextCursor) return first();
    try {
      const next = await apiGet<InboxPageWire>(pageUrl(lane, INBOX_PAGE, had.nextCursor));
      return { items: [...had.items, ...next.items], nextCursor: next.nextCursor };
    } catch (e) {
      if (isApiError(e) && e.code === 'BAD_CURSOR') return first();
      throw e;
    }
  };
  res = resource<InboxLaneData>(`inbox:${lane}`, load);
  return { res, wantMore: () => (more = true) };
}

const action = laneResource('action');
const info = laneResource('info');

/** The work queue: open `action` cards. */
export const inboxActionResource = action.res;
/** The news lane. */
export const inboxInfoResource = info.res;

export const inboxLaneResource = (lane: InboxLane): LaneResource =>
  lane === 'action' ? action.res : info.res;

/**
 * The next page of a lane, appended. Does nothing while a request is out (the button is busy then)
 * or when there is no next page. A failure leaves the cards that were there and reports through
 * the returned state, like any load.
 */
export function loadMoreInbox(lane: InboxLane): Promise<ResourceState<InboxLaneData>> {
  const { res, wantMore } = lane === 'action' ? action : info;
  const state = res.peek();
  if (state.phase === 'loading' || !state.data?.nextCursor) return Promise.resolve(state);
  wantMore();
  return res.reload();
}

/**
 * The bell numbers behind the Inbox badges (More tile, Profile row, Home chip).
 *
 * TODO(inbox-badge): the web polls this every 60 s; the app only fetches it on demand and after a
 * read. Polling needs a lifecycle owner (the tab layout, paused when the app is in the background
 * via AppState), which no screen of the Inbox is — agreed as debt with the coordinator, 28 Oct 2026.
 */
export const inboxCountResource = resource<InboxCountWire>('inbox:count', () =>
  apiGet<InboxCountWire>('/api/app/inbox/count'),
);

/** Open work cards, or null while the count is not in (null = no badge, never a made-up 0). */
export const inboxActionCount = (): number | null => inboxCountResource.current()?.action ?? null;

/** Same, in a component. */
export const useInboxActionCount = (): number | null =>
  inboxCountResource.use().data?.action ?? null;

/** A write outside a resource reports its failure to the session itself (pattern §3). */
async function post<T>(path: string): Promise<T> {
  try {
    return await apiPost<T>(path);
  } catch (e) {
    if (isApiError(e)) applyApiError(e);
    throw e;
  }
}

/** Marks one card read (idempotent server-side). The lane and the badge numbers may change. */
export const markInboxRead = (id: string, lane: InboxLane) =>
  write(
    () => post<{ ok: true }>(`/api/app/inbox/${encodeURIComponent(id)}/read`),
    [inboxLaneResource(lane), inboxCountResource],
  );

/** Marks every unread news card read; the work queue is untouched by the server. */
export const markAllInboxRead = () =>
  write(
    () => post<{ updated: number }>('/api/app/inbox/read-all'),
    [inboxInfoResource, inboxCountResource],
  );
