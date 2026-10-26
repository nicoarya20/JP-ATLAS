/**
 * Signing in, reading the session back and signing out, through the real Better Auth client with a
 * stubbed `/api/auth` (helpers/auth-server.ts). Nothing talks to a server.
 *
 * The three failures a sign-in can hit each have to say something different: a refused password, an
 * account the server is holding, and a request that never arrived.
 */
import {
  isApiError,
  resetAuthClient,
  SESSION_STORAGE_PREFIX,
  sessionHeaders,
  setAuthHeaders,
} from '@/api';
import {
  connectSession,
  refreshSession,
  resetSessionConnection,
  sessionStore,
  signInWithEmail,
  signOutEverywhere,
} from '@/session';

import {
  type AuthRoutes,
  SESSION_COOKIE,
  SESSION_SET_COOKIE,
  STORED_COOKIE,
  serveAuth,
  sessionPayload,
} from '../helpers/auth-server';
import {
  APPROVED_USER,
  PENDING_USER,
  REJECTED_USER,
  resetSessionForTest,
  seedSession,
} from '../helpers/session-fixtures';

/** nanostores' STORE_UNMOUNT_DELAY; not imported, because nanostores is better-auth's dep, not ours. */
const STORE_UNMOUNT_DELAY_MS = 1000;

/** Better Auth's own wording, which this app shows as it came rather than keeping a second copy. */
const WRONG_PASSWORD = 'Invalid email or password';
const BANNED = 'You have been banned from this application';

const secureStore = jest.requireMock('expo-secure-store') as { __store: Map<string, string> };

