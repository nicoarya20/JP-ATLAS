import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import type { Role } from '../../src/data/sample';
import { HomeScreen } from '../../src/screens/home/home.screen';
import { tabFor } from '../../src/screens/home/home.targets';

// Home is rendered on its own (the tab host mounts every tab, see tabs.test.tsx); expected values are the prototype's.

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

  test('My Focus groups my tasks and shows status where Done is not allowed', async () => {
    await renderHome('pm');
    expect(screen.getByText('#12 Fix SSO login')).toBeTruthy();
    expect(screen.getByText('In progress')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Done: Write the API spec' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Done: Fix SSO login' })).toBeNull();
    expect(screen.getByText('Awaiting your review')).toBeTruthy();
    expect(screen.getByText('See all tasks (3) · 1 awaiting review')).toBeTruthy();
  });

  test('Done removes the task, updates the chips and confirms with a toast', async () => {
    await renderHome('pm');
    await fireEvent.press(screen.getByRole('button', { name: 'Done: Write the API spec' }));
    expect(await screen.findByText('Task marked done')).toBeTruthy();
    expect(screen.queryByText('#14 Write the API spec')).toBeNull();
    expect(chipLabels().slice(0, 3)).toEqual([
      'Assigned 2, 1 overdue',
      'In Progress 1, 1 overdue',
      'Completed 1, this week',
    ]);
    expect(screen.getByText('See all tasks (2) · 1 awaiting review')).toBeTruthy();
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

  test('chips and links open their screens; search says it comes later', async () => {
    const onOpen = await renderHome('pm');
    await fireEvent.press(screen.getByRole('button', { name: 'Assigned 3, 1 overdue' }));
    await fireEvent.press(screen.getByText('See all tasks (3) · 1 awaiting review'));
    await fireEvent.press(screen.getByRole('button', { name: 'Atlas Project' }));
    expect(onOpen.mock.calls.map(([t]) => t)).toEqual([
      'tasks.all',
      'tasks.my',
      'projects.overview',
    ]);
    await fireEvent.press(screen.getByRole('search', { name: 'Search or ask anything…' }));
    expect(await screen.findByText('Search arrives in Phase 1.')).toBeTruthy();
    expect(onOpen).toHaveBeenCalledTimes(3);
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
    expect(screen.getByText('In review')).toBeTruthy();
    expect(screen.queryByText(/^Done: /)).toBeNull();
    expect(screen.queryByText('Awaiting your review')).toBeNull();
    expect(screen.getAllByRole('button', { name: /\?$/ })).toHaveLength(2);
  });
});

describe('HomeScreen · Admin', () => {
  test('workspace chips with Overdue 3, approvals first, empty own focus', async () => {
    const onOpen = await renderHome('admin');
    expect(screen.getByRole('header', { name: 'Good morning, Ayu' })).toBeTruthy();
    expect(chipLabels()).toEqual([
      'Active 3, projects',
      'Overdue 3, tasks',
      'Awaiting 2, users',
      'Upcoming, 1 item',
      'Inbox, 3 to respond',
    ]);
    expect(screen.getByText('Nothing due this week.')).toBeTruthy();
    const approval = screen.getByRole('button', { name: 'Approve 2 new users' });
    await fireEvent.press(within(approval).getByRole('button', { name: 'Open' }));
    expect(onOpen).toHaveBeenCalledWith('users.approve');
  });
});

describe('tabFor', () => {
  test('targets land on the tab that will hold their screen; search has none', async () => {
    expect(tabFor('tasks.detail')).toBe('/tasks');
    expect(tabFor('projects.list')).toBe('/projects');
    expect(tabFor('events.calendar')).toBe('/events');
    expect(tabFor('users.approve')).toBe('/more');
    expect(tabFor('inbox.respond')).toBe('/more');
    expect(tabFor('home.search')).toBeNull();
  });
});
