// Port of the prototype's src/test/tabbar.more.test.jsx (docs/phase1-navigation.md §2.5): More unfolds the tab bar
// into the More panel over a dimmed screen instead of opening a screen. expo-router's testing library swaps Reanimated
// for its mock, so the panel's motion is tested on the component alone (tab-panel.test.tsx).
import { act, fireEvent, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import { getProfile } from '../../src/data/profile';
import { INBOX_RESPOND, USER_COUNTS } from '../../src/data/sample';
import type { Role } from '../../src/data/sample/people';
import { openApp } from '../helpers/app-router';

// The signed-in role, per test (the app reads it from src/data/session until Phase 2 signs in).
let mockRole: Role = 'member';
jest.mock('../../src/data/session', () => ({
  get SESSION_ROLE() {
    return mockRole;
  },
}));
afterEach(() => {
  mockRole = 'member';
  jest.restoreAllMocks();
});

async function open(path: string, role: Role = 'member') {
  mockRole = role;
  await openApp(path);
}

// Folded, the panel is hidden from screen readers, which queries skip by default. It groups its buttons but is not an
// accessibility element itself, so it is found by testID.
const panel = () => screen.queryByTestId('tab-panel');
const tab = (name: string) => screen.getByRole('tab', { name });
const pick = (name: string) =>
  fireEvent(tab(name), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
const button = (name: string | RegExp) => screen.getByRole('button', { name });

describe('More panel', () => {
  it('unfolds from the tab bar without leaving the screen', async () => {
    await open('/');
    expect(panel()).not.toBeOnTheScreen();

    await pick('More');

    expect(screen).toHavePathname('/');
    expect(panel()).toBeOnTheScreen();
    expect(panel()).toHaveAccessibleName('More');
    expect(panel()?.props.role).toBe('group');
    // the screen under the dim is out of the screen reader's reach
    expect(screen.queryByTestId('screen-home')).not.toBeOnTheScreen();
    expect(tab('More')).toBeSelected(); // the bubble sits on More while it is open
    expect(tab('Home')).not.toBeSelected();
    expect(button('Close More')).toBeOnTheScreen(); // the dim
    expect(button(`Inbox, ${INBOX_RESPOND.member.length} new`)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeOnTheScreen(); // Settings only
  });

  it('folds away on More again, on the dim, on the screen reader escape and on back', async () => {
    const back = jest.spyOn(BackHandler, 'addEventListener');
    await open('/tasks');

    await pick('More');
    await pick('More');
    expect(panel()).not.toBeOnTheScreen();
    expect(tab('Tasks')).toBeSelected();

    await pick('More');
    await fireEvent.press(button('Close More'));
    expect(panel()).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Close More' })).not.toBeOnTheScreen();

    await pick('More');
    await fireEvent(screen.getByTestId('tab-shell'), 'accessibilityEscape');
    expect(panel()).not.toBeOnTheScreen();

    // Android back folds the panel instead of leaving the screen.
    await pick('More');
    const onBack = back.mock.lastCall?.[1];
    let handled: boolean | undefined;
    await act(() => {
      handled = onBack?.({ type: 'hardwareBackPress', timeStamp: 0 });
    });
    expect(handled).toBe(true);
    expect(panel()).not.toBeOnTheScreen();
    expect(screen).toHavePathname('/tasks');
  });

  it.each([
    ['Team', '/more/team', 'screen-team'],
    ['Archive', '/more/archive', 'screen-archive'],
  ])('opens %s and folds itself', async (name, path, testID) => {
    await open('/');
    await pick('More');

    await fireEvent.press(button(name));

    expect(screen).toHavePathname(path);
    expect(await screen.findByTestId(testID)).toBeOnTheScreen();
    expect(panel()).not.toBeOnTheScreen();
  });

  it('opens the profile from the profile card', async () => {
    await open('/');
    await pick('More');

    await fireEvent.press(button(`${getProfile('member').me.full}, open profile`));

    expect(screen).toHavePathname('/profile');
    expect(await screen.findByTestId('screen-profile')).toBeOnTheScreen();
    expect(panel()).not.toBeOnTheScreen();
  });

  it('labels the deleted-items tile Archive', async () => {
    await open('/');
    await pick('More');

    expect(screen.queryByRole('button', { name: 'Trash' })).not.toBeOnTheScreen();
    expect(button('Archive')).toBeOnTheScreen();
  });

  it('folds on another tab and goes there', async () => {
    await open('/');
    await pick('More');

    await pick('Events');

    expect(screen).toHavePathname('/events');
    expect(tab('Events')).toBeSelected();
    expect(panel()).not.toBeOnTheScreen();
  });

  it('only folds when the tab under it is picked again', async () => {
    await open('/projects', 'pm');
    await pick('More');

    await pick('Projects');

    expect(screen).toHavePathname('/projects');
    expect(tab('Projects')).toBeSelected();
    expect(panel()).not.toBeOnTheScreen();
  });

  it('folds when the "+" opens what it creates', async () => {
    await open('/tasks');
    await pick('More');

    await fireEvent.press(button('New task'));

    expect(screen).toHavePathname('/tasks/new');
    expect(panel()).not.toBeOnTheScreen();
  });

  it('shows Users with its pending count to Admin only, and opens it', async () => {
    await open('/', 'admin');
    await pick('More');

    await fireEvent.press(button(`Users, ${USER_COUNTS.pending} new`));

    expect(screen).toHavePathname('/more/users');
    expect(await screen.findByTestId('screen-users')).toBeOnTheScreen();
  });

  it.each(['member', 'pm'] as const)('has no Users for %s', async (role) => {
    await open('/', role);
    await pick('More');

    expect(screen.queryByRole('button', { name: /^Users/ })).not.toBeOnTheScreen();
    expect(button(`Inbox, ${INBOX_RESPOND[role].length} new`)).toBeOnTheScreen();
  });
});
