/**
 * Trusted origins for the React Native app: MOBILE_TRUSTED_ORIGINS parsing, the Better Auth
 * config built from it, and proof that the web's cookie sessions keep the behaviour they had
 * before the expo plugin was added (same origin accepted, foreign origin still refused).
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { inArray } from 'drizzle-orm';
import { api } from '../server/api';
import { auth } from '../server/auth';
import { db } from '../server/db';
import { user } from '../server/db/schema';
import { env, MobileTrustedOriginsSchema, mobileTrustedOrigins } from '../server/env';
import {
  buildMobileTrustedOrigins,
  invalidOriginEntries,
  MOBILE_APP_ORIGIN,
  splitOriginList,
} from '../server/mobile-origins';

const WEB_ORIGIN = new URL(env.BETTER_AUTH_URL).origin;
const FOREIGN_ORIGIN = 'http://evil.test';
const TAG = `morg-${crypto.randomUUID().slice(0, 8)}`;
const PASS = 'TestPass123!';
const createdEmails: string[] = [];

afterAll(async () => {
  if (createdEmails.length) await db.delete(user).where(inArray(user.email, createdEmails));
});

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return api.handle(
    new Request(`http://localhost/api/auth${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  );
}

/** Cookie header built from a response's Set-Cookie list. */
function cookieOf(res: Response) {
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .filter(Boolean)
    .join('; ');
  expect(cookie).not.toBe('');
  return cookie;
}

/** Email on the session that cookie resolves to, or undefined when it resolves to none. */
async function emailOfSession(cookie: string) {
  const res = await api.handle(
    new Request('http://localhost/api/auth/get-session', { headers: { cookie } }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as { user?: { email?: string } } | null;
  return body?.user?.email;
}

/** Signs a new account up and returns its credentials plus the session cookie header. */
async function signUp() {
  const email = `${TAG}-${crypto.randomUUID().slice(0, 6)}@test.local`;
  createdEmails.push(email);
  const res = await post('/sign-up/email', { email, password: PASS, name: 'Mobile Origin' });
  expect(res.status).toBe(200);
  return { email, cookie: cookieOf(res) };
}

describe('MOBILE_TRUSTED_ORIGINS parsing', () => {
  test('empty value yields no extra origins', () => {
    expect(MobileTrustedOriginsSchema.parse('')).toEqual([]);
    expect(MobileTrustedOriginsSchema.parse(undefined)).toEqual([]);
    expect(splitOriginList(null)).toEqual([]);
  });

  test('entries are trimmed, blanks dropped and duplicates removed', () => {
    expect(
      MobileTrustedOriginsSchema.parse(
        ' http://192.168.1.10:3005 , , simplepm-staging:// ,http://192.168.1.10:3005',
      ),
    ).toEqual(['http://192.168.1.10:3005', 'simplepm-staging://']);
  });

  test('wildcard patterns Better Auth understands are accepted', () => {
    expect(MobileTrustedOriginsSchema.parse('exp://192.168.*.*:*/**')).toEqual([
      'exp://192.168.*.*:*/**',
    ]);
  });

  test('an entry that is not <scheme>://<host> fails boot', () => {
    for (const bad of ['192.168.1.10:3005', 'simplepm', '://nohost', 'http://with space']) {
      expect(invalidOriginEntries([bad])).toEqual([bad]);
      expect(MobileTrustedOriginsSchema.safeParse(bad).success).toBe(false);
    }
  });

  test('the app scheme is always present, even with no env value', () => {
    expect(buildMobileTrustedOrigins([])).toEqual([MOBILE_APP_ORIGIN]);
    expect(buildMobileTrustedOrigins(['http://192.168.1.10:3005'])).toEqual([
      MOBILE_APP_ORIGIN,
      'http://192.168.1.10:3005',
    ]);
  });

  test('the app scheme is not repeated when the env names it too', () => {
    expect(buildMobileTrustedOrigins([MOBILE_APP_ORIGIN, 'exp://'])).toEqual([
      MOBILE_APP_ORIGIN,
      'exp://',
    ]);
  });
});

describe('Better Auth config', () => {
  test('the expo plugin is registered', () => {
    const ids = (auth.options.plugins ?? []).map((p) => p.id);
    expect(ids).toContain('expo');
  });

  test('trustedOrigins carries exactly what the env built', () => {
    expect(auth.options.trustedOrigins).toEqual([...mobileTrustedOrigins]);
    expect(auth.options.trustedOrigins).toContain(MOBILE_APP_ORIGIN);
  });

  test('the scheme is not read from the environment', () => {
    // Deep link scheme belongs to the app (mobile/app.config.ts), so an empty env still trusts it.
    expect(env.MOBILE_TRUSTED_ORIGINS).toEqual([]);
    expect(mobileTrustedOrigins).toEqual([MOBILE_APP_ORIGIN]);
  });
});

/**
 * Which origins the running instance trusts. Better Auth turns the origin check itself off while
 * NODE_ENV=test (`skipOriginCheck` defaults to true there), so asserting a 403 on a foreign origin
 * would pass for the wrong reason; `isTrustedOrigin` is the decision that check makes, and it is
 * live in every environment.
 */
const trusts = async (url: string) => (await auth.$context).isTrustedOrigin(url);

describe('web cookie sessions are unchanged', () => {
  test('the web origin is still trusted', async () => {
    expect(await trusts(WEB_ORIGIN)).toBe(true);
    expect(await trusts(`${WEB_ORIGIN}/dashboard`)).toBe(true);
  });

  test('a foreign origin is still refused', async () => {
    expect(await trusts(FOREIGN_ORIGIN)).toBe(false);
    expect(await trusts('https://simplepm.evil.test')).toBe(false);
  });

  test('a cookie session still reads back after sign-up', async () => {
    const { email, cookie } = await signUp();
    expect(await emailOfSession(cookie)).toBe(email);
  });

  test('sign-in from the web origin still returns a working cookie', async () => {
    const { email } = await signUp();
    const res = await post('/sign-in/email', { email, password: PASS }, { origin: WEB_ORIGIN });
    expect(res.status).toBe(200);
    expect(await emailOfSession(cookieOf(res))).toBe(email);
  });
});

describe('the mobile app is accepted', () => {
  test('the app scheme is trusted, with or without a deep-link path', async () => {
    expect(await trusts(MOBILE_APP_ORIGIN)).toBe(true);
    expect(await trusts('simplepm://app/home')).toBe(true);
  });

  test('a look-alike scheme is not trusted', async () => {
    expect(await trusts('simplepm-evil://app/home')).toBe(false);
  });

  test('a request that carries only expo-origin signs in', async () => {
    // React Native sends no Origin header; @better-auth/expo copies `expo-origin` over so the
    // origin check sees the app scheme instead of refusing the request for a missing origin.
    const { email } = await signUp();
    const res = await post(
      '/sign-in/email',
      { email, password: PASS },
      { 'expo-origin': MOBILE_APP_ORIGIN },
    );
    expect(res.status).toBe(200);
    expect(await emailOfSession(cookieOf(res))).toBe(email);
  });
});
