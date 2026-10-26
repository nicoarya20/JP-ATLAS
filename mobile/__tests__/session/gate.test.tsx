/**
 * The gate, through the real route tree: what the app shows when it opens, for each thing the
 * server can say about the session. `/api/auth` is stubbed (helpers/auth-server.ts) — no request
 * leaves the machine.
 */
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { resetAuthClient, setAuthHeaders } from '@/api';
import { resetSessionConnection, sessionStore } from '@/session';

import { openApp } from '../helpers/app-router';
import { type AuthRoutes, homePayload, serveAuth, sessionPayload } from '../helpers/auth-server';
import {
  APPROVED_USER,
  PENDING_USER,
  REJECTED_USER,
  resetSessionForTest,
  TEST_CLOCK,
} from '../helpers/session-fixtures';

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  // An approved account also waits for the server's clock before any screen is drawn (K1), so every
  // test that reaches the app needs home answered as well. A test about the clock overrides it.
  const withClock: AuthRoutes = { '/api/app/home': { body: homePayload(TEST_CLOCK) }, ...routes };
  if (server) server.use(withClock);
  else server = serveAuth(withClock);
  return server;
};

beforeEach(() => {
  // The global hook seeds a signed-in account; these tests want the read the app really does.
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

describe('opening the app', () => {
  it('asks for a sign-in when there is no session, and shows no app screen on the way', async () => {
    serve({ '/get-session': { body: null } });

    await openApp('/');

    expect(await screen.findByTestId('screen-login')).toBeOnTheScreen();
    expect(screen.queryByTestId('tab-bar')).not.toBeOnTheScreen();
  });

  it('goes straight into the app for an approved account', async () => {
    serve({ '/get-session': { body: sessionPayload(APPROVED_USER) } });

    await openApp('/');

    expect(await screen.findByTestId('tab-bar')).toBeOnTheScreen();
    expect(screen.queryByTestId('screen-login')).not.toBeOnTheScreen();
  });

  it('keeps an account awaiting approval on the waiting screen, app or not', async () => {
    serve({ '/get-session': { body: sessionPayload(PENDING_USER) } });

    await openApp('/');

    expect(await screen.findByTestId('screen-pending')).toBeOnTheScreen();
    expect(screen.queryByTestId('tab-bar')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('screen-login')).not.toBeOnTheScreen();
  });

  it('sends a turned-down account to the denied screen, not to sign-in', async () => {
    serve({ '/get-session': { body: sessionPayload(REJECTED_USER) } });

    await openApp('/');

    expect(await screen.findByTestId('screen-denied')).toBeOnTheScreen();
    expect(screen.queryByTestId('screen-login')).not.toBeOnTheScreen();
  });

  it('treats a suspended account like a signed-out one, as the server does', async () => {
    serve({
      '/get-session': { body: sessionPayload({ ...APPROVED_USER, banned: true }) },
    });

    await openApp('/');

    expect(await screen.findByTestId('screen-login')).toBeOnTheScreen();
  });

  it('a held account cannot reach an app screen by asking for one', async () => {
    serve({ '/get-session': { body: sessionPayload(PENDING_USER) } });

    await openApp('/tasks');

    expect(await screen.findByTestId('screen-pending')).toBeOnTheScreen();
    expect(screen.queryByTestId('screen-tasks')).not.toBeOnTheScreen();
  });
});

describe("the server's clock", () => {
  it('keeps the splash up until it arrives: no screen is drawn with a date of its own', async () => {
    let answerHome = () => {};
    const held = new Promise<void>((resolve) => {
      answerHome = resolve;
    });
    serve({
      '/get-session': { body: sessionPayload(APPROVED_USER) },
      '/api/app/home': { body: homePayload(TEST_CLOCK), wait: held },
    });

    await openApp('/');

    // The session is read and approved, but the clock is not in yet: the gate still reports
    // `loading`, so the root layout renders nothing at all rather than a dated screen.
    expect(sessionStore.get().user?.id).toBe(APPROVED_USER.id);
    expect(sessionStore.get().clock).toBeNull();
    expect(screen.queryByTestId('tab-bar')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('screen-login')).not.toBeOnTheScreen();

    await act(async () => {
      answerHome();
    });

    expect(await screen.findByTestId('tab-bar')).toBeOnTheScreen();
    expect(sessionStore.get().clock).toEqual(TEST_CLOCK);
  });

  it('offers a retry when it cannot be fetched, rather than letting a screen invent a date', async () => {
    serve({
      '/get-session': { body: sessionPayload(APPROVED_USER) },
      '/api/app/home': { throws: new TypeError('Network request failed') },
    });

    await openApp('/');

    expect(await screen.findByTestId('screen-unreachable')).toBeOnTheScreen();
    expect(screen.queryByTestId('tab-bar')).not.toBeOnTheScreen();
    expect(sessionStore.get().clock).toBeNull();
  });

  it('is asked for only once, however many screens want it', async () => {
    const server = serve({ '/get-session': { body: sessionPayload(APPROVED_USER) } });

    await openApp('/');
    expect(await screen.findByTestId('tab-bar')).toBeOnTheScreen();

    expect(server.calls.filter((url) => url.includes('/api/app/home'))).toHaveLength(1);
  });
});

describe('when the server cannot be reached', () => {
  it('offers a retry instead of guessing that the session ended', async () => {
    serve({ '/get-session': { throws: new TypeError('Network request failed') } });

    await openApp('/');

    expect(await screen.findByTestId('screen-unreachable')).toBeOnTheScreen();
    // The reason, not a generic apology: the message the failed request produced.
    expect(screen.getByRole('alert')).toHaveTextContent(/Cannot reach the server/);
    // Neither half of the app is shown: which one it would be is exactly what is unknown.
    expect(screen.queryByTestId('screen-login')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('tab-bar')).not.toBeOnTheScreen();
  });

  it('gets in once the retry succeeds', async () => {
    serve({ '/get-session': { throws: new TypeError('Network request failed') } });
    await openApp('/');
    const retry = await screen.findByTestId('unreachable-retry');

    serve({ '/get-session': { body: sessionPayload(APPROVED_USER) } });
    // Awaited inside act: the press starts a request, and its answer re-renders the whole gate.
    await act(async () => {
      fireEvent.press(retry);
    });

    await waitFor(() => expect(screen.getByTestId('tab-bar')).toBeOnTheScreen());
  });
});
