// Settings ① against the server: my account from `GET /api/app/profile` + whoami, the two notification switches read
// from and saved to `/api/app/profile/notifications` (a refused flip goes back, with the reason), no Team settings
// group (GAP S-1), and Sign out (T2). Edit profile is `profile-edit.test.tsx`.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { resetAuthClient, setAuthHeaders } from '@/api';
import { sessionStore } from '@/session';

import { forgetAllResources } from '../../src/data/resource';
import { SettingsScreen } from '../../src/screens/settings/settings.screen';
import { type AuthReply, type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { recording, type Sent } from '../helpers/events-fixtures';
import { profileRoute } from '../helpers/profile-fixtures';
import { Providers } from '../helpers/providers';
import { setParams } from '../helpers/router-mock';
import { drainToastTimers } from '../helpers/toast-timers';
import { whoamiRoute } from '../helpers/whoami-fixtures';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;

beforeEach(() => {
  forgetAllResources();
  jest.clearAllMocks();
  setParams({});
  resetAuthClient();
  setAuthHeaders(null);
});

afterEach(() => {
  server?.restore();
  server = null;
});

const PREFS = { eventReminder: true, inboxNews: true };

/** Settings as `role`; `put` answers the switches' saves (each recorded in the returned log). */
async function show(
  role: 'pm' | 'admin' = 'pm',
  put: (s: Sent) => AuthReply = (s) => ({ body: { ...PREFS, ...(s.body as object) } }),
  more: AuthRoutes = {},
) {
  const sent: Sent[] = [];
  const saves = recording(sent, '/api/app/profile/notifications', put)[
    '/api/app/profile/notifications'
  ];
  server = serveAuth({
    ...more,
    // Before the profile's own route, which its path also contains.
    '/api/app/profile/notifications': (url, init) =>
      init?.method === 'PUT' && typeof saves === 'function' ? saves(url, init) : { body: PREFS },
    ...profileRoute(),
    ...whoamiRoute(role),
  });
  await render(<SettingsScreen />, { wrapper: Providers });
  await screen.findByRole('switch', { name: 'Event reminders' });
  return sent;
}
const reminders = () => screen.getByRole('switch', { name: 'Event reminders' });
const inbox = () => screen.getByRole('switch', { name: 'Inbox updates' });

describe('SettingsScreen', () => {
  test('my account from the server; Edit profile opens its screen; no team settings, no leave', async () => {
    await show();
    expect(await screen.findByText('Designer · Product')).toBeOnTheScreen();
    expect(screen.getByText('Nico')).toBeOnTheScreen();
    expect(screen.getByText('nico@kantor.id')).toBeOnTheScreen();
    expect(screen.getByText('Project settings live inside each project.')).toBeOnTheScreen();
    expect(screen.queryByText('Team settings (Admin only)')).not.toBeOnTheScreen();
    expect(screen.queryByText(/leave/i)).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Edit profile'));
    expect(router.push).toHaveBeenCalledWith('/more/settings/profile');
  });

  test('with the dashboard cap the footer points to Users', async () => {
    await show('admin');
    expect(
      await screen.findByText(
        'Project settings live inside each project. Account roles are managed in Users (Admin).',
      ),
    ).toBeOnTheScreen();
  });

  test('the switches show the server’s values; a flip saves only that switch', async () => {
    const sent = await show();
    expect(reminders()).toHaveProp('value', true);
    expect(inbox()).toHaveProp('value', true);
    await act(async () => fireEvent(inbox(), 'valueChange', false));
    expect(sent).toEqual([
      { method: 'PUT', url: '/api/app/profile/notifications', body: { inboxNews: false } },
    ]);
    expect(inbox()).toHaveProp('value', false);
    expect(reminders()).toHaveProp('value', true);
  });

  test('a refused flip goes back and says why', async () => {
    const sent = await show('pm', () => ({
      status: 400,
      body: { error: 'Pengaturan tidak valid.', code: 'VALIDATION' },
    }));
    await act(async () => fireEvent(reminders(), 'valueChange', false));
    expect(sent).toHaveLength(1);
    expect(await screen.findByText('Pengaturan tidak valid.')).toBeOnTheScreen();
    expect(reminders()).toHaveProp('value', true);
  });

  test('switches that could not be read say why', async () => {
    server = serveAuth({
      '/api/app/profile/notifications': {
        status: 503,
        body: { error: 'Sedang pemeliharaan.', code: 'MAINTENANCE' },
      },
      ...profileRoute(),
      ...whoamiRoute('pm'),
    });
    await render(<SettingsScreen />, { wrapper: Providers });
    expect(await screen.findByTestId('notifications-failed')).toBeOnTheScreen();
    expect(screen.getByText('Sedang pemeliharaan.')).toBeOnTheScreen();
  });

  // Confirming really ends the session, and the gate takes it from there (no navigation here).
  test('Sign out asks first (T2); Cancel stays, confirming ends the session', async () => {
    await show('pm', undefined, { '/sign-out': { body: { success: true } } });
    const signOuts = () => server?.calls.filter((u) => u.includes('/sign-out')) ?? [];
    await fireEvent.press(screen.getByText('Sign out'));
    const dialog = within(screen.getByTestId('sign-out-dialog'));
    expect(dialog.getByText("You'll be signed out of this account.")).toBeOnTheScreen();
    await fireEvent.press(dialog.getByText('Cancel'));
    expect(signOuts()).toHaveLength(0);
    expect(sessionStore.get().status).toBe('signed-in');

    await fireEvent.press(screen.getByText('Sign out'));
    await fireEvent.press(screen.getByTestId('confirm-action'));
    await waitFor(() => expect(sessionStore.get().status).toBe('signed-out'));
  });
});
