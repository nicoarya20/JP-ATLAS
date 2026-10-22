/** PATCH /api/app/profile nickname: stored trimmed, returned by GET, blank clears it, too long is refused. */
import { afterAll, afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { profile } from '../../server/db/schema';
import { PROFILE_NICKNAME_MAX } from '../../server/profile/profile.rules';
import { call } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createUserFactory } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const users = createUserFactory(cleaner, { tag: 'nickname' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const PATH = '/app/profile';
const nicknameOf = async (userId: string) =>
  (await db.select().from(profile).where(eq(profile.userId, userId)))[0]?.nickname;

describe('PATCH /profile nickname', () => {
  test('stores it trimmed, GET returns it, and a blank value clears it', async () => {
    const me = await users.user();
    auth.as(me);
    const saved = await call('PATCH', PATH, { nickname: '  Nico ' }); // test-only
    expect<number>(saved.status).toBe(200);
    expect(saved.body.nickname).toBe('Nico');
    expect(await nicknameOf(me.id)).toBe('Nico');
    expect((await call('GET', PATH)).body.nickname).toBe('Nico');

    const cleared = await call('PATCH', PATH, { nickname: '   ' });
    expect(cleared.body.nickname).toBeNull();
    expect(await nicknameOf(me.id)).toBeNull();
  });

  test('refuses a nickname over the limit and writes nothing', async () => {
    const me = await users.user();
    auth.as(me);
    const res = await call('PATCH', PATH, { nickname: 'x'.repeat(PROFILE_NICKNAME_MAX + 1) });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(await nicknameOf(me.id)).toBeUndefined();
  });
});
