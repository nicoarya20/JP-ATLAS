// Home's data layer: one `GET /api/app/home` payload mapped to the shape the screen reads, the
// chips the server can stand behind, and what a focus row's button marks stale. Every request is
// stubbed; nothing leaves the machine.
import { today } from '@/data/clock';
import { daysBetween, daysToSunday, monthDay, weekdayMonthDay } from '@/data/dates';
import { getHome } from '@/data/home';
import { runFocusAction } from '@/data/home.actions';
import { type HomeResponse, homeResource } from '@/data/home.api';
import type { FocusGroupKey, HomeData, StatKey, Widget } from '@/data/home.types';
import { inboxCountResource } from '@/data/inbox.api';
import { instantDate } from '@/data/instant';
import { tasksCountsResource } from '@/data/tasks.api';
import { sessionStore } from '@/session/session.state';

import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import {
  countRoutes,
  HOME_WIRE,
  homeRoutes,
  homeWithout,
  loadHome,
} from '../helpers/home-fixtures';

let server: ReturnType<typeof serveAuth>;

const serve = (routes: AuthRoutes = homeRoutes()) => {
  server = serveAuth(routes);
  return server;
};
const hits = (path: string) => server.calls.filter((url) => url.includes(path)).length;

/** Home in the store, as the gate's own call (or the screen's effect) would leave it. */
async function load(routes?: AuthRoutes) {
  serve(routes);
  await loadHome();
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
    expect(home().me).toEqual({ name: 'Nico', full: 'Nico Arya' });
  });

  test.each([
    ['siang', 'Good afternoon'],
    ['sore', 'Good afternoon'],
    ['malam', 'Good evening'],
  ])('%s reads as "%s"', async (greeting, english) => {
    const now = { ...HOME_WIRE.now, greeting } as HomeResponse['now'];
    await load(homeRoutes({ ...HOME_WIRE, now }));
    expect(home().greeting).toBe(english);
  });

  test('an account without a name gets no name, rather than a sample one', async () => {
    await load();
    sessionStore.set((prev) =>
      prev.user ? { ...prev, user: { ...prev.user, name: '  ' } } : prev,
    );
    expect(home().me).toEqual({ name: '', full: '' });
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

  test("Completed is the server's count for this week across my projects, worded as such", async () => {
    await load();
    expect(stat('completed')).toMatchObject({
      count: 4,
      sub: { kind: 'thisWeekMyProjects' },
      alert: false,
      target: 'tasks.all',
    });
  });

  test('on track once nothing of mine is late', async () => {
    const focus = { ok: true, data: { ...section(HOME_WIRE.focus), overdueTotal: 0 } } as const;
    await load(homeRoutes({ ...HOME_WIRE, focus }));
    expect(stat('assigned')).toMatchObject({ sub: { kind: 'onTrack' }, alert: false });
  });

  test('a chip whose number did not arrive is left out, not shown as zero', async () => {
    await load(homeRoutes(homeWithout('focus')));
    expect(home().stats.map((s) => s.key)).toEqual(['completed']);

    homeResource.forget();
    await load(homeRoutes(homeWithout('done')));
    expect(home().stats.map((s) => s.key)).toEqual(['assigned']);
  });

  test('only the chips with a server number are offered: the rest are hidden with their GAPs', async () => {
    await load();
    // Upcoming and the Admin chips (H-4..H-6); In Progress and Inbox until their counts are in.
    expect(home().stats.map((s) => s.key)).toEqual(['assigned', 'completed']);
  });

  test('In Progress (my tasks in progress) and Inbox join once their counts are in', async () => {
    await load({ ...homeRoutes(), ...countRoutes(2, 3) });
    await Promise.all([tasksCountsResource.ensure(), inboxCountResource.ensure()]);
    expect(home().stats.map((s) => s.key)).toEqual([
      'assigned',
      'inProgress',
      'completed',
      'inbox',
    ]);
    expect(stat('inProgress')).toMatchObject({
      count: 2,
      sub: { kind: 'mine' },
      alert: false,
      target: 'tasks.my',
    });
    expect(stat('inbox')).toMatchObject({ count: null, sub: { kind: 'toRespond', n: 3 } });
  });

  test('nothing in progress and nothing to answer are said, not hidden', async () => {
    await load({ ...homeRoutes(), ...countRoutes(0, 0) });
    await Promise.all([tasksCountsResource.ensure(), inboxCountResource.ensure()]);
    expect(stat('inProgress')).toMatchObject({ count: 0, sub: { kind: 'noneStarted' } });
    expect(stat('inbox')).toMatchObject({ sub: { kind: 'caughtUp' } });
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
    await load(homeRoutes(homeWithout('briefing')));
    expect(home().briefing.ok).toBe(false);
    expect(home().focus.ok).toBe(true);
    expect(home().activity.ok).toBe(true);
  });

  test('a section missing from the payload altogether is read the same way', async () => {
    const { activity: _dropped, ...withoutActivity } = HOME_WIRE;
    await load(homeRoutes(withoutActivity));
    expect(home().activity.ok).toBe(false);
    expect(home().briefing.ok).toBe(true);
  });
});

