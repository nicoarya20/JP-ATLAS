// Back from a More screen on the app's real route tree: More has no root screen, so what a previous visit left at the
// bottom of its stack must not come back under the next screen opened from another tab.
import { act, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { forgetAllResources } from '../../src/data/resource';
import { EDIT_FROM_PROFILE } from '../../src/screens/settings/profile-edit.screen';
import { openApp } from '../helpers/app-router';
import { serveAuth } from '../helpers/auth-server';
import { countRoutes, homeRoutes } from '../helpers/home-fixtures';
import { whoamiRoute } from '../helpers/whoami-fixtures';

// The tabs read the server on mount; empty answers keep those reads in jest (only the route tree is under test).
let server: ReturnType<typeof serveAuth> | null = null;
beforeEach(() => {
  forgetAllResources();
  server = serveAuth({
    ...homeRoutes(),
    ...countRoutes(0, 0),
    ...whoamiRoute('pm'),
    '/api/app/tasks?': { body: { items: [], nextCursor: null, caps: {} } },
  });
});
afterEach(() => {
  server?.restore();
  server = null;
});

/** The profile modal's leaveTo: close the modal, then go. */
const leaveProfileTo = (href: Parameters<typeof router.navigate>[0]) =>
  act(() => {
    router.dismiss();
    router.navigate(href);
  });

describe('More stack', () => {
  it('Back from Inbox does not return to an Edit profile closed earlier', async () => {
    await openApp('/tasks');
    await act(() => router.push('/profile'));
    await leaveProfileTo(EDIT_FROM_PROFILE);
    // Edit profile's Cancel: back over the tabs, then the profile modal again
    await act(() => {
      router.back();
      router.navigate('/profile');
    });
    await leaveProfileTo('/more/inbox');
    expect(screen).toHaveSegments(['(tabs)', 'more', 'inbox']);

    await act(() => router.back());
    expect(screen).toHavePathname('/');
  });

  it('Back from a More screen opened from the panel does not return to the last one opened', async () => {
    await openApp('/tasks');
    await act(() => router.push('/more/team'));
    await act(() => router.back());
    expect(screen).toHavePathname('/');
    await act(() => router.push('/more/inbox'));

    await act(() => router.back());
    expect(screen).toHavePathname('/');
  });

  it('keeps the screens opened inside More: Back from Edit profile returns to Settings', async () => {
    await openApp('/tasks');
    await act(() => router.push('/more/settings'));
    await act(() => router.push('/more/settings/profile'));
    // A modal over the tabs leaves More the focused tab, so nothing is dropped when it closes
    await act(() => router.push('/profile'));
    await act(() => router.dismiss());
    expect(screen).toHaveSegments(['(tabs)', 'more', 'settings', 'profile']);

    await act(() => router.back());
    expect(screen).toHaveSegments(['(tabs)', 'more', 'settings']);
  });

  it('keeps a pushed screen over a More screen opened again from another tab', async () => {
    await openApp('/tasks');
    await act(() => router.push('/more/settings'));
    await act(() => router.navigate('/tasks'));
    await act(() => router.navigate('/more/settings'));
    await act(() => router.push('/more/settings/profile'));

    await act(() => router.back());
    expect(screen).toHaveSegments(['(tabs)', 'more', 'settings']);
  });
});
