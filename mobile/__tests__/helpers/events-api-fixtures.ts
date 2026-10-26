// A small fake `/api/app/events*` for the Events screen tests: the prototype's own events as the
// server would send them, and a handler that answers the way the real routes do (tab, kind,
// project, search text, the calendar window, and one event by id).
//
// Why a fake server and not a stubbed store: the screens now ask the server for every narrowing, so
// a test that stubbed the answers per assertion would prove the screen draws whatever it is handed
// and nothing about the request it makes. Here the query string decides the answer, as it does in
// production.
import type { EventDetailWire, EventListItemWire, EventsPageWire } from '@/data/events.wire';

import { listItem, type Reply } from './events-server';

const SINAR = { id: 'p-sinar', name: 'PT Sinar', status: 'active' };

/** Instants from a team-zone day and 24-hour time; WIB is UTC+7, so 14:00 WIB is 07:00Z. */
const at = (day: string, hour: number) => `${day}T${String(hour - 7).padStart(2, '0')}:00:00.000Z`;

/** The events of the prototype's Wednesday, 7 Oct 2026, as the server would send them. */
export const SERVER_EVENTS: EventListItemWire[] = [
  listItem({
    id: 'kickoff',
    title: 'Atlas kickoff',
    kind: 'meeting',
    startsAt: at('2026-10-01', 10),
    endsAt: at('2026-10-01', 11),
    locationText: 'Meeting Room 1',
    noteStatus: 'confirmed',
  }),
  listItem({
    id: 'daily',
    title: 'Daily stand-up',
    kind: 'other',
    startsAt: at('2026-10-06', 9),
    endsAt: at('2026-10-06', 9),
    locationType: 'online',
    locationText: null,
    meetingUrl: 'https://meet/daily',
  }),
  listItem({
    id: 'review',
    title: 'Onboarding design review',
    kind: 'review',
    startsAt: at('2026-10-07', 14),
    endsAt: at('2026-10-07', 15),
  }),
  listItem({
    id: 'sinar',
    title: 'Progress presentation to PT Sinar',
    kind: 'important',
    startsAt: at('2026-10-08', 10),
    endsAt: at('2026-10-08', 11),
    locationType: 'online',
    locationText: null,
    meetingUrl: 'https://meet/sinar',
    project: SINAR,
  }),
  listItem({
    id: 'sprint',
    title: 'Sprint review',
    kind: 'review',
    startsAt: at('2026-10-09', 13),
    endsAt: at('2026-10-09', 14),
    locationText: 'Meeting Room 1',
  }),
  listItem({
    id: 'rehearsal',
    title: 'Demo rehearsal',
    kind: 'meeting',
    startsAt: at('2026-10-25', 15),
    endsAt: at('2026-10-25', 16),
    locationText: 'Meeting Room 2',
  }),
  listItem({
    id: 'party',
    title: 'Team dinner',
    kind: 'team',
    startsAt: at('2026-10-30', 18),
    endsAt: at('2026-10-30', 20),
    locationText: 'Restoran Sari',
  }),
];

/** Events the `past` tab answers: everything that has already ended. */
export const PAST_IDS = ['kickoff', 'daily'];

const ends = (e: EventListItemWire) => e.endsAt;

/** `GET /events` as the server answers it, for the fixtures above. */
export function pageFor(search: URLSearchParams): EventsPageWire {
  const from = search.get('from');
  const to = search.get('to');
  const kind = search.get('kind');
  const projectId = search.get('projectId');
  const q = search.get('q')?.toLowerCase();
  let items = [...SERVER_EVENTS];
  if (from && to) {
    // The window replaces the tab's cut on now, which is the whole point of `?from=&to=` (A9).
    items = items.filter((e) => ends(e).slice(0, 10) >= from && e.startsAt.slice(0, 10) <= to);
  } else {
    const past = search.get('tab') === 'past';
    items = items.filter((e) => PAST_IDS.includes(e.id) === past);
  }
  if (kind) items = items.filter((e) => e.kind === kind);
  if (projectId) items = items.filter((e) => e.project?.id === projectId);
  // The server matches `q` against the title only (GAP-A10).
  if (q) items = items.filter((e) => e.title.toLowerCase().includes(q));
  return { items, nextCursor: null, caps: { createEvent: true } };
}

/** `GET /events/:id` for the fixtures above; anything else is the 404 a hidden event also gives. */
export function detailFor(id: string): Reply {
  const row = SERVER_EVENTS.find((e) => e.id === id);
  if (!row) {
    return {
      status: 404,
      body: {
        error: 'Acara tidak ditemukan.',
        code: 'NOT_FOUND',
        status: 404,
        requestId: 'req-404',
      },
    };
  }
  const { participants, ...base } = row;
  void participants;
  const detail: EventDetailWire = {
    ...base,
    agenda: id === 'review' ? 'New onboarding flow\nFeedback from the trial users' : null,
    remindersMinutes: [1440, 30],
    creator: { id: 'u-rina', name: 'Rina' },
    canceledBy: null,
    participants: [
      { id: 'u-rina', name: 'Rina' },
      { id: 'u-nico', name: 'Nico' },
    ],
    note: null,
    createdAt: at('2026-10-01', 9),
    updatedAt: at('2026-10-07', 8),
  };
  return { body: detail };
}

/** The whole fake API: reads from the fixtures, writes answered as the routes answer them. */
export function eventsApiFixture(call: {
  method: string;
  path: string;
  search: URLSearchParams;
}): Reply {
  const { method, path, search } = call;
  if (path === '/api/app/home') {
    return { body: { now: { today: '2026-10-07', timeZone: 'Asia/Jakarta' } } };
  }
  if (path === '/api/app/events/people') {
    return {
      body: {
        items: [
          { id: 'u-sri', name: 'Sri', jobTitle: 'Designer' },
          { id: 'u-dodi', name: 'Dodi', jobTitle: 'Engineer' },
        ],
      },
    };
  }
  if (path === '/api/app/events' && method === 'GET') return { body: pageFor(search) };
  if (path === '/api/app/events' && method === 'POST') return detailFor('review');
  const one = /^\/api\/app\/events\/([^/]+)$/.exec(path);
  if (one?.[1]) {
    if (method === 'DELETE') {
      return { body: { trash: { kind: 'event', id: one[1], label: 'Acara' } } };
    }
    return detailFor(one[1]);
  }
  const action = /^\/api\/app\/events\/([^/]+)\/(cancel|participants)/.exec(path);
  if (action?.[1]) return detailFor(action[1]);
  if (path.startsWith('/api/app/trash/')) return { body: { ok: true } };
  return {
    status: 404,
    body: {
      error: `No fixture for ${method} ${path}`,
      code: 'NOT_FOUND',
      status: 404,
      requestId: 'x',
    },
  };
}
