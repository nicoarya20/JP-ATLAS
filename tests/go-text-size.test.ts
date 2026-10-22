/** /go sets the text size cookie from the stored profile on a new device, and never from a failed lookup. */
import { afterAll, afterEach, describe, expect, test } from 'bun:test';
import { loader } from '../app/routes/go';
import { db } from '../server/db';
import { profile } from '../server/db/schema';
import { TEXT_SIZE_COOKIE, textSizeCookie } from '../server/text-size';
import { installAuthSpies } from './support/auth';
import { createCleaner } from './support/cleanup';
import { createUserFactory } from './support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const users = createUserFactory(cleaner, { tag: 'go' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const SESSION = 'better-auth.session_token=test'; // test-only

/** Runs the loader and returns the redirect it throws (it never returns normally). */
async function runGo(cookie: string): Promise<Response> {
  const request = new Request('http://localhost/go', { headers: { cookie } });
  try {
    await loader({ request } as Parameters<typeof loader>[0]);
  } catch (thrown) {
    if (thrown instanceof Response) return thrown;
    throw thrown;
  }
  throw new Error('go loader returned instead of redirecting');
}

describe('/go loader', () => {
  test('copies a non-default stored size into the cookie on a new device', async () => {
    const me = await users.user();
    await db.insert(profile).values({ userId: me.id, textSize: 'besar' });
    auth.as(me);
    const res = await runGo(SESSION);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/app');
    expect(res.headers.get('set-cookie')).toBe(textSizeCookie('besar'));
  });

  test('keeps the existing cookie: no lookup result overrides this device', async () => {
    const me = await users.user();
    await db.insert(profile).values({ userId: me.id, textSize: 'besar' });
    auth.as(me);
    const res = await runGo(`${SESSION}; ${TEXT_SIZE_COOKIE}=sangat_besar`);
    expect(res.headers.get('location')).toBe('/app');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  test('writes no cookie when the stored size is the default', async () => {
    const me = await users.user();
    await db.insert(profile).values({ userId: me.id, textSize: 'normal' });
    auth.as(me);
    expect((await runGo(SESSION)).headers.get('set-cookie')).toBeNull();
  });

  test('writes no cookie when signed out', async () => {
    auth.as(null);
    const res = await runGo(SESSION);
    expect(res.headers.get('location')).toStartWith('/login');
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});
