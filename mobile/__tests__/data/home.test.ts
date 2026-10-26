// Home's data layer: one `GET /api/app/home` payload mapped to the shape the screen reads, the two
// chips the server can stand behind, and what a focus row's button marks stale. Every request is
// stubbed; nothing leaves the machine.
import { today } from '@/data/clock';
import { daysBetween, daysToSunday, monthDay, weekdayMonthDay } from '@/data/dates';
import { getHome } from '@/data/home';
import { runFocusAction } from '@/data/home.actions';
import { type HomeResponse, homeResource } from '@/data/home.api';
import type { FocusGroupKey, HomeData, StatKey, Widget } from '@/data/home.types';
import { ensureInboxCount, inboxCountResource } from '@/data/inbox.api';
import { instantDate } from '@/data/instant';

import { serveAuth } from '../helpers/auth-server';
import { HOME_WIRE, homeRoutes, homeWithout, loadHome } from '../helpers/home-fixtures';
import { inboxRoutes, loadInbox } from '../helpers/inbox-fixtures';

let server: ReturnType<typeof serveAuth>;

const serve = (routes = { ...homeRoutes(), ...inboxRoutes() }) => {
  server = serveAuth(routes);
  return server;
};
const hits = (path: string) => server.calls.filter((url) => url.includes(path)).length;

/** Home plus the Inbox count, both in the store, as the screen's own effect would leave them. */
async function load(routes?: Parameters<typeof serve>[0]) {
  serve(routes);
  await loadHome();
  await ensureInboxCount();
}

/** The payload is read as it arrives; the only way to look at the shape is to go through the store. */
const home = (): HomeData => {
  const data = getHome();
  if (!data) throw new Error('home has not loaded');
  return data;
};
const stat = (key: StatKey) => home().stats.find((s) => s.key === key);
const section = <T>(w: Widget<T>): T => {
  if (!w.ok) throw new Error('section failed');
  return w.data;
};
const groupNos = (): Partial<Record<FocusGroupKey, number[]>> =>
  Object.fromEntries(
    section(home().focus)
      .groups.filter((g) => g.tasks.length)
      .map((g) => [g.key, g.tasks.map((t) => t.no)]),
  );

afterEach(() => server?.restore());

describe('dates', () => {
  test('labels and week maths in UTC', () => {
    expect(monthDay('2026-10-07')).toBe('Oct 7');
    expect(weekdayMonthDay('2026-10-01')).toBe('Thu, Oct 1');
    expect(daysBetween('2026-10-07', '2026-10-05')).toBe(-2);
    expect(daysToSunday('2026-10-07')).toBe(4);
    expect(() => monthDay('Oct 7')).toThrow('Not an ISO date (YYYY-MM-DD): Oct 7');
  });
});

describe('nothing loaded yet', () => {
  test('getHome is null rather than an empty screen pretending to be data', () => {
    expect(getHome()).toBeNull();
  });
});

describe('the header', () => {
  test("greets with the server's part of the day and the account's own first name", async () => {
    await load();
    expect(home().greeting).toBe('Good morning');
    // The session's account is Nico Arya (helpers/session-fixtures), not a sample row.
    expect(home().me.name).toBe('Nico');
  });

  test.each([
    ['siang', 'Good afternoon'],
    ['sore', 'Good afternoon'],
    ['malam', 'Good evening'],
  ])('%s reads as "%s"', async (greeting, english) => {
    const now = { ...HOME_WIRE.now, greeting } as HomeResponse['now'];
    await load({ ...homeRoutes({ ...HOME_WIRE, now }), ...inboxRoutes() });
    expect(home().greeting).toBe(english);
  });

  test('the clock lands in the session, so every dated screen agrees with the server', async () => {
    await load();
    expect(today()).toBe(HOME_WIRE.now.today);
  });
});

describe('the stat chips', () => {
  test('Assigned counts every open task of mine, with the overdue ones under it', async () => {
    await load();
    expect(stat('assigned')).toMatchObject({
      count: 7,
      sub: { kind: 'overdue', n: 1 },
      alert: true,
      target: 'tasks.all',
    });
  });

  test('Inbox is the bell count, and says so when it is zero', async () => {
    await load();
    expect(stat('inbox')).toMatchObject({
      count: null,
      sub: { kind: 'toRespond', n: 3 },
      target: 'inbox.respond',
    });

    await load({ ...homeRoutes(), ...inboxRoutes({ counts: { action: 0, infoUnread: 0 } }) });
    inboxCountResource.forget();
    await ensureInboxCount();
    expect(stat('inbox')?.sub).toEqual({ kind: 'caughtUp' });
  });

  test('on track once nothing of mine is late', async () => {
    const focus = { ok: true, data: { ...section(HOME_WIRE.focus), overdueTotal: 0 } } as const;
    await load({ ...homeRoutes({ ...HOME_WIRE, focus }), ...inboxRoutes() });
    expect(stat('assigned')).toMatchObject({ sub: { kind: 'onTrack' }, alert: false });
  });

  test('a chip whose number did not arrive is left out, not shown as zero', async () => {
    serve({ ...homeRoutes(homeWithout('focus')), ...inboxRoutes() });
    await loadHome();
    expect(home().stats.map((s) => s.key)).toEqual([]);

    await ensureInboxCount();
    expect(home().stats.map((s) => s.key)).toEqual(['inbox']);
  });

  test('only Assigned and Inbox are offered: the rest went with their GAPs', async () => {
    await load();
    expect(home().stats.map((s) => s.key)).toEqual(['assigned', 'inbox']);
  });
});

