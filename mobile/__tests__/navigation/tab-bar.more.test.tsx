// Port of the prototype's src/test/tabbar.more.test.jsx (docs/phase1-navigation.md §2.5): More unfolds the tab bar
// into the More panel over a dimmed screen instead of opening a screen. expo-router's testing library swaps Reanimated
// for its mock, so the panel's motion is tested on the component alone (tab-panel.test.tsx).
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, BackHandler } from 'react-native';

import { getProfile } from '../../src/data/profile';
import { USER_COUNTS } from '../../src/data/sample';
import type { Role } from '../../src/data/sample/people';
import { decide, resetDecisions } from '../../src/data/users';
import { openApp } from '../helpers/app-router';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { counts } from '../helpers/inbox-fixtures';
import { whoamiRoute } from '../helpers/whoami-fixtures';

// The signed-in role, per test (the app reads it from src/data/session until Phase 2 signs in).
let mockRole: Role = 'member';
jest.mock('../../src/data/session', () => ({
  get SESSION_ROLE() {
    return mockRole;
  },
}));
// Every tab the pill was rendered with, to see what the bubble was sent to on the way.
const mockPillActive: number[] = [];
jest.mock('../../src/components/tab-bar/glass-pill', () => {
  const { createElement } = jest.requireActual('react');
  const actual = jest.requireActual('../../src/components/tab-bar/glass-pill');
  return {
    GlassPill: (props: { active: number }) => {
      mockPillActive.push(props.active);
      return createElement(actual.GlassPill, props);
    },
  };
});
afterEach(() => {
  mockRole = 'member';
  resetDecisions();
  jest.restoreAllMocks();
});

// The Inbox badge is the server's count (`GET /api/app/inbox/count`): every test serves one, so the panel never
// reaches a real server; a test about the badge serves its own. The bar reads whoami for its "+", served for the role.
let server: ReturnType<typeof serveAuth> | null = null;
afterEach(() => {
  server?.restore();
  server = null;
});

async function open(path: string, role: Role = 'member', routes?: AuthRoutes) {
  mockRole = role;
  server = serveAuth({
    ...whoamiRoute(role),
    ...(routes ?? { '/api/app/inbox/count': { body: counts(0) } }),
  });
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
    await open('/', 'member', { '/api/app/inbox/count': { body: counts(2) } });
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
    expect(await screen.findByRole('button', { name: 'Inbox, 2 new' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeOnTheScreen(); // Settings only
  });

  it('hides the screen under it from TalkBack too, and gives it back on fold', async () => {
    await open('/');
    // Android has no accessibilityViewIsModal: the tab screens step out of reach themselves.
    const behind = () =>
      screen
        .getAllByTestId('behind-more-panel', { includeHiddenElements: true })
        .map((v) => v.props.importantForAccessibility);

    await pick('More');
    expect(behind().every((v) => v === 'no-hide-descendants')).toBe(true);

    await pick('More');
    expect(behind().every((v) => v === 'auto')).toBe(true);
  });

  it('starts the screen reader on the profile card once it has unfolded', async () => {
    const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
    await open('/');

    await pick('More');

    const card = button(`${getProfile('member').me.full}, open profile`);
    await waitFor(() => expect(focus).toHaveBeenCalledWith(expect.anything(), 'focus'));
    // jest's View is a class standing in for the host view: the focused one carries the card's props.
    const target = focus.mock.lastCall?.[0] as unknown as {
      props: { accessibilityLabel?: string };
    };
    expect(target.props.accessibilityLabel).toBe(card.props.accessibilityLabel);
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

  // Folding first rendered the bar on the tab under the panel for a moment, and the bubble bounced there on its way.
  it('goes straight from More to the new tab, never back to the tab under the panel', async () => {
    await open('/');
    await pick('More');
    const from = mockPillActive.length;

    await pick('Events');

    expect(screen).toHavePathname('/events');
    const HOME = 0;
    expect(mockPillActive.slice(from)).not.toContain(HOME);
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
    await screen.findByRole('button', { name: 'New task' });
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

  it('counts down Users as sign-ups are decided; the Inbox badge stays the server count', async () => {
    await open('/', 'admin', { '/api/app/inbox/count': { body: counts(3) } });
    await act(() => decide('sari', 'approved'));
    await pick('More');
    expect(button('Users, 1 new')).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'Inbox, 3 new' })).toBeOnTheScreen();

    // The panel stays open: the last decision takes the badge off Users. Inbox cards are the server's to resolve.
    await act(() => decide('budi', 'rejected'));
    expect(button('Users')).toBeOnTheScreen();
    expect(button('Inbox, 3 new')).toBeOnTheScreen();
  });

  it('shows no Inbox badge while the count is not in, rather than a made-up 0', async () => {
    await open('/', 'member', {
      '/api/app/inbox/count': { throws: new TypeError('Network request failed') },
    });
    await pick('More');
    expect(await screen.findByRole('button', { name: 'Inbox' })).toBeOnTheScreen();
  });

  it.each(['member', 'pm'] as const)('has no Users for %s', async (role) => {
    await open('/', role);
    await pick('More');

    expect(screen.queryByRole('button', { name: /^Users/ })).not.toBeOnTheScreen();
  });
});
