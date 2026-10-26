// Reanimated declares toHaveAnimatedStyle (installed by setUpTests in jest.setup.js) in a file nothing imports.
/// <reference path="../../node_modules/react-native-reanimated/lib/typescript/jestUtils/index.native.d.ts" />
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { ensureInboxCount } from '../../src/data/inbox.api';
import { HomeScreen } from '../../src/screens/home/home.screen';
import { TARGET_HREF } from '../../src/screens/home/home.targets';
import { serveAuth } from '../helpers/auth-server';
import { HOME_WIRE, homeRoutes, homeWithout, loadHome } from '../helpers/home-fixtures';
import { inboxRoutes } from '../helpers/inbox-fixtures';
import { drainToastTimers } from '../helpers/toast-timers';

// Home is rendered on its own (the tab host mounts every tab, see tabs.test.tsx) on the fixture
// payload of GET /api/app/home.

// Home shows toasts (Done, Search): every test lets them run out so no toast timer outlives the file.
drainToastTimers();

let server: ReturnType<typeof serveAuth>;
const serve = (routes = { ...homeRoutes(), ...inboxRoutes() }) => {
  server = serveAuth(routes);
  return server;
};
afterEach(() => server?.restore());

/** Home with the payload already in the store, as the session gate's own call leaves it. */
async function renderHome(routes?: Parameters<typeof serve>[0]) {
  serve(routes);
  await loadHome();
  await ensureInboxCount();
  const onOpen = jest.fn();
  await render(<HomeScreen onOpen={onOpen} />, { wrapper: GluestackUIProvider });
  return onOpen;
}

const chipLabels = () =>
  screen
    .getAllByRole('button')
    .map((b) => b.props.accessibilityLabel as string | undefined)
    .filter((l) => l?.includes(', '));

