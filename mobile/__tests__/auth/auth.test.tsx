/**
 * The sign-in screens other than the form itself (that one is sign-in.test.tsx): the Google account
 * picker the prototype walks, the screen for an account awaiting approval, the one for an account
 * that was turned down, and the sign-out dialog.
 *
 * Nothing here navigates on purpose: from Phase 2 the gate follows the session store, so these
 * screens change what the store says and the router does the rest (gate.test.tsx).
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { resetAuthClient, setAuthHeaders } from '@/api';
import { resetSessionConnection, sessionStore } from '@/session';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { AccountScreen } from '../../src/screens/auth/account.screen';
import { DeniedScreen } from '../../src/screens/auth/denied.screen';
import { PendingScreen } from '../../src/screens/auth/pending.screen';
import { type AuthRoutes, STORED_COOKIE, serveAuth, sessionPayload } from '../helpers/auth-server';
import {
  APPROVED_USER,
  PENDING_USER,
  REJECTED_USER,
  seedSession,
} from '../helpers/session-fixtures';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

const secureStore = jest.requireMock('expo-secure-store') as { __store: Map<string, string> };

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  if (server) server.use(routes);
  else server = serveAuth(routes);
  return server;
};

beforeEach(() => {
  jest.clearAllMocks();
  secureStore.__store.clear();
  resetSessionConnection();
  resetAuthClient();
  setAuthHeaders(null);
});

afterEach(() => {
  server?.restore();
  server = null;
});

afterAll(() => resetAuthClient());

const show = (ui: React.ReactElement) => render(ui, { wrapper: GluestackUIProvider });

describe('the Google account picker', () => {
  test('the office account waits for approval; the Gmail account is denied', async () => {
    await show(<AccountScreen />);
    await fireEvent.press(screen.getByLabelText('Budi Santoso, budi@kantor.id'));
    expect(router.replace).toHaveBeenCalledWith('/pending');
    await fireEvent.press(screen.getByLabelText('Budi Santoso, budi.santoso@gmail.com'));
    expect(router.push).toHaveBeenCalledWith('/denied');
    await fireEvent.press(screen.getByText('Use another account'));
    expect(screen.getByText('Opens Google sign-in')).toBeOnTheScreen();
  });
});

describe('PendingScreen', () => {
  beforeEach(() => seedSession(PENDING_USER));

  test('starts from the signed-in name and address; the address is read-only', async () => {
    await show(<PendingScreen />);

    expect(screen.getByLabelText('Full name, required')).toHaveProp('value', PENDING_USER.name);
    const email = screen.getByLabelText('Email (from Google, cannot be changed)');
    expect(email).toHaveProp('readOnly', true);
    expect(email).toHaveProp('value', PENDING_USER.email);
    // Nothing of the sample profile leaks into a real account's form.
    expect(screen.getByLabelText('Nickname')).toHaveProp('value', '');
  });

  test('refuses a blank full name', async () => {
    await show(<PendingScreen />);

    expect(screen.getByText('Your account is awaiting admin approval')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Full name, required'), '  ');
    await fireEvent.press(screen.getByText('Save profile'));
    expect(screen.getByText('Enter your full name.')).toBeOnTheScreen();
    expect(screen.queryByText('Profile saved')).not.toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Full name, required'), 'Budi S.');
    await fireEvent.press(screen.getByText('Save profile'));
    expect(screen.queryByText('Enter your full name.')).not.toBeOnTheScreen();
    expect(screen.getByText('Profile saved')).toBeOnTheScreen();
  });

  test('Check status reads the session again and says so when nothing changed', async () => {
    const stub = serve({ '/get-session': { body: sessionPayload(PENDING_USER) } });
    await show(<PendingScreen />);

    await fireEvent.press(screen.getByText('Check status'));

    await waitFor(() => expect(screen.getByText('Still awaiting approval.')).toBeOnTheScreen());
    expect(stub.calls.some((url) => url.includes('/get-session'))).toBe(true);
  });

  test('Check status lets an approved account through, without saying anything', async () => {
    serve({ '/get-session': { body: sessionPayload(APPROVED_USER) } });
    await show(<PendingScreen />);

    await fireEvent.press(screen.getByText('Check status'));

    // No notice: the gate moves on by itself, so saying "still waiting" would be wrong.
    await waitFor(() => expect(sessionStore.get().status).toBe('signed-in'));
    expect(screen.queryByText('Still awaiting approval.')).not.toBeOnTheScreen();
  });

  test('Sign out asks first (T2), then really ends the session', async () => {
    secureStore.__store.set('simplepm_cookie', STORED_COOKIE);
    const stub = serve({ '/sign-out': { body: { success: true } } });
    await show(<PendingScreen />);

    await fireEvent.press(screen.getByText('Sign out'));
    const dialog = within(screen.getByTestId('sign-out-dialog'));
    expect(dialog.getByText('Sign out?')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('confirm-action'));

    await waitFor(() => expect(sessionStore.get().status).toBe('signed-out'));
    expect(stub.calls.some((url) => url.includes('/sign-out'))).toBe(true);
    expect(sessionStore.get().user).toBeNull();
  });

  test('a sign-out that failed keeps the dialog open with the reason', async () => {
    secureStore.__store.set('simplepm_cookie', STORED_COOKIE);
    serve({ '/sign-out': { throws: new TypeError('Network request failed') } });
    await show(<PendingScreen />);

    await fireEvent.press(screen.getByText('Sign out'));
    await fireEvent.press(screen.getByTestId('confirm-action'));

    const dialog = within(screen.getByTestId('sign-out-dialog'));
    await waitFor(() => expect(dialog.getByText(/Cannot reach the server/)).toBeOnTheScreen());
    // Still signed in: being told it failed and still being out would be a contradiction.
    expect(sessionStore.get().status).toBe('pending');
  });
});

describe('DeniedScreen', () => {
  test('shows the admin’s own reason, in the words it arrived in', async () => {
    seedSession(REJECTED_USER);
    await show(<DeniedScreen />);

    expect(screen.getByRole('header', { name: 'Access denied' })).toBeOnTheScreen();
    expect(screen.getByText(REJECTED_USER.approvalReason as string)).toBeOnTheScreen();
  });

  test('says so plainly when the admin gave no reason', async () => {
    seedSession({ ...REJECTED_USER, approvalReason: null });
    await show(<DeniedScreen />);

    expect(screen.getByText('No reason was given.')).toBeOnTheScreen();
  });

  test('another account means signing out of this one first (T2)', async () => {
    seedSession(REJECTED_USER);
    secureStore.__store.set('simplepm_cookie', STORED_COOKIE);
    serve({ '/sign-out': { body: { success: true } } });
    await show(<DeniedScreen />);

    await fireEvent.press(screen.getByText('Sign out and use another account'));
    expect(within(screen.getByTestId('sign-out-dialog')).getByText('Sign out?')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('confirm-action'));

    await waitFor(() => expect(sessionStore.get().status).toBe('signed-out'));
  });
});