describe("what a focus row's button marks stale", () => {
  const complete = () => ({ id: 't-14', no: 14, action: 'complete' as const });

  test('posts the step to the task by its id, and Home is read again', async () => {
    await load({
      ...homeRoutes(),
      '/api/app/tasks/t-14/complete': { body: { task: {}, can: {} } },
    });
    expect(hits('/api/app/home')).toBe(1);

    await runFocusAction(complete());
    await homeResource.ensure();

    expect(hits('/api/app/tasks/t-14/complete')).toBe(1);
    expect(hits('/api/app/home')).toBe(2);
  });

  test('the counts the Tasks tab and the chips read are read again too', async () => {
    await load({
      ...homeRoutes(),
      ...countRoutes(1, 1),
      '/api/app/tasks/t-14/complete': { body: { task: {}, can: {} } },
    });
    await Promise.all([tasksCountsResource.ensure(), inboxCountResource.ensure()]);
    await runFocusAction(complete());
    await Promise.all([tasksCountsResource.ensure(), inboxCountResource.ensure()]);
    expect(hits('/api/app/tasks/counts')).toBe(2);
    expect(hits('/api/app/inbox/count')).toBe(2);
  });

  test('Start posts the start step, not complete', async () => {
    await load({ ...homeRoutes(), '/api/app/tasks/t-9/start': { body: { task: {}, can: {} } } });

    await runFocusAction({ id: 't-9', no: 9, action: 'start' });

    expect(hits('/api/app/tasks/t-9/start')).toBe(1);
    expect(hits('/complete')).toBe(0);
  });

  test('a write the server refused leaves every store alone', async () => {
    await load({
      ...homeRoutes(),
      '/api/app/tasks/t-14/complete': {
        status: 409,
        body: { error: 'Tugas ini perlu diperiksa dulu.', code: 'REVIEW_REQUIRED' },
      },
    });

    await expect(runFocusAction(complete())).rejects.toThrow('Tugas ini perlu diperiksa dulu.');

    expect(hits('/api/app/home')).toBe(1);
    expect(homeResource.peek().stale).toBe(false);
  });

  test('a session the write found ended goes to sign-in', async () => {
    await load({
      ...homeRoutes(),
      '/api/app/tasks/t-14/complete': {
        status: 401,
        body: { error: 'Silakan masuk terlebih dahulu.', code: 'UNAUTHORIZED' },
      },
    });

    await expect(runFocusAction(complete())).rejects.toThrow();

    expect(sessionStore.get().status).toBe('signed-out');
  });

  test('a row the server offered no step on cannot be pressed into one', async () => {
    await load();
    expect(() => runFocusAction({ id: 't-12', no: 12, action: null })).toThrow(
      'Task #12 has no action on Home',
    );
  });
});
