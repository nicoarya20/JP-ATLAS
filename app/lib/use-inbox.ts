/** react-query hooks of the Inbox: the polled bell numbers and the keyset pages of one lane. */
import {
  type InfiniteData,
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { ApiError } from './http';
import {
  fetchInbox,
  fetchInboxCounts,
  type InboxCounts,
  type InboxLane,
  type InboxPage,
  type InboxSeed,
  inboxKeys,
} from './inbox-api';

/** Every open tab asks for the bell numbers this often; the route is exempt from the IP rate limit. */
export const INBOX_COUNT_POLL_MS = 60_000;
/** The open Inbox page refreshes its list this often, so a closed card disappears on its own. */
export const INBOX_LIST_POLL_MS = 30_000;
/** A seeded value counts as fresh this long, so hydration does not fire a request at once. */
const SEED_FRESH_MS = 15_000;

const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;

/** Polling stops once the session is gone: the 401 already sent the browser to the login page. */
const pollUnlessSignedOut = (ms: number) => (query: { state: { error: unknown } }) =>
  isUnauthorized(query.state.error) ? false : ms;

/** Options of the bell query; exported so tests can pin the polling contract. */
export function inboxCountOptions(seed?: { counts: InboxCounts; loadedAt: number }) {
  return {
    queryKey: inboxKeys.count,
    queryFn: fetchInboxCounts,
    refetchInterval: pollUnlessSignedOut(INBOX_COUNT_POLL_MS),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: SEED_FRESH_MS,
    retry: (failures: number, error: unknown) => !isUnauthorized(error) && failures < 1,
    initialData: seed?.counts,
    initialDataUpdatedAt: seed?.loadedAt,
  };
}

/** The bell numbers `{ action, infoUnread }`; `data` is always set when a seed was given. */
export function useInboxCounts(seed?: { counts: InboxCounts; loadedAt: number }) {
  return useQuery(inboxCountOptions(seed));
}

/** Keyset pages of one lane, seeded with the loader's first page; "Muat lebih banyak" follows `nextCursor`. */
export function useInboxPages(lane: InboxLane, seed: InboxSeed) {
  const first = seed.first[lane];
  const initialData: InfiniteData<InboxPage, string | undefined> | undefined = first
    ? { pages: [first], pageParams: [undefined] }
    : undefined;
  return useInfiniteQuery({
    queryKey: inboxKeys.list(lane),
    queryFn: ({ pageParam }) => fetchInbox(lane, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData,
    initialDataUpdatedAt: seed.loadedAt,
    staleTime: SEED_FRESH_MS,
    refetchInterval: pollUnlessSignedOut(INBOX_LIST_POLL_MS),
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
    retry: (failures, error) => !isUnauthorized(error) && failures < 1,
  });
}