describe('HomeScreen', () => {
  test('greeting, the two chips it can stand behind, and the six sections', async () => {
    await renderHome();
    expect(screen.getByRole('header', { name: 'Good morning, Nico' })).toBeTruthy();
    expect(chipLabels()).toEqual(['Assigned 7, 1 overdue', 'Inbox, 3 to respond']);
    for (const title of [
      'Daily Briefing',
      'My Focus',
      'Ask Data',
      'Agenda & Projects',
      'Tasks Completed This Week',
      'Latest Activity',
    ]) {
      expect(screen.getByRole('header', { name: title })).toBeTruthy();
    }
  });

  test("the briefing shows the server's lines and when it was built", async () => {
    await renderHome();
    expect(
      screen.getByText('Ada 1 tugas yang terlambat: "Fix SSO login" sudah lewat 2 hari.'),
    ).toBeTruthy();
    expect(
      screen.getByText('✦ Built automatically from project data · updated 07.30'),
    ).toBeTruthy();
  });

  test('My Focus groups my tasks and offers only the step the server allowed', async () => {
    await renderHome();
    for (const group of ['Overdue', 'Today', 'This week']) {
      expect(screen.getByText(group)).toBeTruthy();
    }
    // "No due date" labels both the undated focus bucket and a project without one.
    expect(screen.getAllByText('No due date').length).toBeGreaterThan(1);
    expect(screen.getByText('#12 Fix SSO login')).toBeTruthy();
    expect(screen.getByText('Atlas Project · 2 days late')).toBeTruthy();
    // The overdue row is in review: the server offered neither step, so it has no button.
    expect(screen.queryByRole('button', { name: /: Fix SSO login$/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Done: Write the API spec' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start: Prepare the sprint demo' })).toBeTruthy();
    expect(screen.getByText('Awaiting your review')).toBeTruthy();
    expect(screen.getByText('See all tasks (7) · 2 awaiting review')).toBeTruthy();
  });

  test('Done posts the step, says so, and re-reads Home', async () => {
    await renderHome({
      ...homeRoutes(),
      ...inboxRoutes(),
      '/api/app/tasks/t-14/complete': { body: { task: {}, can: {} } },
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Done: Write the API spec' }));

    expect(await screen.findByText('Task marked done')).toBeTruthy();
    expect(server.calls.filter((u) => u.includes('/t-14/complete'))).toHaveLength(1);
    expect(server.calls.filter((u) => u.includes('/api/app/home')).length).toBeGreaterThan(1);
  });

  test("a refused step says why in the server's own words", async () => {
    await renderHome({
      ...homeRoutes(),
      ...inboxRoutes(),
      '/api/app/tasks/t-14/complete': {
        status: 409,
        body: { error: 'Tugas ini perlu diperiksa dulu.', code: 'REVIEW_REQUIRED' },
      },
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Done: Write the API spec' }));

    expect(await screen.findByText('Tugas ini perlu diperiksa dulu.')).toBeTruthy();
    expect(screen.getByText('#14 Write the API spec')).toBeTruthy();
  });

  test('agenda shows the next meeting in the team zone and the projects with their condition', async () => {
    await renderHome();
    expect(screen.getByText('Wed, Oct 7 · In person')).toBeTruthy();
    expect(screen.getByText('06:00')).toBeTruthy();
    expect(screen.getByText('At risk')).toBeTruthy();
    expect(screen.getByText('baru 4 dari 10 tugas selesai')).toBeTruthy();
    // A project with no tasks says so instead of showing a 0 % bar.
    expect(screen.getByText('No tasks yet')).toBeTruthy();
  });

  test("the lists keep the server's words for who, when and what happened", async () => {
    await renderHome();
    expect(screen.getByText('Anda · hari ini')).toBeTruthy();
    expect(screen.getByText('Anda menyelesaikan "Tile price survey"')).toBeTruthy();
    expect(screen.getByText('Kitchen Renovation · 09:00')).toBeTruthy();
  });

  test('Ask Data offers the three questions it can answer, and no field it cannot', async () => {
    await renderHome();
    const questions = screen.getAllByRole('button', { name: /\?$/ });
    expect(questions).toHaveLength(3);
    expect(questions[0].props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(questions[2]);
    expect(screen.getByText('Dodi Pratama memegang 5 tugas aktif.')).toBeTruthy();
    expect(screen.queryByText('Type or say a question…')).toBeNull();
  });

  test('chips and links open their routes; search says it comes later', async () => {
    const onOpen = await renderHome();
    await fireEvent.press(screen.getByRole('button', { name: 'Assigned 7, 1 overdue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Inbox, 3 to respond' }));
    await fireEvent.press(screen.getByText('See all tasks (7) · 2 awaiting review'));
    await fireEvent.press(screen.getByRole('button', { name: '#14 Write the API spec' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Onboarding design review' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Atlas Project' }));
    expect(onOpen.mock.calls.map(([href]) => href)).toEqual([
      '/tasks?scope=all',
      '/more/inbox',
      '/tasks?scope=mine',
      '/tasks/14',
      '/events/review',
      '/projects/atlas',
    ]);
    await fireEvent.press(screen.getByRole('search', { name: 'Search or ask anything…' }));
    expect(await screen.findByText('Search is coming soon.')).toBeTruthy();
  });
});

describe('HomeScreen · a section that did not load', () => {
  test('offers Try again on its own card and leaves the rest of Home alone', async () => {
    await renderHome({ ...homeRoutes(homeWithout('focus')), ...inboxRoutes() });

    expect(screen.getByTestId('focus-failed')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Daily Briefing' })).toBeTruthy();
    expect(screen.getByText('Anda menyelesaikan "Tile price survey"')).toBeTruthy();

    server.use({ ...homeRoutes(), ...inboxRoutes() });
    await fireEvent.press(screen.getByText('Try again'));

    expect(await screen.findByText('#14 Write the API spec')).toBeTruthy();
  });

  test('a payload that never arrived replaces the screen, and the retry brings it back', async () => {
    serve({
      ...homeRoutes(),
      '/api/app/home': { throws: new TypeError('Network request failed') },
    });
    await render(<HomeScreen onOpen={jest.fn()} />, { wrapper: GluestackUIProvider });

    expect(await screen.findByTestId('home-failed')).toBeOnTheScreen();
    expect(screen.getByText(/Cannot reach the server/)).toBeTruthy();

    server.use(homeRoutes());
    await fireEvent.press(screen.getByText('Try again'));

    expect(await screen.findByRole('header', { name: 'Good morning, Nico' })).toBeTruthy();
  });

  test('says it is loading while the payload is out', async () => {
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = () => resolve();
    });
    serve({ '/api/app/home': { body: HOME_WIRE, wait: held } });
    await render(<HomeScreen onOpen={jest.fn()} />, { wrapper: GluestackUIProvider });

    expect(screen.getByTestId('home-loading')).toBeOnTheScreen();

    await act(async () => {
      release();
      await held;
    });
    expect(await screen.findByRole('header', { name: 'Good morning, Nico' })).toBeTruthy();
  });
});

describe('TARGET_HREF', () => {
  test('each screen a Home link names lands on its route', () => {
    expect(TARGET_HREF).toEqual({
      'tasks.all': '/tasks?scope=all',
      'tasks.my': '/tasks?scope=mine',
      'projects.list': '/projects',
      'inbox.respond': '/more/inbox',
    });
  });
});

describe('HomeScreen · stacked header', () => {
  // Mappers run on the next frame, and this file runs on fake timers (drainToastTimers).
  const frame = () => act(async () => jest.advanceTimersByTime(FRAME_MS));
  const scrollTo = async (y: number) => {
    await act(async () => {
      fireEvent.scroll(screen.getByTestId('stacked-scroll'), {
        nativeEvent: {
          contentOffset: { x: 0, y },
          contentSize: { width: 375, height: 2000 },
          layoutMeasurement: { width: 375, height: 700 },
        },
      });
    });
    await frame();
  };
  // test-only layout: a 60 px search block and 21 px lines, so the chips fold 59 px (+ 4 px row padding) after it.
  const BLOCK = 60;
  const LINE = 21;
  const FOLD = 63;
  const FRAME_MS = 16;

  async function renderLaidOut() {
    await renderHome();
    await fireEvent(screen.getByTestId('stacked-find-block'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 375, height: BLOCK } },
    });
    await fireEvent(screen.getByText('Assigned 7'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 80, height: LINE } },
    });
    await frame();
  }

  test('greeting title, search block and the chips pinned under the header', async () => {
    await renderHome();
    expect(screen.getByTestId('screen-home')).toBeOnTheScreen();
    expect(screen.getByTestId('stacked-find-block')).toHaveTextContent('Search or ask anything…', {
      exact: false,
    });
    expect(within(screen.getByTestId('stacked-pinned')).getAllByRole('button')).toHaveLength(2);
  });

  test('the chips compact to one line as the row sticks: the sub line folds and fades, the icon moves left', async () => {
    await renderLaidOut();
    const sub = () => screen.getAllByTestId('stat-sub')[0];
    const inner = () => screen.getAllByTestId('stat-chip-in')[0];
    expect(sub()).toHaveAnimatedStyle({ height: LINE, opacity: 1, marginTop: 2 });
    expect(inner()).toHaveAnimatedStyle({ paddingTop: 40, paddingLeft: 12 });
    await scrollTo(BLOCK + FOLD / 4);
    expect(sub()).toHaveAnimatedStyle({ height: LINE * 0.75, opacity: 0.5 });
    await scrollTo(BLOCK + FOLD);
    expect(sub()).toHaveAnimatedStyle({ height: 0, opacity: 0, marginTop: 0 });
    expect(inner()).toHaveAnimatedStyle({
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 44,
      paddingRight: 16,
    });
    await scrollTo(0);
    expect(sub()).toHaveAnimatedStyle({ height: LINE, opacity: 1 });
  });

  test('a compact chip (8 + 21 + 8 = 37 px) reaches 44 px through a 3.5 px hitSlop above and below', async () => {
    await renderLaidOut();
    const chip = within(screen.getByTestId('stacked-pinned')).getAllByRole('button')[0];
    expect(chip.props.hitSlop).toEqual({ top: 3.5, bottom: 3.5 });
  });
});