describe('My Focus', () => {
  beforeEach(() => load());

  test("buckets the server's groups, tomorrow and week together, undated last", () => {
    expect(groupNos()).toEqual({ overdue: [12], today: [14], thisWeek: [9], noDate: [20] });
  });

  test('each row carries the step the server offered, and no row invents one', () => {
    const rows = section(home().focus).groups.flatMap((g) => g.tasks);
    expect(rows.map((t) => [t.no, t.action])).toEqual([
      [12, null],
      [14, 'complete'],
      [9, 'start'],
      [20, 'start'],
    ]);
  });

  test('a row knows how late it is, or when it is due', () => {
    const rows = section(home().focus).groups.flatMap((g) => g.tasks);
    expect(rows[0]).toMatchObject({ dueDate: '2026-10-05', overdueDays: 2 });
    expect(rows[3]).toMatchObject({ dueDate: null, overdueDays: null });
  });

  test("the totals are the server's windows, not the rows on screen", () => {
    expect(section(home().focus)).toMatchObject({ openCount: 7, reviewCount: 2, empty: false });
    expect(section(home().focus).review).toEqual([
      {
        id: 't-17',
        no: 17,
        title: 'Fix the save button on the profile page',
        project: 'Atlas Project',
      },
    ]);
  });
});

describe('Agenda, projects and the lists', () => {
  beforeEach(() => load());

  test('the next meeting is the first the server sent, in the team zone', () => {
    // 2026-10-06T23:00Z is 7 Oct 06.00 in Asia/Jakarta: read as UTC it would fall yesterday.
    expect(instantDate(HOME_WIRE.now.iso, 'UTC')).toBe('2026-10-07');
    expect(instantDate('2026-10-06T23:00:00Z', 'UTC')).toBe('2026-10-06');
    expect(section(home().agenda)).toEqual({
      id: 'review',
      href: '/events/review',
      title: 'Onboarding design review',
      time: '06:00',
      date: '2026-10-07',
      mode: 'In person',
    });
  });

  test('a project with no tasks keeps a null progress, which is not 0%', () => {
    expect(section(home().projects)).toEqual([
      {
        id: 'atlas',
        name: 'Atlas Project',
        due: '2026-10-31',
        progress: 40,
        condition: 'at_risk',
        reason: 'baru 4 dari 10 tugas selesai',
      },
      {
        id: 'sinar',
        name: 'PT Sinar Client Portal',
        due: null,
        progress: null,
        condition: null,
        reason: null,
      },
    ]);
  });

  test("done rows keep the server's own words for who and when", () => {
    expect(section(home().done)).toEqual([
      { id: 't-5', title: 'Tile price survey', who: 'Anda · hari ini' },
    ]);
  });

  test('an activity line gets its project and when it happened, by the team clock', () => {
    expect(section(home().activity)).toEqual([
      {
        id: 'a-1',
        text: 'Anda menyelesaikan "Tile price survey"',
        meta: 'Kitchen Renovation · 09:00',
      },
      {
        id: 'a-2',
        text: 'Rina Hapsari menambahkan catatan di "Order catering"',
        meta: 'Family Celebration · Oct 6',
      },
    ]);
  });

  test('all three Ask answers come through, with the bars as the server numbered them', () => {
    expect(section(home().ask)).toHaveLength(3);
    expect(section(home().ask)[0].bars[0]).toEqual({
      label: 'Atlas Project',
      pct: 40,
      display: '4/10',
    });
  });
});

describe('a section that failed', () => {
  test('costs its own card and nothing else', async () => {
    await load({ ...homeRoutes(homeWithout('briefing')), ...inboxRoutes() });
    expect(home().briefing.ok).toBe(false);
    expect(home().focus.ok).toBe(true);
    expect(home().activity.ok).toBe(true);
  });

  test('a section missing from the payload altogether is read the same way', async () => {
    const { activity: _dropped, ...withoutActivity } = HOME_WIRE;
    await load({ ...homeRoutes(withoutActivity), ...inboxRoutes() });
    expect(home().activity.ok).toBe(false);
    expect(home().briefing.ok).toBe(true);
  });
});

describe("what a focus row's button marks stale", () => {
  const complete = () => ({ id: 't-14', no: 14, action: 'complete' as const });

  test('Home and the Inbox are refetched; a failed write refetches nothing', async () => {
    await load({
      ...homeRoutes(),
      ...inboxRoutes(),
      '/api/app/tasks/t-14/complete': { body: { task: {}, can: {} } },
    });
    await loadInbox();
    expect([hits('/api/app/home'), hits('lane=action'), hits('/count')]).toEqual([1, 1, 1]);

    await runFocusAction(complete());
    await Promise.all([homeResource.ensure(), ensureInboxCount()]);

    expect(hits('/api/app/home')).toBe(2);
    expect(hits('/count')).toBe(2);
  });

  test('a write the server refused leaves every store alone', async () => {
    await load({
      ...homeRoutes(),
      ...inboxRoutes(),
      '/api/app/tasks/t-14/complete': {
        status: 409,
        body: { error: 'Tugas ini perlu diperiksa dulu.', code: 'REVIEW_REQUIRED' },
      },
    });

    await expect(runFocusAction(complete())).rejects.toThrow('Tugas ini perlu diperiksa dulu.');

    expect(hits('/api/app/home')).toBe(1);
  });

  test('a row the server offered no step on cannot be pressed into one', async () => {
    await load();
    expect(() => runFocusAction({ id: 't-12', no: 12, action: null })).toThrow(
      'Task #12 has no action on Home',
    );
  });
});
