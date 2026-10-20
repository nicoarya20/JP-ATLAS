/**
 * Client for `/api/app/inbox`: keyset pages per lane, the bell numbers and the two "mark read" writes,
 * plus the react-query keys. Plain `fetch` (not Eden) so the ISO timestamps stay strings, as the
 * loader's JSON seed has them. A failed call throws `ApiError` (401 leaves for the login page).
 */
import type {
  InboxActor,
  InboxCounts,
  InboxGroup,
  InboxItem,
} from '@server/notification/notification.query';
import { apiRequest, jsonRequest } from './http';

export type { InboxActor, InboxCounts, InboxGroup, InboxItem };

/** `action` = "Perlu Anda tanggapi" (open work), `info` = "Kabar terbaru". */
export type InboxLane = 'action' | 'info';
export type InboxPage = { items: InboxItem[]; nextCursor: string | null };

/**
 * What the route loader hands the page: the first page of each lane (null when the server could not
 * read it, so the client fetch shows the error) and the bell numbers, all read at `loadedAt`.
 */
export type InboxSeed = {
  first: Record<InboxLane, InboxPage | null>;
  counts: InboxCounts;
  loadedAt: number;
};

/** React-query keys; invalidate `inboxKeys.all` after any write that can open or close a card. */
export const inboxKeys = {
  all: ['inbox'] as const,
  count: ['inbox', 'count'] as const,
  list: (lane: InboxLane) => ['inbox', 'list', lane] as const,
};

export const INBOX_PATH = '/app/inbox';
const INBOX_URL = '/api/app/inbox';

/** The open Inbox on one lane, as a link target (`?tab=info` opens Kabar terbaru). */
export const inboxLaneHref = (lane: InboxLane) =>
  lane === 'info' ? `${INBOX_PATH}?tab=info` : INBOX_PATH;

/** Reads `?tab=` leniently: anything but `info` is the work queue, the default tab. */
export const laneFromTab = (tab: string | null): InboxLane => (tab === 'info' ? 'info' : 'action');

/** One keyset page of a lane; a cursor the server does not know answers 400 `BAD_CURSOR`. */
export function fetchInbox(lane: InboxLane, cursor?: string): Promise<InboxPage> {
  const params = new URLSearchParams({ lane });
  if (cursor) params.set('cursor', cursor);
  return apiRequest<InboxPage>(`${INBOX_URL}?${params}`);
}

/** The bell: open work plus unread news. Never cached by the server, so safe to poll. */
export const fetchInboxCounts = () => apiRequest<InboxCounts>(`${INBOX_URL}/count`);

/** Marks one card read; idempotent, so opening a card twice is harmless. */
export const markInboxRead = (id: string) =>
  apiRequest<{ ok: true }>(`${INBOX_URL}/${encodeURIComponent(id)}/read`, jsonRequest('POST'));

/** Marks every unread news card read; the work queue is untouched. */
export const markAllInboxRead = () =>
  apiRequest<{ updated: number }>(`${INBOX_URL}/read-all`, jsonRequest('POST'));

/** Loaded pages joined; a card that moved between pages while paging appears once. */
export function uniqueInboxItems(pages: readonly InboxPage[]): InboxItem[] {
  const byId = new Map<string, InboxItem>();
  for (const item of pages.flatMap((p) => p.items)) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()];
}
