/**
 * `/api/app/inbox` behind the Inbox screens: the lanes page by cursor inside one resource each,
 * a refresh keeps the cards already opened, the reads invalidate what they change, and sign out
 * forgets all of it. The screens themselves are __tests__/inbox/inbox.test.tsx.
 */
import { getInboxLane, toCard } from '@/data/inbox';
import {
  inboxActionCount,
  inboxActionResource,
  inboxCountResource,
  inboxInfoResource,
  loadMoreInbox,
  markAllInboxRead,
  markInboxRead,
} from '@/data/inbox.api';
import { appHref } from '@/data/inbox.links';
import { forgetAllResources, knownResources } from '@/data/resource';
import { clearSession } from '@/session/session.state';

import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { card, counts, news, page, query } from '../helpers/inbox-fixtures';

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};
const lists = () => (server?.calls ?? []).filter((u) => u.includes('/api/app/inbox?'));

beforeEach(() => forgetAllResources());
afterEach(() => {
  server?.restore();
  server = null;
});

describe('a card in the screen shape', () => {
  test("keeps the server's sentence and button, and adds only the app's own furniture", () => {
    expect(toCard(card({ bundleCount: 3 }))).toEqual({
      id: 'n-1',
      lane: 'action',
      actor: { id: 'u-rina', name: 'Rina Wulandari' },
      sentence: 'Rina Wulandari menugaskan #12 kepada Anda',
      meta: '#12 · Atlas Project',
      time: '14:05',
      excerpt: null,
      bundle: '3 changes',
      open: { label: 'Lihat tugas', href: '/tasks/12' },
      read: false,
      group: 'today',
    });
  });

  test('an older card shows its day, a news card is filed by when it last changed', () => {
    const c = toCard(
      news({
        group: 'older',
        createdAt: '2026-09-01T01:00:00Z',
        updatedAt: '2026-10-01T01:00:00Z',
      }),
    );
    expect(c?.time).toBe('Oct 1');
  });

  test('a kind the server could not word is left out, not worded by the app', () => {
    expect(toCard(card({ sentence: null, button: null }))).toBeNull();
  });

  test('a system card has no actor, and a page the app lacks has no button', () => {
    const c = toCard(
      news({
        actor: null,
        href: '/app/settings',
        ref: { type: 'leave', id: 'l', number: null },
        payload: {},
      }),
    );
    expect(c).toMatchObject({ actor: null, open: null, meta: '' });
  });

  test.each([
    ['/app/tasks/12', '/tasks/12'],
    ['/app/tasks', '/tasks'],
    ['/app/projects/p-1', '/projects/p-1'],
    ['/app/events/e-1', '/events/e-1'],
    ['/dashboard/users', '/more/users'],
    ['/app/settings', null],
    ['/app/inbox', null],
  ])('maps %s to %s', (web, app) => {
    expect(appHref(web)).toBe(app);
  });
});