let server: ReturnType<typeof serveAuth> | null = null;
/** Installs the stub on the first call and swaps its answers afterwards (see serveAuth). */
const serve = (routes: AuthRoutes) => {
  if (server) server.use(routes);
  else server = serveAuth(routes);
  return server;
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

afterAll(async () => {
  resetAuthClient();
  await new Promise((resolve) => setTimeout(resolve, STORE_UNMOUNT_DELAY_MS + 100));
});

describe('refreshSession', () => {
  it('records an approved account and lets it into the app', async () => {
    serve({ '/get-session': { body: sessionPayload(APPROVED_USER) } });
    await expect(refreshSession()).resolves.toBe('signed-in');
    expect(sessionStore.get().user).toMatchObject({
      id: APPROVED_USER.id,
      email: APPROVED_USER.email,
      approvalStatus: 'approved',
    });
  });

  it('is signed out when the server reports no session', async () => {
    serve({ '/get-session': { body: null } });
    await expect(refreshSession()).resolves.toBe('signed-out');
    expect(sessionStore.get().user).toBeNull();
  });

  it('holds an account the server has not approved yet', async () => {
    serve({ '/get-session': { body: sessionPayload(PENDING_USER) } });
    await expect(refreshSession()).resolves.toBe('pending');
  });

  it('keeps the reason when the server could not be reached, instead of guessing signed out', async () => {
    serve({ '/get-session': { throws: new TypeError('Network request failed') } });
    await expect(refreshSession()).resolves.toBe('unreachable');
    const { error } = sessionStore.get();
    expect(error?.isTransport).toBe(true);
    expect(error?.message).toMatch(/Cannot reach the server/);
  });

  it('leaves no clock behind for Phase 2 step 3 to find: home has not been asked yet', async () => {
    serve({ '/get-session': { body: sessionPayload(APPROVED_USER) } });
    await refreshSession();
    expect(sessionStore.get().clock).toBeNull();
  });
});

describe('signInWithEmail', () => {
  it('stores the session and lets an approved account in', async () => {
    serve({
      '/sign-in/email': {
        body: { redirect: false, token: 'tok-123' },
        setCookie: SESSION_SET_COOKIE,
      },
      '/get-session': { body: sessionPayload(APPROVED_USER) },
    });

    await expect(signInWithEmail(' nico@kantor.id ', 'rahasia')).resolves.toBe('signed-in');
    expect(sessionStore.get().user?.email).toBe(APPROVED_USER.email);
    // The session is on the phone now, so /api/app/* requests can carry it.
    connectSession();
    await expect(sessionHeaders()).resolves.toEqual({ cookie: SESSION_COOKIE });
  });

  it('stops at the waiting screen for an account awaiting approval, not at an error', async () => {
    serve({
      '/sign-in/email': {
        body: { redirect: false, token: 'tok-123' },
        setCookie: SESSION_SET_COOKIE,
      },
      '/get-session': { body: sessionPayload(PENDING_USER) },
    });
    await expect(signInWithEmail('budi@kantor.id', 'rahasia')).resolves.toBe('pending');
  });

  it('stops at the denied screen for an account that was turned down', async () => {
    serve({
      '/sign-in/email': {
        body: { redirect: false, token: 'tok-123' },
        setCookie: SESSION_SET_COOKIE,
      },
      '/get-session': { body: sessionPayload(REJECTED_USER) },
    });
    await expect(signInWithEmail('budi@kantor.id', 'rahasia')).resolves.toBe('rejected');
    expect(sessionStore.get().user?.approvalReason).toBe(REJECTED_USER.approvalReason);
  });

  it('reports a refused password with the server’s own message, and offers no retry', async () => {
    serve({
      '/sign-in/email': {
        status: 401,
        body: { code: 'INVALID_EMAIL_OR_PASSWORD', message: WRONG_PASSWORD },
      },
    });

    const thrown = await signInWithEmail('nico@kantor.id', 'salah').catch((e: unknown) => e);
    expect(isApiError(thrown) && thrown.code).toBe('INVALID_EMAIL_OR_PASSWORD');
    expect(isApiError(thrown) && thrown.message).toBe(WRONG_PASSWORD);
    expect(isApiError(thrown) && thrown.isTransport).toBe(false);
    // A refused sign-in must not look like a session: nobody is signed in.
    expect(sessionStore.get().user).toBeNull();
  });

  it('reports a suspended account differently from a wrong password', async () => {
    serve({
      '/sign-in/email': { status: 403, body: { code: 'BANNED_USER', message: BANNED } },
    });

    const thrown = await signInWithEmail('nico@kantor.id', 'rahasia').catch((e: unknown) => e);
    expect(isApiError(thrown) && thrown.code).toBe('BANNED_USER');
    expect(isApiError(thrown) && thrown.message).toBe(BANNED);
    expect(isApiError(thrown) && thrown.message).not.toBe(WRONG_PASSWORD);
    expect(isApiError(thrown) && thrown.isTransport).toBe(false);
  });

  it('reports a dead network as something worth retrying, with its own message', async () => {
    serve({ '/sign-in/email': { throws: new TypeError('Network request failed') } });

    const thrown = await signInWithEmail('nico@kantor.id', 'rahasia').catch((e: unknown) => e);
    expect(isApiError(thrown) && thrown.isTransport).toBe(true);
    expect(isApiError(thrown) && thrown.message).toMatch(/Cannot reach the server/);
    expect(isApiError(thrown) && thrown.message).not.toBe(WRONG_PASSWORD);
    expect(isApiError(thrown) && thrown.message).not.toBe(BANNED);
  });
});

describe('signOutEverywhere', () => {
  /** A stored session to end, without signing in first (see STORED_COOKIE on why). */
  const signedIn = () => {
    secureStore.__store.set(`${SESSION_STORAGE_PREFIX}_cookie`, STORED_COOKIE);
    seedSession(APPROVED_USER);
  };

  it('ends the session on the server and empties the phone', async () => {
    signedIn();
    const out = serve({ '/sign-out': { body: { success: true } } });

    await signOutEverywhere();

    expect(out.calls.some((url) => url.includes('/sign-out'))).toBe(true);
    expect(sessionStore.get()).toMatchObject({ status: 'signed-out', user: null });
    await expect(sessionHeaders()).resolves.toEqual({});
  });

  it('empties the phone too when the server says the session was already gone', async () => {
    signedIn();
    serve({ '/sign-out': { status: 401, body: { code: 'FAILED_TO_GET_SESSION' } } });

    await expect(signOutEverywhere()).resolves.toBeUndefined();
    expect(sessionStore.get().status).toBe('signed-out');
    await expect(sessionHeaders()).resolves.toEqual({});
  });

  it('refuses to claim a sign-out it could not make, and stays where it was', async () => {
    signedIn();
    serve({ '/sign-out': { throws: new TypeError('Network request failed') } });

    const thrown = await signOutEverywhere().catch((e: unknown) => e);
    expect(isApiError(thrown) && thrown.isTransport).toBe(true);
    // Still signed in as far as this app is concerned, so the dialog keeps its error and the person
    // can try again rather than being told an account was signed out when it was not.
    expect(sessionStore.get().status).toBe('signed-in');
  });

  it('settles on the retry, which the server answers 401 — the session is gone either way', async () => {
    signedIn();
    serve({ '/sign-out': { throws: new TypeError('Network request failed') } });
    await signOutEverywhere().catch(() => undefined);

    // The Expo plugin empties the stored cookie before it sends, so the phone cannot prove the
    // session any more and the second attempt goes out without one.
    await expect(sessionHeaders()).resolves.toEqual({});
    serve({ '/sign-out': { status: 401, body: { code: 'FAILED_TO_GET_SESSION' } } });

    await expect(signOutEverywhere()).resolves.toBeUndefined();
    expect(sessionStore.get().status).toBe('signed-out');
  });
});
