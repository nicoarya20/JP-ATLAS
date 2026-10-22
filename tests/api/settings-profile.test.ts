/** GET/PATCH /api/app/profile: validation, text size cookie, guards, ignored sensitive fields, no cross-user leak. */
import { afterAll, afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { API_KEY_PREFIX } from '../../server/auth';
import { db } from '../../server/db';
import { profile, user } from '../../server/db/schema';
import { TEXT_SIZES } from '../../server/pm/enums';
import { PROFILE_NAME_MAX, PROFILE_PHONE_MAX } from '../../server/profile/profile.service';
import { TEXT_SIZE_COOKIE } from '../../server/text-size';
import { resolveTextSize } from '../../server/text-size.loader';
import { call, expectApiError } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createUserFactory } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const users = createUserFactory(cleaner, { tag: 'prof' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const PATH = '/app/profile';
const SESSION_COOKIE = 'better-auth.session_token=test'; // test-only
const profileRow = async (userId: string) =>
  (await db.select().from(profile).where(eq(profile.userId, userId)))[0];
const roleOf = async (userId: string) =>
  (await db.select({ role: user.role }).from(user).where(eq(user.id, userId)))[0]?.role;

describe('GET /profile', () => {
  test('returns defaults for an account without a profile row', async () => {
    const me = await users.user();
    auth.as(me);
    const res = await call('GET', PATH);
    expect<number>(res.status).toBe(200);
    expect(res.body).toEqual({
      userId: me.id,
      name: me.name,
      email: me.email,
      displayName: null,
      nickname: null,
      phone: null,
      jobTitle: null,
      department: null,
      textSize: 'normal',
    });
  });

  test("never shows another account's email or profile fields", async () => {
    const me = await users.user();
    const other = await users.user();
    await db.insert(profile).values({
      userId: other.id,
      displayName: 'Rahasia Orang Lain', // test-only
      phone: '0811000999', // test-only
      textSize: 'sangat_besar',
    });
    auth.as(me);
    const res = await call('GET', PATH);
    const raw = JSON.stringify(res.body);
    expect(res.body.userId).toBe(me.id);
    expect(res.body.textSize).toBe('normal');
    for (const secret of [other.id, other.email, 'Rahasia Orang Lain', '0811000999']) {
      expect(raw).not.toContain(secret);
    }
  });

  test('anonymous → 401', async () => {
    auth.as(null);
    expectApiError(await call('GET', PATH), 401, 'UNAUTHORIZED');
  });
});

describe('PATCH /profile', () => {
  test.each([...TEXT_SIZES])('accepts textSize %s, stores it and sets the cookie', async (size) => {
    const me = await users.user();
    auth.as(me);
    const res = await call('PATCH', PATH, { textSize: size });
    expect<number>(res.status).toBe(200);
    expect(res.body.textSize).toBe(size);
    expect((await profileRow(me.id))?.textSize).toBe(size);
    expect(res.headers.get('set-cookie')).toBe(
      `${TEXT_SIZE_COOKIE}=${size}; Path=/; Max-Age=31536000; SameSite=Lax`,
    );
  });

  test.each([['besar2'], [''], ['BESAR']])(
    'rejects the unknown textSize %p with 422 and writes nothing',
    async (bad) => {
      const me = await users.user();
      auth.as(me);
      const res = await call('PATCH', PATH, { textSize: bad });
      expectApiError(res, 422, 'VALIDATION');
      expect(res.headers.get('set-cookie')).toBeNull();
      expect(await profileRow(me.id)).toBeUndefined();
    },
  );

  test('edits only the sent fields, trims text and clears blank ones to null', async () => {
    const me = await users.user();
    await db.insert(profile).values({ userId: me.id, phone: '0812', jobTitle: 'Analis' }); // test-only
    auth.as(me);
    const res = await call('PATCH', PATH, {
      displayName: '  Budi Santoso  ', // test-only
      department: 'Operasional', // test-only
      jobTitle: '   ',
    });
    expect<number>(res.status).toBe(200);
    expect(res.body).toMatchObject({
      displayName: 'Budi Santoso',
      department: 'Operasional',
      jobTitle: null,
      phone: '0812',
      textSize: 'normal',
    });
    expect(res.headers.get('set-cookie')).toBeNull();
    const row = await profileRow(me.id);
    expect(row).toMatchObject({ displayName: 'Budi Santoso', jobTitle: null, phone: '0812' });
  });

  test('an empty body changes nothing and sets no cookie', async () => {
    const me = await users.user();
    auth.as(me);
    const res = await call('PATCH', PATH, {});
    expect<number>(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(await profileRow(me.id)).toBeUndefined();
  });

  test.each([
    ['displayName', 'x'.repeat(PROFILE_NAME_MAX + 1)],
    ['phone', '1'.repeat(PROFILE_PHONE_MAX + 1)],
    ['jobTitle', 'x'.repeat(PROFILE_NAME_MAX + 1)],
    ['department', 'x'.repeat(PROFILE_NAME_MAX + 1)],
    ['displayName', 42],
  ])('rejects an invalid %s with 422', async (field, value) => {
    const me = await users.user();
    auth.as(me);
    expectApiError(await call('PATCH', PATH, { [field]: value }), 422, 'VALIDATION');
  });

  test('ignores role, approvalStatus, email and name smuggled into the body', async () => {
    const me = await users.user({ role: 'member' });
    auth.as(me);
    const res = await call('PATCH', PATH, {
      role: 'admin',
      approvalStatus: 'approved',
      banned: false,
      email: 'attacker@example.test', // test-only
      name: 'Nama Palsu', // test-only
      userId: 'someone-else',
      phone: '0812',
    });
    expect<number>(res.status).toBe(200);
    expect(res.body).toMatchObject({
      userId: me.id,
      email: me.email,
      name: me.name,
      phone: '0812',
    });
    expect(await roleOf(me.id)).toBe('member');
    const [account] = await db.select().from(user).where(eq(user.id, me.id));
    expect(account).toMatchObject({ email: me.email, name: me.name, role: 'member' });
    expect(await profileRow('someone-else')).toBeUndefined();
  });

  test('never touches another account', async () => {
    const me = await users.user();
    const other = await users.user();
    await db.insert(profile).values({ userId: other.id, phone: '0899' }); // test-only
    auth.as(me);
    await call('PATCH', PATH, { phone: '0811', userId: other.id });
    expect((await profileRow(other.id))?.phone).toBe('0899');
    expect((await profileRow(me.id))?.phone).toBe('0811');
  });

  test('anonymous → 401 before any validation', async () => {
    auth.as(null);
    expectApiError(await call('PATCH', PATH, { textSize: 'besar2' }), 401, 'UNAUTHORIZED');
  });

  test.each([
    ['pending', 'ACCOUNT_PENDING'],
    ['rejected', 'ACCOUNT_REJECTED'],
  ] as const)('%s account → 403 %s', async (status, code) => {
    const held = await users.user({ status });
    auth.as(held);
    expectApiError(await call('PATCH', PATH, { textSize: 'besar' }), 403, code);
    expect(await profileRow(held.id)).toBeUndefined();
  });

  test('an API key is refused with 403, whatever its scopes', async () => {
    const me = await users.user();
    auth.as(me);
    const res = await call(
      'PATCH',
      PATH,
      { textSize: 'besar' },
      { 'x-api-key': `${API_KEY_PREFIX}not-a-real-key` },
    );
    expect<number>(res.status).toBe(403);
    expect(await profileRow(me.id)).toBeUndefined();
  });
});

describe('cookie written by PATCH is what the root loader reads (S1-07)', () => {
  test('resolveTextSize returns the saved size from the Set-Cookie value', async () => {
    const me = await users.user();
    auth.as(me);
    const res = await call('PATCH', PATH, { textSize: 'sangat_besar' });
    const pair = (res.headers.get('set-cookie') ?? '').split(';')[0];
    expect(pair).toBe(`${TEXT_SIZE_COOKIE}=sangat_besar`);
    const withCookie = new Request('http://localhost/app', { headers: { cookie: pair } });
    expect(await resolveTextSize(withCookie)).toBe('sangat_besar');
  });

  test('on a new device (no cookie) resolveTextSize falls back to the stored profile value', async () => {
    const me = await users.user();
    auth.as(me);
    await call('PATCH', PATH, { textSize: 'besar' });
    const fresh = new Request('http://localhost/app', { headers: { cookie: SESSION_COOKIE } });
    expect(await resolveTextSize(fresh)).toBe('besar');
  });
});
