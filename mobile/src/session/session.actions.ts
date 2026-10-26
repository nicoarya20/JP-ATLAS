/**
 * The three things that change the session: reading it, signing in, signing out.
 *
 * Every call goes through `authCall`, which gives Better Auth's client the timeout it has none of
 * (a phone on a dead network would otherwise hang on the splash screen) and turns both of its
 * failure shapes into the one `ApiError` the screens handle.
 */
import {
  clearStoredSession,
  connectSessionToApi,
  getAuthClient,
  REQUEST_TIMEOUT_MS,
} from '@/api';
import { type AuthFailure, asApiError, authFailureError } from './session.errors';
import {
  clearSession,
  type SessionStatus,
  setSessionUnreachable,
  setSessionUser,
} from './session.state';
import { toSessionUser } from './session.user';

/** Better Auth's client resolves to this, or throws when the request never got an answer. */
type AuthResult<T> = { data: T | null; error?: AuthFailure | null };

/**
 * Runs one `/api/auth/*` call under the API client's timeout budget, and raises an ApiError for
 * whichever way it failed. Nothing is swallowed: the original failure stays on `cause`.
 */
async function authCall<T>(
  run: (fetchOptions: { signal: AbortSignal }) => Promise<AuthResult<T>>,
): Promise<T | null> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  try {
    const { data, error } = await run({ signal: controller.signal });
    if (error) throw authFailureError(error);
    return data ?? null;
  } catch (cause) {
    throw asApiError(cause, timedOut);
  } finally {
    clearTimeout(timer);
  }
}

let connected = false;

/**
 * Points the API client at the stored session, once per app start. Until this runs, `/api/app/*`
 * requests carry no cookie and come back 401 — the Expo plugin only attaches the session to
 * `/api/auth/*` by itself.
 */
export function connectSession(): void {
  if (connected) return;
  connected = true;
  connectSessionToApi();
}

/** Lets the next `connectSession()` run again. test-only */
export function resetSessionConnection(): void {
  connected = false;
}

/**
 * Reads the session from the server and records what it says. A failure that proves nothing about
 * the session (no network, timeout) leaves the app on `unreachable` with the reason, rather than
 * dropping someone at the sign-in screen as if their session had ended.
 */
export async function refreshSession(): Promise<SessionStatus> {
  try {
    const payload = await authCall((fetchOptions) =>
      getAuthClient().getSession({ fetchOptions }),
    );
    return setSessionUser(toSessionUser(payload));
  } catch (cause) {
    const error = asApiError(cause);
    // A 401 here is not a failure to report: it is the answer "nobody is signed in".
    if (error.status === 401) {
      clearSession();
      return 'signed-out';
    }
    setSessionUnreachable(error);
    return 'unreachable';
  }
}

/**
 * Signs in with email and password, then reads the session back so the gate decides from the
 * server's own answer — a sign-in succeeds for an account still awaiting approval, and only the
 * session payload says so.
 *
 * Throws ApiError for a refused sign-in (wrong credentials, a suspended account) with the
 * server's own message, and for a request that never arrived (`isTransport`, so offer a retry).
 */
export async function signInWithEmail(email: string, password: string): Promise<SessionStatus> {
  await authCall((fetchOptions) =>
    getAuthClient().signIn.email({ email: email.trim(), password, fetchOptions }),
  );
  return refreshSession();
}

/**
 * Ends the session on the server, then empties the phone's copy. The server call is not optional:
 * clearing only the phone would leave a session token the server still honours, so a failure is
 * raised for the caller to show and retry instead of claiming the account was signed out.
 *
 * A 401 is the exception — the session was already gone, so there is nothing left to end.
 */
export async function signOutEverywhere(): Promise<void> {
  try {
    await authCall((fetchOptions) => getAuthClient().signOut({ fetchOptions }));
  } catch (cause) {
    const error = asApiError(cause);
    if (error.status !== 401) throw error;
  }
  await clearStoredSession();
  clearSession();
}
