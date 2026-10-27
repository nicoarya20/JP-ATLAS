// Reanimated declares toHaveAnimatedStyle (installed by setUpTests in jest.setup.js) in a file nothing imports.
/// <reference path="../../node_modules/react-native-reanimated/lib/typescript/jestUtils/index.native.d.ts" />
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { resetArchive } from '../../src/data/archive.store';
import { cancelEvent, resetEvents } from '../../src/data/events.store';
import type { Role } from '../../src/data/sample';
import { archiveTask, getTask, moveTask, resetTasks } from '../../src/data/tasks.store';
import { HomeScreen } from '../../src/screens/home/home.screen';
import { TARGET_HREF } from '../../src/screens/home/home.targets';
import { drainToastTimers } from '../helpers/toast-timers';

// Home is rendered on its own (the tab host mounts every tab, see tabs.test.tsx); expected values are the prototype's.

// Home shows toasts (Done, Ask, Search): every test lets them run out so no toast timer outlives the file.
drainToastTimers();
// Home reads the live task and event stores; each test starts from the sample.
afterEach(() => {
  resetTasks();
  resetEvents();
  resetArchive();
});

async function renderHome(role: Role) {
  const onOpen = jest.fn();
  await render(<HomeScreen role={role} onOpen={onOpen} />, { wrapper: GluestackUIProvider });
  return onOpen;
}

const chipLabels = () =>
  screen
    .getAllByRole('button')
    .map((b) => b.props.accessibilityLabel as string | undefined)
    .filter((l) => l?.includes(', '));

