/** Text size cookie (pure helpers) and the root loader's resolution order (cookie, profile, default). */
import { afterAll, afterEach, beforeAll, describe, expect, it, spyOn } from 'bun:test';
import { eq } from 'drizzle-orm';
import { auth } from '../server/auth';
import { db } from '../server/db';
import { profile, user } from '../server/db/schema';
import { TEXT_SIZES } from '../server/pm/enums';
import { registerProcessLogger } from '../server/ssr-log';
import {
  getTextSize,
  isTextSize,
  readTextSizeCookie,
  TEXT_SCALE,
  TEXT_SIZE_COOKIE,
  textSizeCookie,
} from '../server/text-size';
import { resolveTextSize } from '../server/text-size.loader';
import { testUser } from './support/accounts';

const req = (cookie?: string) =>
  new Request('http://localhost/login', cookie ? { headers: { cookie } } : undefined);
const SESSION = 'better-auth.session_token=abc';

describe('text size helpers', () => {
  it('names the cookie mk-text-size and maps the three sizes to scales', () => {
    expect(TEXT_SIZE_COOKIE).toBe('mk-text-size');
    expect(TEXT_SCALE).toEqual({ normal: 1, besar: 1.25, sangat_besar: 1.5 });
    expect(Object.keys(TEXT_SCALE)).toEqual([...TEXT_SIZES]);
  });

  it.each([...TEXT_SIZES])('parses %s from a cookie header among other cookies', (size) => {
    expect(getTextSize(req(`a=1; ${TEXT_SIZE_COOKIE}=${size}; b=2`))).toBe(size);
    expect(getTextSize(req(`${TEXT_SIZE_COOKIE}=${size}`))).toBe(size);
  });

  it.each(['huge', '', 'BESAR', '1.5', 'normal;besar'])(
    'falls back to normal for the unknown value %p',
    (raw) => {
      expect(getTextSize(req(`${TEXT_SIZE_COOKIE}=${raw}`))).toBe('normal');
    },
  );

  it('falls back to normal without a cookie header and ignores look-alike cookie names', () => {
    expect(getTextSize(req())).toBe('normal');
    expect(getTextSize(req('x-mk-text-size=besar'))).toBe('normal');
    expect(readTextSizeCookie(req('x-mk-text-size=besar'))).toBeNull();
  });

  it('serialises with Path, one-year Max-Age and SameSite=Lax, and round-trips', () => {
    const header = textSizeCookie('besar');
    expect(header).toBe('mk-text-size=besar; Path=/; Max-Age=31536000; SameSite=Lax');
    // A browser sends back only name=value.
    for (const size of TEXT_SIZES) {
      const pair = textSizeCookie(size).split(';')[0] as string;
      expect(getTextSize(req(pair))).toBe(size);
    }
  });

  it('isTextSize accepts exactly the profile CHECK values', () => {
    for (const size of TEXT_SIZES) expect(isTextSize(size)).toBe(true);
    for (const bad of ['', 'Normal', null, undefined, 1]) expect(isTextSize(bad)).toBe(false);
  });
});

describe('resolveTextSize', () => {
  const owner = testUser();
  const getSession = spyOn(auth.api, 'getSession');
  const select = spyOn(db, 'select');

  beforeAll(async () => {
    await db.insert(user).values(owner);
    await db.insert(profile).values({ userId: owner.id, textSize: 'sangat_besar' });
  });
  afterEach(() => {
    getSession.mockReset();
    select.mockClear();
    registerProcessLogger(null);
  });
  afterAll(async () => {
    getSession.mockRestore();
    select.mockRestore();
    await db.delete(user).where(eq(user.id, owner.id)); // profile cascades
  });

  const signedIn = () =>
    getSession.mockImplementation((async () => ({
      user: { id: owner.id },
    })) as unknown as typeof auth.api.getSession);

  it('prefers the cookie over the profile and touches neither session nor DB', async () => {
    signedIn();
    expect(await resolveTextSize(req(`${SESSION}; ${TEXT_SIZE_COOKIE}=besar`))).toBe('besar');
    expect(getSession).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it('does not call the session or DB when there is no cookie at all', async () => {
    expect(await resolveTextSize(req())).toBe('normal');
    expect(await resolveTextSize(req('theme=dark'))).toBe('normal');
    expect(getSession).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it('reads profile.text_size when only a session cookie is present', async () => {
    signedIn();
    expect(await resolveTextSize(req(SESSION))).toBe('sangat_besar');
    // An unknown cookie value counts as "empty" and falls through to the profile too.
    expect(await resolveTextSize(req(`${SESSION}; ${TEXT_SIZE_COOKIE}=huge`))).toBe('sangat_besar');
  });

  it('is normal when the session cookie no longer maps to a session', async () => {
    getSession.mockImplementation((async () => null) as unknown as typeof auth.api.getSession);
    expect(await resolveTextSize(req(SESSION))).toBe('normal');
    expect(select).not.toHaveBeenCalled();
  });

  it('is normal and logs without the user id when the DB lookup fails', async () => {
    signedIn();
    select.mockImplementationOnce((() => {
      throw new Error(`boom for ${owner.id}`);
    }) as unknown as typeof db.select);
    const logged: unknown[] = [];
    registerProcessLogger({ warn: (o) => logged.push(o), error: (o) => logged.push(o) });
    expect(await resolveTextSize(req(SESSION))).toBe('normal');
    expect(logged).toEqual([{ err: 'Error' }]);
    expect(JSON.stringify(logged)).not.toContain(owner.id);
  });
});
