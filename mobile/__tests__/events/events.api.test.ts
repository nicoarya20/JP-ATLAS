// What the Events module asks the server for, and what a successful write makes stale.
//
// The rules under test are the ones in `mobile/docs/phase2-pola-data.md`: fresh data is not fetched
// twice (rule 1), and after a write every resource that could have gone wrong is marked stale and
// refetched (rule 2). Fetch is stubbed; nothing leaves the machine.
import {
  cancelEvent,
  createEvent,
  eventDetailResource,
  eventsListResource,
  eventsWindowResource,
  loadMoreEvents,
  restoreEvent,
  syncEventPeople,
  syncEventsList,
  syncEventsWindow,
  trashEvent,
  updateEvent,
} from '@/data/events.api';
import { homeResource } from '@/data/home.api';

import { apiError, detailItem, listItem, page, serveEventsApi } from '../helpers/events-server';

const EVENTS = '/api/app/events';

let answer: (call: { path: string; search: URLSearchParams; method: string }) => unknown;

const server = serveEventsApi((call) => {
  const reply = answer(call);
  return (reply as { status?: number }) &&
    typeof reply === 'object' &&
    'status' in (reply as object)
    ? (reply as { status: number; body: unknown })
    : { body: reply };
});

beforeEach(() => {
  answer = () => page([listItem()]);
});

const listed = () => server.to(EVENTS).map((c) => Object.fromEntries(c.search));

describe('asking for the list', () => {
  test('sends the tab, the kind, the project, the search text and a limit', async () => {
    await syncEventsList({ tab: 'past', kind: 'review', projectId: 'p-atlas', q: 'design' });
    expect(listed()).toEqual([
      { tab: 'past', kind: 'review', projectId: 'p-atlas', q: 'design', limit: '30' },
    ]);
  });

  test('asks once for a key it already holds, however many screens ask', async () => {
    await syncEventsList({ tab: 'upcoming' });
    await syncEventsList({ tab: 'upcoming' });
    await eventsListResource.ensure();
    expect(server.to(EVENTS)).toHaveLength(1);
  });

  test('a changed key is a fresh first page, with no cursor carried over', async () => {
    answer = () => page([listItem()], { nextCursor: 'c1' });
    await syncEventsList({ tab: 'upcoming' });
    await loadMoreEvents();
    expect(listed().at(-1)).toMatchObject({ cursor: 'c1' });
    await syncEventsList({ tab: 'past' });
    expect(listed().at(-1)).toEqual({ tab: 'past', limit: '30' });
  });

  test('"load more" reads one page further and keeps both pages', async () => {
    answer = ({ search }) =>
      search.get('cursor') === 'c1'
        ? page([listItem({ id: 'e-2' })])
        : page([listItem()], { nextCursor: 'c1' });
    await syncEventsList({ tab: 'upcoming' });
    expect(eventsListResource.peek().data).toMatchObject({ more: true });
    await loadMoreEvents();
    const held = eventsListResource.peek().data;
    expect(held?.items.map((i) => i.id)).toEqual(['e-review', 'e-2']);
    expect(held?.more).toBe(false);
  });

  test('"load more" does nothing when the server said there is no more', async () => {
    await syncEventsList({ tab: 'upcoming' });
    await loadMoreEvents();
    expect(server.to(EVENTS)).toHaveLength(1);
  });

  test('a cursor the server will not read starts the list over instead of failing', async () => {
    let asked = 0;
    answer = ({ search }) => {
      asked += 1;
      if (search.get('cursor')) return apiError('BAD_CURSOR', 'Halaman tidak dikenali.');
      return page([listItem()], { nextCursor: asked > 1 ? null : 'c1' });
    };
    await syncEventsList({ tab: 'upcoming' });
    await loadMoreEvents();
    expect(eventsListResource.peek().phase).toBe('ready');
    expect(eventsListResource.peek().data?.items).toHaveLength(1);
  });

  test('a failure keeps the error for the screen to show and offer Try again', async () => {
    answer = () => apiError('INTERNAL', 'Server sedang bermasalah.', 500);
    await syncEventsList({ tab: 'upcoming' });
    const state = eventsListResource.peek();
    expect(state.phase).toBe('failed');
    expect(state.error?.message).toBe('Server sedang bermasalah.');
  });
});

