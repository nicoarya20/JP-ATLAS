// A stubbed /api/auth for session tests. No request leaves the machine: `fetch` is replaced, and a
// path with no stub fails the way a dead network does, so a test that forgets one sees it.
import type { SessionUser } from '@/session/session.state';

/**
 * What one stubbed route answers: a JSON body, or a thrown failure (no network, abort). `wait` parks
 * the answer until that promise settles, which is how a test looks at a button while it is working.
 */
export type AuthReply =
  | { status?: number; body?: unknown; setCookie?: string; wait?: Promise<unknown> }
  | { throws: unknown };

/** The `set-cookie` Better Auth sends on a successful sign-in; the Expo plugin stores it. */
export const SESSION_SET_COOKIE =
  'better-auth.session_token=tok-123; Path=/; HttpOnly; SameSite=Lax';

/** The cookie header the stored session then produces. */
export const SESSION_COOKIE = 'better-auth.session_token=tok-123';

/**
 * What the Expo plugin leaves under `<prefix>_cookie`: a name -> {value, expires} map. Writing it
 * straight into SecureStore stands in for having signed in, without a second round of stubbing —
 * Better Auth's client captures the `fetch` it was built with, so a stub swapped underneath it is
 * not seen.
 */
export const STORED_COOKIE = JSON.stringify({
  'better-auth.session_token': { value: 'tok-123', expires: null },
});

/** A `/api/auth/get-session` body for `user`, with the session fields the client expects. */
export const sessionPayload = (user: SessionUser) => ({
  session: {
    id: 's-1',
    token: 'tok-123',
    userId: user.id,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  },
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    emailVerified: true,
    approvalStatus: user.approvalStatus,
    approvalReason: user.approvalReason,
    banned: user.banned,
    banReason: user.banReason,
    banExpires: user.banExpires,
  },
});

/**
 * A `GET /api/app/home` body carrying the clock the app start waits for (K1). Only `now` is here:
 * that is all `src/data/home.api.ts` reads of it so far.
 */
export const homePayload = (clock: { today: string; timeZone: string }) => ({ now: clock });

const urlOf = (input: unknown): string => {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  const request = input as { url?: unknown };
  return typeof request.url === 'string' ? request.url : String(input);
};

/**
 * A route answers with a fixed reply, or with a function of the request that was made. Both parts
 * matter: two list requests differ only by their query string, and a task's detail and its delete
 * are the same URL with a different method — a stub that answers the same thing whatever it was
 * asked proves nothing about the request a screen made.
 */
export type AuthRoutes = Record<
  string,
  AuthReply | ((url: string, init?: RequestInit) => AuthReply)
>;

/**
 * Replaces `fetch` with one that answers the given `/api/auth/*` paths. Routes are matched by the
 * path appearing anywhere in the URL, so `'/sign-in/email'` is enough.
 *
 * `use()` swaps the answers on the same `fetch`, which matters: Better Auth's client keeps the
 * `fetch` it was built with (`customFetchImpl`), so installing a second one mid-test would never be
 * seen. Call `restore()` in afterEach.
 */
export function serveAuth(initial: AuthRoutes) {
  const original = globalThis.fetch;
  const calls: string[] = [];
  let routes = initial;
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlOf(input);
    calls.push(url);
    const path = Object.keys(routes).find((candidate) => url.includes(candidate));
    // The same failure a phone with no network produces, naming the gap so the test can be fixed.
    if (!path) throw new TypeError(`Network request failed: no stub for ${url}`);
    const entry = routes[path] as AuthReply | ((url: string, init?: RequestInit) => AuthReply);
    const reply = typeof entry === 'function' ? entry(url, init) : entry;
    if ('throws' in reply) throw reply.throws;
    if (reply.wait) await reply.wait;
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (reply.setCookie) headers['set-cookie'] = reply.setCookie;
    return new Response(JSON.stringify(reply.body ?? null), {
      status: reply.status ?? 200,
      headers,
    });
  }) as unknown as typeof fetch;
  return {
    calls,
    /** Replace the answers without replacing `fetch`. */
    use: (next: AuthRoutes) => {
      routes = next;
    },
    restore: () => {
      globalThis.fetch = original;
    },
  };
}
