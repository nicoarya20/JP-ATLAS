// Port of the "+" parts of the prototype's src/test/tabbar.test.jsx and of home.create.test.jsx (docs/phase1-navigation.md
// §2.4, §2.7): what the "+" creates per tab and role, its fold, and the Create sheet. expo-router's testing library
// swaps Reanimated for its mock, so the fold's motion is tested on the component alone (create-fab.test.tsx).
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { Role } from '../../src/data/sample/people';
import { CREATE_ROUTES, type CreateGo, createHref } from '../../src/navigation/create-href';
import { openApp as open } from '../helpers/app-router';

// The signed-in role, per test (the app reads it from src/data/session until Phase 2 signs in).
let mockRole: Role = 'pm';
jest.mock('../../src/data/session', () => ({
  get SESSION_ROLE() {
    return mockRole;
  },
}));
afterEach(() => {
  mockRole = 'pm';
});

// Folded, the "+" is hidden from screen readers, which queries skip by default.
const fab = () => screen.getByTestId('create-fab', { includeHiddenElements: true });
const pickTab = (name: string) =>
  fireEvent(screen.getByRole('tab', { name }), 'accessibilityAction', {
    nativeEvent: { actionName: 'activate' },
  });

async function openCreate(role: Role) {
  mockRole = role;
  await open('/');
  await fireEvent.press(screen.getByRole('button', { name: 'Create' }));
  expect(screen).toHavePathname('/create');
  return screen.getByTestId('screen-create');
}

describe('the "+" beside the tab bar', () => {
  it.each([
    ['/tasks', 'member', 'New task', '/tasks/new', 'screen-task-new'],
    ['/projects', 'pm', 'New project', '/projects/new', 'screen-project-new'],
    ['/events', 'member', 'New event', '/events/new', 'screen-event-new'],
  ] as const)('on %s (%s) is %s and opens %s', async (path, role, label, to, testID) => {
    mockRole = role;
    await open(path);

    // only the "+" carries the name (no second button in the screen header)
    expect(screen.getAllByRole('button', { name: label })).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: label }));

    expect(screen).toHavePathname(to);
    expect(await screen.findByTestId(testID)).toBeOnTheScreen();
  });

  it.each(['/', '/more/inbox'])(
    'opens the Create sheet on %s, whose tab has no "new"',
    async (path) => {
      await open(path);

      await fireEvent.press(screen.getByRole('button', { name: 'Create' }));

      expect(screen).toHavePathname('/create');
      expect(screen.getByTestId('screen-create')).toBeOnTheScreen();
    },
  );

  it('folds away for a Member on Projects and comes back on Tasks', async () => {
    mockRole = 'member';
    await open('/projects');

    // folded: out of touch and out of the screen reader's reach
    expect(fab()).toHaveProp('accessibilityElementsHidden', true);
    expect(fab()).toHaveProp('pointerEvents', 'none');
    expect(screen.queryByRole('button', { name: /^(Create|New project)$/ })).not.toBeOnTheScreen();

    await pickTab('Tasks');

    expect(screen.getByRole('button', { name: 'New task' })).toBeOnTheScreen();
    expect(fab()).toHaveProp('accessibilityElementsHidden', false);
    expect(fab()).toHaveProp('pointerEvents', 'auto');
  });

  it('stays the same element while it folds, so it can unfold instead of popping in', async () => {
    mockRole = 'member';
    await open('/tasks');
    const first = fab();

    await pickTab('Projects');
    expect(fab()).toHaveProp('accessibilityElementsHidden', true);
    await pickTab('Events');

    expect(fab()).toBe(first);
  });
});

describe('Create sheet', () => {
  it('lets a Manager pick task, project, event, import or leave', async () => {
    const sheet = await openCreate('pm');

    for (const name of ['Task', 'Project', 'Event', 'Import tasks', 'Request leave']) {
      expect(within(sheet).getByText(name)).toBeOnTheScreen();
    }
    expect(within(sheet).getByRole('header')).toHaveTextContent('Create');
    expect(within(sheet).getByText('What do you want to add?')).toBeOnTheScreen();
  });

  it('leaves Project out for a Member', async () => {
    const sheet = await openCreate('member');

    expect(within(sheet).getByText('Task')).toBeOnTheScreen();
    expect(within(sheet).queryByText('Project')).not.toBeOnTheScreen();
  });

  it('names leave for an Admin as setting it, not requesting it', async () => {
    const sheet = await openCreate('admin');

    expect(within(sheet).getByText('Set leave')).toBeOnTheScreen();
    expect(within(sheet).queryByText('Request leave')).not.toBeOnTheScreen();
  });

  it('closes with the X', async () => {
    const sheet = await openCreate('pm');

    await fireEvent.press(within(sheet).getByRole('button', { name: 'Close' }));

    expect(screen).toHavePathname('/');
    expect(screen.queryByTestId('screen-create')).not.toBeOnTheScreen();
  });

  it('swaps itself for the picked screen, so leaving that screen lands back where "+" was', async () => {
    const sheet = await openCreate('pm');

    await fireEvent.press(within(sheet).getByRole('button', { name: 'Event' }));
    expect(screen).toHavePathname('/events/new');
    expect(screen.queryByTestId('screen-create')).not.toBeOnTheScreen();

    await act(() => router.back());
    expect(screen).toHavePathname('/');
  });
});

describe('create routes', () => {
  it.each(Object.entries(CREATE_ROUTES) as [CreateGo, string][])(
    '%s opens %s, a route the root stack registers',
    async (go, path) => {
      await open('/');

      await act(() => router.push(createHref(go)));

      expect(screen).toHavePathname(path);
    },
  );
});
