// Events answers as `GET /api/app/events*` send them (`server/event/events.dto.ts`). Times are instants; the test
// clock's team zone is Asia/Jakarta (UTC+7), so 07:00Z reads as 2:00 PM. Today is the test clock's Wed, Oct 7, 2026.
// test-only
import type {
  EventDetailWire,
  EventListItemWire,
  EventPersonWire,
  EventsPageWire,
} from '@/data/events.wire';

import type { AuthReply, AuthRoutes } from './auth-server';

const ATLAS = { id: 'p-atlas', name: 'Atlas Project', status: 'active' as const };

/** Today 2:00–3:00 PM in Meeting Room 2, in Atlas Project; the viewer may do everything. */
export const reviewItem = (over: Partial<EventListItemWire> = {}): EventListItemWire => ({
  id: 'e-review',
  title: 'Onboarding design review',
  kind: 'review',
  startsAt: '2026-10-07T07:00:00.000Z',
  endsAt: '2026-10-07T08:00:00.000Z',
  locationType: 'offline',
  locationText: 'Meeting Room 2',
  meetingUrl: null,
  project: ATLAS,
  canceledAt: null,
  cancelReason: null,
  participants: { total: 3, isParticipant: true },
  noteStatus: null,
  can: { update: true, cancel: true, trash: true, manageParticipants: true, writeNote: true },
  ...over,
});

/** Tomorrow 10:00–10:30 AM online, a personal event. */
export const syncItem = (over: Partial<EventListItemWire> = {}): EventListItemWire =>
  reviewItem({
    id: 'e-sync',
    title: 'Client sync',
    kind: 'meeting',
    startsAt: '2026-10-08T03:00:00.000Z',
    endsAt: '2026-10-08T03:30:00.000Z',
    locationType: 'online',
    locationText: null,
    meetingUrl: 'https://meet.example.com/abc',
    project: null,
    ...over,
  });

/** Oct 20, 6:00–9:00 PM, the team's party with confirmed minutes. */
export const partyItem = (over: Partial<EventListItemWire> = {}): EventListItemWire =>
  reviewItem({
    id: 'e-party',
    title: 'Team party',
    kind: 'team',
    startsAt: '2026-10-20T11:00:00.000Z',
    endsAt: '2026-10-20T14:00:00.000Z',
    locationText: 'Rooftop',
    noteStatus: 'confirmed',
    ...over,
  });

export const NICO = { id: 'u-nico', name: 'Nico Arya' };
export const RINA = { id: 'u-rina', name: 'Rina Putri' };
export const DODI = { id: 'u-dodi', name: 'Dodi Saputra' };

/** The review's detail: Nico created it, Rina and Dodi are guests, two agenda points, no minutes. */
export const reviewDetail = (over: Partial<EventDetailWire> = {}): EventDetailWire => {
  const { participants: _, ...item } = reviewItem();
  return {
    ...item,
    agenda: '1. Walk through the flow\n2. Decide the copy',
    remindersMinutes: [1440, 30],
    creator: NICO,
    canceledBy: null,
    participants: [RINA, NICO, DODI],
    note: null,
    createdAt: '2026-10-01T02:00:00.000Z',
    updatedAt: '2026-10-06T02:00:00.000Z',
    ...over,
  };
};

/** One page of the list (or a calendar window). */
export const eventsPage = (
  items: EventListItemWire[],
  {
    nextCursor = null,
    createEvent = true,
  }: { nextCursor?: string | null; createEvent?: boolean } = {},
): EventsPageWire => ({ items, nextCursor, caps: { createEvent } });

/** Guest candidates of `GET /events/people`. */
export const PEOPLE: EventPersonWire[] = [
  { ...DODI, jobTitle: 'Backend', image: null },
  { ...RINA, jobTitle: 'Designer', image: null },
  { id: 'u-ayu', name: 'Ayu Lestari', jobTitle: null, image: null },
];

/** A request a stub saw: its method, its path with the query, and its JSON body. */
export type Sent = { method: string; url: string; body: unknown };

/**
 * Routes that answer `reply(url, init)` for every request under `prefix`, and keep what was sent in `log`. For writes
 * whose path, method and body are what the test is about.
 */
export function recording(log: Sent[], prefix: string, reply: (s: Sent) => AuthReply): AuthRoutes {
  return {
    [prefix]: (url, init) => {
      const raw = init?.body;
      const sent = {
        method: init?.method ?? 'GET',
        url: url.slice(url.indexOf('/api/')),
        body: typeof raw === 'string' && raw ? JSON.parse(raw) : undefined,
      };
      log.push(sent);
      return reply(sent);
    },
  };
}
