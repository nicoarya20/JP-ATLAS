// A stubbed `/api/app/events*` for the Events tests, plus the DTO fixtures they build on.
//
// No request leaves the machine: `fetch` is replaced by one handler that sees the method, the path
// and the query string, so a test can answer page by page and then assert what was asked for. A
// path with no answer fails the way a dead network does, naming the gap.
import { resetEventsApi } from '@/data/events.api';
import type { EventDetailWire, EventListItemWire, EventsPageWire } from '@/data/events.wire';

/** What one call answers: a JSON body with a status, or a thrown transport failure. */
export type Reply = { status?: number; body?: unknown } | { throws: unknown };

/** One call as the handler sees it. */
export type Call = {
  method: string;
  url: string;
  path: string;
  search: URLSearchParams;
  body: unknown;
};

export type Handler = (call: Call) => Reply | Promise<Reply>;

const parse = (input: unknown): { url: string; path: string; search: URLSearchParams } => {
  const raw =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : String((input as { url?: unknown }).url ?? input);
  const url = new URL(raw, 'http://127.0.0.1:3005');
  return { url: raw, path: url.pathname, search: url.searchParams };
};

/**
 * Replaces `fetch` with `handler`. Returns the calls it saw (in order) and a `restore`; call that
 * in `afterEach`, which `serveEventsApi` does for you.
 */
export function serveEvents(handler: Handler) {
  const original = globalThis.fetch;
  const calls: Call[] = [];
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { url, path, search } = parse(input);
    const call: Call = {
      method: init?.method ?? 'GET',
      url,
      path,
      search,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
    };
    calls.push(call);
    const reply = await handler(call);
    if ('throws' in reply) throw reply.throws;
    return new Response(JSON.stringify(reply.body ?? null), {
      status: reply.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

/**
 * Installs a stub for the whole suite and clears what the Events data layer holds after each test.
 * Returns an accessor for the calls of the test running now.
 */
export function serveEventsApi(handler: Handler) {
  let server: ReturnType<typeof serveEvents> | null = null;
  beforeEach(() => {
    server = serveEvents(handler);
  });
  afterEach(() => {
    server?.restore();
    server = null;
    resetEventsApi();
  });
  return {
    calls: () => server?.calls ?? [],
    /** Calls to one path, in order. */
    to: (path: string) => (server?.calls ?? []).filter((c) => c.path === path),
  };
}

// --- fixtures ---------------------------------------------------------------------------------

/** The team's project, as every DTO below refers to it. */
export const PROJECT = { id: 'p-atlas', name: 'Atlas', status: 'active' };

/**
 * A list row. The default is the sample's own design review: Wednesday 7 Oct 2026, 14:00–15:00 in
 * Asia/Jakarta, which in UTC is 07:00–08:00 — the difference the mapping has to get right (K2).
 */
export const listItem = (over: Partial<EventListItemWire> = {}): EventListItemWire => ({
  id: 'e-review',
  title: 'Onboarding design review',
  kind: 'review',
  startsAt: '2026-10-07T07:00:00.000Z',
  endsAt: '2026-10-07T08:00:00.000Z',
  locationType: 'offline',
  locationText: 'Meeting Room 2',
  meetingUrl: null,
  project: PROJECT,
  canceledAt: null,
  cancelReason: null,
  participants: { total: 3, isParticipant: true },
  noteStatus: null,
  can: { update: true, cancel: true, trash: true, manageParticipants: true, writeNote: true },
  ...over,
});

/** One event's detail; `u-nico` is the signed-in account of the test fixtures. */
export const detailItem = (over: Partial<EventDetailWire> = {}): EventDetailWire => {
  const { participants, ...base } = listItem();
  void participants;
  return {
    ...base,
    agenda: 'New onboarding flow\nFeedback from the trial users',
    remindersMinutes: [1440, 30],
    creator: { id: 'u-rina', name: 'Rina' },
    canceledBy: null,
    participants: [
      { id: 'u-rina', name: 'Rina' },
      { id: 'u-nico', name: 'Nico' },
    ],
    note: null,
    createdAt: '2026-10-01T02:00:00.000Z',
    updatedAt: '2026-10-07T01:00:00.000Z',
    ...over,
  };
};

/** One page of the list. */
export const page = (
  items: EventListItemWire[],
  over: Partial<Omit<EventsPageWire, 'items'>> = {},
): EventsPageWire => ({ items, nextCursor: null, caps: { createEvent: true }, ...over });

/** The uniform error body every `/api` failure carries. */
export const apiError = (code: string, error = 'Gagal.', status = 400) => ({
  status,
  body: { error, code, status, requestId: 'req-1' },
});