describe('HomeScreen · Project Manager', () => {
  test('greeting, stat chips and the six sections', async () => {
    await renderHome('pm');
    expect(screen.getByRole('header', { name: 'Good morning, Nico' })).toBeTruthy();
    expect(chipLabels()).toEqual([
      'Assigned 3, 1 overdue',
      'In Progress 1, 1 overdue',
      'Completed 0, this week',
      'Upcoming, 7 items',
      'Inbox, 3 to respond',
    ]);
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

  test('My Focus groups my tasks; where Done is not allowed the status sits in the sub line, not a pill', async () => {
    await renderHome('pm');
    expect(screen.getByText('#12 Fix SSO login')).toBeTruthy();
    expect(screen.getByText('Atlas Project · 2 days overdue · In progress')).toBeTruthy();
    expect(screen.queryByText('In progress')).toBeNull();
    // A row with Done keeps the plain sub line: the status only stands in for a missing action.
    expect(screen.getByText('Atlas Project · Today')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Done: Write the API spec' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Done: Fix SSO login' })).toBeNull();
    expect(screen.getByText('Awaiting your review')).toBeTruthy();
    expect(screen.getByText('See all tasks (3) · 1 awaiting review')).toBeTruthy();
  });

  test('Done moves the task to Done in the store, updates the chips and confirms with a toast', async () => {
    await renderHome('pm');
    await fireEvent.press(screen.getByRole('button', { name: 'Done: Write the API spec' }));
    expect(await screen.findByText('Task marked done')).toBeTruthy();
    expect(getTask(14)?.status).toBe('Done');
    expect(screen.queryByText('#14 Write the API spec')).toBeNull();
    expect(chipLabels().slice(0, 3)).toEqual([
      'Assigned 2, 1 overdue',
      'In Progress 1, 1 overdue',
      'Completed 1, this week',
    ]);
    expect(screen.getByText('See all tasks (2) · 1 awaiting review')).toBeTruthy();
  });

  test('re-renders when Tasks or Events change the stores', async () => {
    await renderHome('pm');
    await act(() => moveTask(9, 'Canceled'));
    await act(() => archiveTask(14, 'Nico'));
    expect(screen.queryByText('#9 Prepare the sprint demo')).toBeNull();
    expect(screen.queryByText('#14 Write the API spec')).toBeNull();
    expect(chipLabels()[0]).toBe('Assigned 1, 1 overdue');
    await act(() => cancelEvent('review', 'Moved', 'Nico'));
    expect(screen.queryByRole('button', { name: 'Onboarding design review' })).toBeNull();
    expect(chipLabels()[3]).toBe('Upcoming, 4 items');
  });

  test('a toast closes by itself after 3 seconds', async () => {
    await renderHome('pm');
    await fireEvent.press(screen.getByRole('button', { name: 'Ask' }));
    expect(await screen.findByText('Answer generated')).toBeTruthy();
    await act(async () => jest.advanceTimersByTime(2900));
    expect(screen.getByText('Answer generated')).toBeTruthy();
    // At 3 s the toast starts hiding; its 150 ms exit animation is scheduled on that render, so a second step ends it.
    await act(async () => jest.advanceTimersByTime(200));
    await act(async () => jest.advanceTimersByTime(200));
    expect(screen.queryByText('Answer generated')).toBeNull();
  });

  test('Ask confirms with a toast; a suggested question can be picked', async () => {
    await renderHome('pm');
    const question = screen.getByRole('button', { name: 'Who has the most tasks?' });
    expect(question.props.accessibilityState).toMatchObject({ selected: false });
    await fireEvent.press(question);
    expect(
      screen.getByRole('button', { name: 'Who has the most tasks?' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('button', { name: 'Ask' }));
    expect(await screen.findByText('Answer generated')).toBeTruthy();
  });

  test('chips and links open their routes; search says it comes later', async () => {
    const onOpen = await renderHome('pm');
    await fireEvent.press(screen.getByRole('button', { name: 'Assigned 3, 1 overdue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Upcoming, 7 items' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Inbox, 3 to respond' }));
    await fireEvent.press(screen.getByText('See all tasks (3) · 1 awaiting review'));
    await fireEvent.press(screen.getByRole('button', { name: '#14 Write the API spec' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Onboarding design review' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Atlas Project' }));
    expect(onOpen.mock.calls.map(([href]) => href)).toEqual([
      '/tasks?scope=all',
      '/events?view=calendar',
      '/more/inbox',
      '/tasks?scope=mine',
      '/tasks/14',
      '/events/review',
      '/projects/atlas',
    ]);
    await fireEvent.press(screen.getByRole('search', { name: 'Search or ask anything…' }));
    expect(await screen.findByText('Search is coming soon.')).toBeTruthy();
    expect(onOpen).toHaveBeenCalledTimes(7);
  });

  test('agenda shows the next meeting and my four projects', async () => {
    await renderHome('pm');
    expect(screen.getByText('Wed, Oct 7 · In person · Meeting Room 2')).toBeTruthy();
    for (const name of [
      'Atlas Project',
      'PT Sinar Client Portal',
      'Internal Tools',
      'Attendance App',
    ]) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });
});

describe('HomeScreen · Member', () => {
  test('on-track chips, one task in review without Done, shorter lists', async () => {
    await renderHome('member');
    expect(screen.getByRole('header', { name: 'Good morning, Dodi' })).toBeTruthy();
    expect(chipLabels()).toEqual([
      'Assigned 2, on track',
      'In Progress 0, none started',
      'Completed 0, this week',
      'Upcoming, 5 items',
      'Inbox, 3 to respond',
    ]);
    expect(screen.getByText('#17 Fix the save button on the profile page')).toBeTruthy();
    expect(screen.getByText(/ · In review$/)).toBeTruthy();
    expect(screen.queryByText(/^Done: /)).toBeNull();
    expect(screen.queryByText('Awaiting your review')).toBeNull();
    expect(screen.getAllByRole('button', { name: /\?$/ })).toHaveLength(2);
  });
});

describe('HomeScreen · Admin', () => {
  test('workspace chips with the live Overdue count, approvals first, empty own focus', async () => {
    const onOpen = await renderHome('admin');
    expect(screen.getByRole('header', { name: 'Good morning, Ayu' })).toBeTruthy();
    expect(chipLabels()).toEqual([
      'Active 3, projects',
      'Overdue 1, tasks',
      'Awaiting 2, users',
      'Upcoming, 1 item',
      'Inbox, 3 to respond',
    ]);
    expect(screen.getByText('Nothing due this week.')).toBeTruthy();
    const approval = screen.getByRole('button', { name: 'Approve 2 new users' });
    await fireEvent.press(within(approval).getByRole('button', { name: 'Open' }));
    expect(onOpen).toHaveBeenCalledWith('/more/users');
  });
});

describe('TARGET_HREF', () => {
  test('each prototype screen id lands on its route', () => {
    expect(TARGET_HREF).toEqual({
      'tasks.all': '/tasks?scope=all',
      'tasks.my': '/tasks?scope=mine',
      'projects.list': '/projects',
      'users.approve': '/more/users',
      'events.calendar': '/events?view=calendar',
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
    await renderHome('pm');
    await fireEvent(screen.getByTestId('stacked-find-block'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 375, height: BLOCK } },
    });
    await fireEvent(screen.getByText('Assigned 3'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 80, height: LINE } },
    });
    await frame();
  }

  test('greeting title, search block and the chips pinned under the header', async () => {
    await renderHome('pm');
    expect(screen.getByTestId('screen-home')).toBeOnTheScreen();
    expect(screen.getByTestId('stacked-find-block')).toHaveTextContent('Search or ask anything…', {
      exact: false,
    });
    expect(within(screen.getByTestId('stacked-pinned')).getAllByRole('button')).toHaveLength(5);
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