describe('asking for a calendar window', () => {
  test('sends the window and the filters, not a tab', async () => {
    await syncEventsWindow({ from: '2026-10-01', to: '2026-10-31', kind: 'meeting' });
    expect(listed()).toEqual([
      { from: '2026-10-01', to: '2026-10-31', kind: 'meeting', limit: '30' },
    ]);
  });

  test('reads every page of the window, because a grid needs all of it', async () => {
    const pages = ['c1', 'c2', null];
    let at = 0;
    answer = () => {
      const next = pages[at] ?? null;
      at += 1;
      return page([listItem({ id: `e-${at}` })], { nextCursor: next });
    };
    await syncEventsWindow({ from: '2026-10-01', to: '2026-10-31' });
    expect(eventsWindowResource.peek().data?.items.map((i) => i.id)).toEqual(['e-1', 'e-2', 'e-3']);
    expect(eventsWindowResource.peek().data?.truncated).toBe(false);
  });

  test('says so when the window holds more than one read can carry', async () => {
    answer = () => page([listItem()], { nextCursor: 'more' });
    await syncEventsWindow({ from: '2026-10-01', to: '2026-10-31' });
    expect(eventsWindowResource.peek().data?.truncated).toBe(true);
  });
});

describe('asking for one event', () => {
  test('is one resource per id, so two open details never share a value', async () => {
    answer = ({ path }) => detailItem({ id: path.endsWith('e-a') ? 'e-a' : 'e-b' });
    await eventDetailResource('e-a').ensure();
    await eventDetailResource('e-b').ensure();
    expect(eventDetailResource('e-a').current()?.id).toBe('e-a');
    expect(eventDetailResource('e-b').current()?.id).toBe('e-b');
    expect(eventDetailResource('e-a')).toBe(eventDetailResource('e-a'));
  });

  test('a 404 is kept as the failure the screen turns into "Event not found"', async () => {
    answer = () => apiError('NOT_FOUND', 'Acara tidak ditemukan.', 404);
    await eventDetailResource('gone').ensure();
    expect(eventDetailResource('gone').peek().error?.status).toBe(404);
  });
});

describe('the guest picker', () => {
  test('sends the typed text and asks again only when it changed', async () => {
    answer = () => ({ items: [{ id: 'u-sri', name: 'Sri', jobTitle: null }] });
    await syncEventPeople('sr');
    await syncEventPeople('sr');
    const calls = server.to('/api/app/events/people');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.search.get('q')).toBe('sr');
  });
});

describe('what a successful write makes stale', () => {
  /** Everything a write could have changed, loaded so staleness is observable. */
  const loadAll = async (id: string) => {
    await syncEventsList({ tab: 'upcoming' });
    await syncEventsWindow({ from: '2026-10-01', to: '2026-10-31' });
    await eventDetailResource(id).ensure();
    await homeResource.ensure();
  };

  beforeEach(() => {
    answer = ({ path }) =>
      path === '/api/app/home'
        ? { now: { today: '2026-10-07', timeZone: 'Asia/Jakarta' } }
        : path.startsWith(`${EVENTS}/`)
          ? detailItem()
          : page([listItem()]);
  });

  test.each([
    ['cancel', () => cancelEvent('e-review', 'Ruang dipakai.')],
    ['update', () => updateEvent('e-review', { title: 'New title' })],
    ['trash', () => trashEvent('e-review')],
    ['restore', () => restoreEvent('e-review')],
  ])('%s refetches the list, the calendar, its own detail and Home', async (_name, run) => {
    await loadAll('e-review');
    const before = server.calls().length;
    await run();
    // One request for the write itself, then one refetch per resource it could have made wrong.
    const after = server
      .calls()
      .slice(before + 1)
      .map((c) => c.path);
    expect(after).toContain(EVENTS);
    expect(after).toContain('/api/app/events/e-review');
    expect(after).toContain('/api/app/home');
    expect(after.filter((p) => p === EVENTS)).toHaveLength(2); // the list and the window
  });

  test('a new event refetches the list, the calendar and Home', async () => {
    await loadAll('e-review');
    const before = server.calls().length;
    await createEvent({ title: 'x', startsAt: 'a', endsAt: 'b' });
    const after = server
      .calls()
      .slice(before + 1)
      .map((c) => c.path);
    expect(after.filter((p) => p === EVENTS)).toHaveLength(2);
    expect(after).toContain('/api/app/home');
  });

  test('a failed write leaves every store alone: nothing changed on the server', async () => {
    await loadAll('e-review');
    answer = () => apiError('NOT_MANAGER', 'Hanya pengelola.', 403);
    const before = server.calls().length;
    await expect(cancelEvent('e-review', 'nope')).rejects.toThrow('Hanya pengelola.');
    expect(server.calls()).toHaveLength(before + 1);
    expect(eventsListResource.peek().stale).toBe(false);
  });
});
