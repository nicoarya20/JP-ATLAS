/**
 * The sign-in screen against a stubbed `/api/auth`: what it asks for, what it says when the server
 * refuses, and what it says when the server was never reached. The three failures must not read the
 * same — "login failed" for all of them would hide which one happened.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { resetAuthClient, setAuthHeaders } from '@/api';
import { resetSessionConnection, sessionStore } from '@/session';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { LoginScreen } from '../../src/screens/auth/login.screen';
import {
  type AuthRoutes,
  SESSION_SET_COOKIE,
  serveAuth,
  sessionPayload,
} from '../helpers/auth-server';
import { APPROVED_USER, resetSessionForTest } from '../helpers/session-fixtures';

/** Better Auth's own wording; this app shows it as it came instead of keeping a second copy. */
const WRONG_PASSWORD = 'Invalid email or password';
const BANNED = 'You have been banned from this application';

const SIGNED_IN_REPLY = {
  body: { redirect: false, token: 'tok-123' },
  setCookie: SESSION_SET_COOKIE,
};

const SIGNED_IN: AuthRoutes = {
  '/sign-in/email': SIGNED_IN_REPLY,
  '/get-session': { body: sessionPayload(APPROVED_USER) },
};

const secureStore = jest.requireMock('expo-secure-store') as { __store: Map<string, string> };

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  if (server) server.use(routes);
  else server = serveAuth(routes);
  return server;
};

const show = () => render(<LoginScreen />, { wrapper: GluestackUIProvider });

/** Fills both fields and presses Sign in. */
const signIn = async (password = 'rahasia') => {
  await fireEvent.changeText(screen.getByLabelText('Email'), 'nico@kantor.id');
  await fireEvent.changeText(screen.getByLabelText('Password'), password);
  await fireEvent.press(screen.getByTestId('sign-in-submit'));
};

beforeEach(() => {
  secureStore.__store.clear();
  resetSessionForTest();
  resetSessionConnection();
  resetAuthClient();
  setAuthHeaders(null);
});

afterEach(() => {
  server?.restore();
  server = null;
});

afterAll(() => resetAuthClient());

describe('the sign-in screen', () => {
  it('asks for an email and a password, with the right keyboard and autofill', async () => {
    await show();

    expect(screen.getByRole('header', { name: 'Sign in to your account' })).toBeOnTheScreen();
    const email = screen.getByLabelText('Email');
    expect(email).toHaveProp('inputMode', 'email');
    expect(email).toHaveProp('autoComplete', 'email');
    expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', true);
  });

  it('keeps the Google button visible but switched off, with the reason written out', async () => {
    await show();

    const google = screen.getByText('Sign in with Google');
    expect(google).toBeOnTheScreen();
    expect(screen.getByTestId('google-unavailable')).toBeOnTheScreen();
    expect(screen.getByText(/does not work in Expo Go/)).toBeOnTheScreen();
  });

  it('signs in and records the session', async () => {
    serve(SIGNED_IN);
    await show();

    await signIn();

    await waitFor(() => expect(sessionStore.get().status).toBe('signed-in'));
    expect(sessionStore.get().user?.email).toBe(APPROVED_USER.email);
  });

  it('shows the button working while the request is out', async () => {
    // The answer is parked until `release`, so the button can be looked at mid-request.
    let release = () => {};
    const parked = new Promise<void>((resolve) => {
      release = resolve;
    });
    serve({ ...SIGNED_IN, '/sign-in/email': { ...SIGNED_IN_REPLY, wait: parked } });
    await show();

    await signIn();

    expect(screen.getByTestId('sign-in-submit')).toBeDisabled();
    release();
    await waitFor(() => expect(sessionStore.get().status).toBe('signed-in'));
    expect(screen.getByTestId('sign-in-submit')).not.toBeDisabled();
  });

  it('asks for the missing field before it asks the server anything', async () => {
    const stub = serve(SIGNED_IN);
    await show();

    await fireEvent.press(screen.getByTestId('sign-in-submit'));

    expect(screen.getByText('Enter your email address.')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();
    expect(stub.calls).toHaveLength(0);
  });
});

describe('what the screen says went wrong', () => {
  it('a refused password: the server’s message, and no retry on offer', async () => {
    serve({
      '/sign-in/email': {
        status: 401,
        body: { code: 'INVALID_EMAIL_OR_PASSWORD', message: WRONG_PASSWORD },
      },
    });
    await show();

    await signIn('salah');

    expect(await screen.findByTestId('sign-in-error')).toHaveTextContent(WRONG_PASSWORD);
    // Pressing again would be refused again; the label stays an action, not an invitation to retry.
    expect(screen.getByTestId('sign-in-submit')).toHaveTextContent('Sign in');
    expect(sessionStore.get().user).toBeNull();
  });

  it('a suspended account: a different message from a wrong password', async () => {
    serve({ '/sign-in/email': { status: 403, body: { code: 'BANNED_USER', message: BANNED } } });
    await show();

    await signIn();

    const error = await screen.findByTestId('sign-in-error');
    expect(error).toHaveTextContent(BANNED);
    expect(error).not.toHaveTextContent(WRONG_PASSWORD);
  });

  it('a dead network: our own message, and the button turns into Try again', async () => {
    serve({ '/sign-in/email': { throws: new TypeError('Network request failed') } });
    await show();

    await signIn();

    const error = await screen.findByTestId('sign-in-error');
    expect(error).toHaveTextContent(/Cannot reach the server/);
    expect(error).not.toHaveTextContent(WRONG_PASSWORD);
    expect(error).not.toHaveTextContent(BANNED);
    expect(screen.getByTestId('sign-in-submit')).toHaveTextContent('Try again');
  });

  it('clears the field error as soon as the field is typed in', async () => {
    serve(SIGNED_IN);
    await show();

    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    expect(screen.getByText('Enter your email address.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'n');
    await waitFor(() =>
      expect(screen.queryByText('Enter your email address.')).not.toBeOnTheScreen(),
    );
  });
});
