// The Inbox data layer: one wire card to one row, the day buckets the server decided, and what a
// successful write marks stale. Every request is stubbed; nothing leaves the machine.
import { getInbox, refHref, respondCards, updateGroups } from '@/data/inbox';
import {
  inboxActionCount,
  inboxActionResource,
  inboxCountResource,
  inboxInfoResource,
  markAllNewsRead,
  markCardRead,
} from '@/data/inbox.api';
import { instantDate } from '@/data/instant';

import { serveAuth } from '../helpers/auth-server';
import {
  ACTION_PAGE,
  INBOX_COUNTS,
  INFO_PAGE,
  inboxRoutes,
  loadInbox,
  PENDING,
} from '../helpers/inbox-fixtures';

let server: ReturnType<typeof serveAuth>;

const serve = (routes = inboxRoutes()) => {
  server = serveAuth(routes);
  return server;
};
/** How many requests went to a path, for the invalidate rules. */
const hits = (path: string) => server.calls.filter((url) => url.includes(path)).length;
/** Lets the background refetch an invalidate starts finish, so no state lands after the test. */
const settle = () =>
  Promise.all([
    inboxActionResource.ensure(),
    inboxInfoResource.ensure(),
    inboxCountResource.ensure(),
  ]);

afterEach(() => server?.restore());

describe('cards that need a response', () => {
  beforeEach(async () => {
    serve();
    await loadInbox();
  });

  test("keeps the server's sentence and builds the line under it", () => {
    const cards = respondCards();
    expect(cards.map((c) => c.key)).toEqual(['n-assigned', 'n-mention', 'n-pending']);
    expect(cards[0]).toMatchObject({
      lead: { kind: 'person', name: 'Nico Arya', image: null },
      title: 'Nico Arya menugaskan "Prepare test data" kepada Anda.',
      meta: '#16 · Atlas Project · 09:30',
      action: 'Buka tugas',
      href: '/tasks/16',
    });
    // The sentence already names the task, so the card does not repeat it as a body.
    expect(cards[0].body).toBeUndefined();
  });

  test('an excerpt becomes the quoted body', () => {
    expect(respondCards()[1].body).toEqual({
      text: '@Nico SSO-nya sudah bisa dicoba?',
      tone: 'quote',
    });
  });

  test('a card nobody is behind is marked as the system, and keeps its own route', () => {
    expect(respondCards()[2]).toMatchObject({
      lead: { kind: 'system' },
      title: 'Sari Wulandari menunggu persetujuan akun.',
      href: '/more/users',
    });
  });

  test('a kind this build does not know is dropped, not drawn blank', () => {
    expect(respondCards().some((c) => c.key === 'n-unknown')).toBe(false);
    expect(ACTION_PAGE.items).toHaveLength(4);
  });

  test('the bell count is the server number, and null before it arrives', () => {
    expect(inboxActionCount()).toBe(INBOX_COUNTS.action);
    inboxCountResource.forget();
    expect(inboxActionCount()).toBeNull();
  });
});

describe('dates and zones', () => {
  beforeEach(async () => {
    serve();
    await loadInbox();
  });

  test('an instant on the UTC day before still reads as today in the team zone', () => {
    // 2026-10-06T23:00Z is 7 Oct 06.00 in Asia/Jakarta: read as UTC the card would land yesterday.
    expect(instantDate(PENDING.createdAt, 'UTC')).toBe('2026-10-06');
    expect(instantDate(PENDING.createdAt)).toBe('2026-10-07');
    expect(respondCards()[2].meta).toBe('06:00');
  });

  test("a card from before today shows its date, today's shows its clock time", () => {
    const rows = updateGroups().flatMap((g) => g.rows);
    expect(rows[0].meta).toBe('#14 · Atlas Project · 10:00');
    expect(rows[1].meta).toBe('Atlas Project · Oct 6');
    expect(rows[2].meta).toBe('Atlas Project · Oct 1');
    expect(rows[0].time).toBe('10:00');
  });
});

describe('latest updates', () => {
  beforeEach(async () => {
    serve();
    await loadInbox();
  });

  test("groups by the server's bucket, Older included, and reads unread per card", () => {
    expect(updateGroups()).toMatchObject([
      { key: 'today', rows: [{ key: 'n-commented', unread: true }] },
      { key: 'yesterday', rows: [{ key: 'n-role', unread: false }] },
      { key: 'older', rows: [{ key: 'n-event', unread: true }] },
    ]);
  });

  test('says when only a page of the lane was loaded', () => {
    expect(getInbox()).toMatchObject({ moreRespond: false, moreUpdates: true });
    expect(INFO_PAGE.nextCursor).toBe('cursor-2');
  });
});

describe('nothing loaded yet', () => {
  test('both tabs are empty rather than throwing, and nothing says there is more', () => {
    expect(getInbox()).toEqual({
      respond: [],
      updates: [
        { key: 'today', rows: [] },
        { key: 'yesterday', rows: [] },
        { key: 'older', rows: [] },
      ],
      moreRespond: false,
      moreUpdates: false,
    });
  });
});

describe('routes, not the server web paths', () => {
  test('each ref type lands on a screen of this app', () => {
    expect(refHref({ type: 'task', id: 't-1', number: 14 })).toBe('/tasks/14');
    expect(refHref({ type: 'task', id: 't-1', number: null })).toBe('/tasks?scope=all');
    expect(refHref({ type: 'comment', id: 'c-1', number: 9 })).toBe('/tasks/9');
    expect(refHref({ type: 'project', id: 'atlas', number: null })).toBe('/projects/atlas');
    expect(refHref({ type: 'event', id: 'review', number: null })).toBe('/events/review');
    expect(refHref({ type: 'user', id: 'u-1', number: null })).toBe('/more/users');
    expect(refHref({ type: 'leave', id: 'l-1', number: null })).toBe('/more/settings');
    expect(refHref({ type: 'what', id: 'x', number: null })).toBe('/more/inbox');
  });
});

describe('what a write marks stale', () => {
  test('mark all read refetches the news lane and the bell, never the work queue', async () => {
    serve({ ...inboxRoutes(), '/api/app/inbox/read-all': { body: { updated: 2 } } });
    await loadInbox();
    expect([hits('lane=action'), hits('lane=info'), hits('/count')]).toEqual([1, 1, 1]);

    await markAllNewsRead();
    await settle();

    expect([hits('lane=action'), hits('lane=info'), hits('/count')]).toEqual([1, 2, 2]);
  });

  test('marking one card read refetches both lanes and the bell: the id may be in either', async () => {
    serve({ ...inboxRoutes(), '/api/app/inbox/n-commented/read': { body: { ok: true } } });
    await loadInbox();

    await markCardRead('n-commented');
    await settle();

    expect([hits('lane=action'), hits('lane=info'), hits('/count')]).toEqual([2, 2, 2]);
  });

  test('a write that failed marks nothing stale: the server changed nothing', async () => {
    serve({
      ...inboxRoutes(),
      '/api/app/inbox/read-all': {
        status: 500,
        body: { error: 'Gagal menandai terbaca.', code: 'INTERNAL' },
      },
    });
    await loadInbox();

    await expect(markAllNewsRead()).rejects.toThrow('Gagal menandai terbaca.');

    expect([hits('lane=action'), hits('lane=info'), hits('/count')]).toEqual([1, 1, 1]);
  });
});
