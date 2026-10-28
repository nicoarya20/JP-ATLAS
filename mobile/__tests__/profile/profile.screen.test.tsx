import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';

import { resetAuthClient, setAuthHeaders } from '@/api';
import { sessionStore } from '@/session';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { forgetAllResources } from '../../src/data/resource';
import { ProfileScreen } from '../../src/screens/profile/profile.screen';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { counts } from '../helpers/inbox-fixtures';
import { profileRoute } from '../helpers/profile-fixtures';
import { APPROVED_USER, seedSession } from '../helpers/session-fixtures';
import { drainToastTimers } from '../helpers/toast-timers';
import { whoamiRoute } from '../helpers/whoami-fixtures';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;

beforeEach(() => {
  forgetAllResources();
  jest.clearAllMocks();
  resetAuthClient();
  setAuthHeaders(null);
});

afterEach(() => {
  server?.restore();
  server = null;
});

// The hero is the server's (`GET /api/app/profile` + whoami's role) and the Inbox row's count too
// (`GET /api/app/inbox/count`), served with whatever else a test needs.
const SERVER: AuthRoutes = {
  ...profileRoute(),
  ...whoamiRoute('pm'),
  '/api/app/inbox/count': { body: counts(3) },
};
const show = async (routes: AuthRoutes = {}) => {
  server = serveAuth({ ...routes, ...SERVER });
  const shown = await render(<ProfileScreen />, { wrapper: GluestackUIProvider });
  await screen.findByLabelText('Inbox, 3');
  await screen.findByText('Designer · Product');
  return shown;
};

describe('ProfileScreen', () => {
  test('hero: the display name and job line from the server; no presence, note or Mute any more', async () => {
    await show();
    expect(screen.getByRole('header', { name: 'Nico' })).toBeOnTheScreen();
    expect(screen.getByText('Designer · Product')).toBeOnTheScreen();
    expect(screen.queryByText('Online')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('profile-note')).not.toBeOnTheScreen();
    expect(screen.queryByRole('switch')).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId('profile-photo', { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
  });

  test('the session photo, when the account has one; the session name until the profile is in', async () => {
    seedSession({ ...APPROVED_USER, image: 'https://img.example/nico.png' });
    server = serveAuth({
      ...whoamiRoute('pm'),
      '/api/app/inbox/count': { body: counts(0) },
      '/api/app/profile': {
        status: 503,
        body: { error: 'Sedang pemeliharaan.', code: 'MAINTENANCE' },
      },
    });
    await render(<ProfileScreen />, { wrapper: GluestackUIProvider });
    expect(screen.getByRole('header', { name: 'Nico Arya' })).toBeOnTheScreen();
    expect(
      screen.getByTestId('profile-photo', { includeHiddenElements: true }).props.source,
    ).toEqual({
      uri: 'https://img.example/nico.png',
    });
    expect(await screen.findByText('Project Manager')).toBeOnTheScreen();
  });

  test('rows into the tabs close the modal first; My calendar opens inside it', async () => {
    await show();
    await fireEvent.press(screen.getByText('Edit profile'));
    expect(router.dismiss).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith({
      pathname: '/more/settings/profile',
      params: { from: 'profile' },
    });
    await fireEvent.press(screen.getByLabelText('My tasks'));
    expect(router.navigate).toHaveBeenCalledWith('/tasks');
    await fireEvent.press(screen.getByLabelText('Inbox, 3'));
    expect(router.navigate).toHaveBeenCalledWith('/more/inbox');
    await fireEvent.press(screen.getByLabelText('Settings'));
    expect(router.navigate).toHaveBeenCalledWith('/more/settings');
    await fireEvent.press(screen.getByLabelText('My calendar'));
    expect(router.push).toHaveBeenCalledWith('/profile/calendar');
    expect(router.dismiss).toHaveBeenCalledTimes(4);
  });

  test('Copy email: copied, refused, or failed with the reason', async () => {
    const copy = jest.mocked(Clipboard.setStringAsync);
    await show();
    copy.mockResolvedValueOnce(true);
    await fireEvent.press(screen.getByLabelText('Copy email'));
    expect(copy).toHaveBeenCalledWith('nico@kantor.id');
    expect(await screen.findByText('Email copied')).toBeOnTheScreen();
    copy.mockResolvedValueOnce(false);
    await fireEvent.press(screen.getByLabelText('Copy email'));
    expect(
      await screen.findByText('Could not copy the email: the clipboard refused it'),
    ).toBeOnTheScreen();
    copy.mockRejectedValueOnce(new Error('No clipboard'));
    await fireEvent.press(screen.getByLabelText('Copy email'));
    expect(await screen.findByText('Could not copy the email: No clipboard')).toBeOnTheScreen();
  });

  test('Sign out is the iOS alert red, the Inbox count a red badge (MOBILE_STATUS, not the darker Atlas danger)', async () => {
    await show();
    expect(screen.getByRole('button', { name: 'Sign out' }).props.className).toContain('bg-alert');
    const count = screen.getByText('3', { includeHiddenElements: true });
    expect(count.props.className).toContain('text-alert-foreground');
  });

  // Confirming really ends the session, and the gate takes it from there (no navigation here).
  test('Sign out asks first (T2), then really ends the session', async () => {
    await show({ '/sign-out': { body: { success: true } } });
    const signOuts = () => server?.calls.filter((url) => url.includes('/sign-out')) ?? [];
    await fireEvent.press(screen.getByText('Sign out'));
    expect(within(screen.getByTestId('sign-out-dialog')).getByText('Sign out?')).toBeOnTheScreen();
    expect(signOuts()).toHaveLength(0);
    await act(async () => fireEvent.press(screen.getByTestId('confirm-action')));
    await waitFor(() => expect(sessionStore.get().status).toBe('signed-out'));
    expect(signOuts().length).toBeGreaterThan(0);
  });
});