describe('a lane, page by page', () => {
  test('groups by the server day buckets and says whether more is on the server', async () => {
    serve({
      '/api/app/inbox?lane=info': {
        body: page(
          [
            news({ id: 'a' }),
            news({ id: 'b', group: 'older' }),
            news({ id: 'c', group: 'yesterday' }),
          ],
          'cur-1',
        ),
      },
    });
    await inboxInfoResource.ensure();
    const lane = getInboxLane('info');
    expect(lane?.days.map((d) => [d.label, d.cards.map((c) => c.id)])).toEqual([
      ['Today', ['a']],
      ['Yesterday', ['c']],
      ['Older', ['b']],
    ]);
    expect(lane?.more).toBe(true);
    expect(query(lists()[0] ?? '')).toEqual({ lane: 'info', limit: '25' });
  });

  test('"Load more" appends the next page after the cursor', async () => {
    serve({
      '/api/app/inbox?lane=action': (url) =>
        query(url).cursor === 'cur-1'
          ? { body: page([card({ id: 'b' })]) }
          : { body: page([card({ id: 'a' })], 'cur-1') },
    });
    await inboxActionResource.ensure();
    await loadMoreInbox('action');
    expect(getInboxLane('action')?.cards.map((c) => c.id)).toEqual(['a', 'b']);
    expect(getInboxLane('action')?.more).toBe(false);
    expect(query(lists()[1] ?? '')).toMatchObject({ cursor: 'cur-1', limit: '25' });
    // Nothing left: a second press asks nothing.
    await loadMoreInbox('action');
    expect(lists()).toHaveLength(2);
  });

  test('a refresh after a write asks for as many cards as are on screen, so the list does not fold', async () => {
    const thirty = Array.from({ length: 30 }, (_, i) => card({ id: `c${i}` }));
    serve({
      '/api/app/inbox?lane=action': (url) =>
        query(url).cursor
          ? { body: page(thirty.slice(25)) }
          : { body: page(thirty.slice(0, Number(query(url).limit)), 'cur-1') },
      '/read': { body: { ok: true } },
      '/api/app/inbox/count': { body: counts(30) },
    });
    await inboxActionResource.ensure();
    await loadMoreInbox('action');
    await markInboxRead('c0', 'action');
    await waitIdle();
    expect(query(lists().at(-1) ?? '')).toEqual({ lane: 'action', limit: '30' });
    expect(getInboxLane('action')?.cards).toHaveLength(30);
  });

  test('a cursor the server no longer knows starts the lane over from page one', async () => {
    serve({ '/api/app/inbox?lane=info': { body: page([news({ id: 'first' })], 'stale') } });
    await inboxInfoResource.ensure();
    // The server has since forgotten that cursor.
    const badCursor = {
      error: 'Halaman Inbox tidak dikenali. Muat ulang Inbox dari awal.',
      code: 'BAD_CURSOR',
    };
    server?.use({
      '/api/app/inbox?lane=info': (url) =>
        query(url).cursor
          ? { status: 400, body: badCursor }
          : { body: page([news({ id: 'fresh' })]) },
    });
    const state = await loadMoreInbox('info');
    expect(state.phase).toBe('ready');
    expect(getInboxLane('info')?.cards.map((c) => c.id)).toEqual(['fresh']);
  });

  test('a failed "Load more" keeps the cards and reports the server sentence', async () => {
    serve({
      '/api/app/inbox?lane=info': (url) =>
        query(url).cursor
          ? { status: 500, body: { error: 'Server sedang bermasalah.', code: 'INTERNAL' } }
          : { body: page([news({ id: 'a' })], 'cur-1') },
    });
    await inboxInfoResource.ensure();
    const state = await loadMoreInbox('info');
    expect(state.phase).toBe('failed');
    expect(state.error?.message).toBe('Server sedang bermasalah.');
    expect(getInboxLane('info')?.cards.map((c) => c.id)).toEqual(['a']);
  });
});

/** Lets the background refetches an invalidate started settle (a resource never asked stays empty). */
const waitIdle = async () => {
  for (const r of [inboxActionResource, inboxInfoResource, inboxCountResource])
    if (r.peek().phase !== 'empty') await r.ensure();
};

describe('the reads and the count', () => {
  test('the action count is null until the server answers: no badge, not a made-up 0', async () => {
    serve({ '/api/app/inbox/count': { body: counts(4, 2) } });
    expect(inboxActionCount()).toBeNull();
    await inboxCountResource.ensure();
    expect(inboxActionCount()).toBe(4);
  });

  test('marking one card read posts it and refreshes its lane and the count', async () => {
    let read = false;
    const s = serve({
      '/api/app/inbox?lane=info': () => ({ body: page([news({ id: 'a', read })]) }),
      '/api/app/inbox/a/read': () => {
        read = true;
        return { body: { ok: true } };
      },
      '/api/app/inbox/count': () => ({ body: counts(0, read ? 0 : 1) }),
    });
    await Promise.all([inboxInfoResource.ensure(), inboxCountResource.ensure()]);
    await markInboxRead('a', 'info');
    await waitIdle();
    expect(getInboxLane('info')?.cards[0]?.read).toBe(true);
    expect(inboxCountResource.current()).toEqual(counts(0, 0));
    expect(s.calls.filter((u) => u.endsWith('/api/app/inbox/a/read'))).toHaveLength(1);
  });

  test('"Mark all as read" answers how many changed; a failure changes nothing and keeps its reason', async () => {
    serve({
      '/api/app/inbox/read-all': { body: { updated: 3 } },
      '/api/app/inbox?lane=info': { body: page([news()]) },
      '/api/app/inbox/count': { body: counts(0, 0) },
    });
    await expect(markAllInboxRead()).resolves.toEqual({ updated: 3 });

    server?.use({
      '/api/app/inbox/read-all': {
        status: 429,
        body: { error: 'Terlalu banyak permintaan.', code: 'RATE_LIMITED' },
      },
    });
    await expect(markAllInboxRead()).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      message: 'Terlalu banyak permintaan.',
    });
  });
});

test('sign out forgets both lanes and the count, which are in the registry', async () => {
  serve({
    '/api/app/inbox?lane=action': { body: page([card()]) },
    '/api/app/inbox/count': { body: counts(1) },
  });
  await Promise.all([inboxActionResource.ensure(), inboxCountResource.ensure()]);
  expect(knownResources()).toEqual(
    expect.arrayContaining([inboxActionResource, inboxInfoResource, inboxCountResource]),
  );
  clearSession();
  expect(getInboxLane('action')).toBeNull();
  expect(inboxActionCount()).toBeNull();
});
