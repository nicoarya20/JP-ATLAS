/** PATCH /api/app/profile note: the status note beside the photo — stored trimmed, returned by GET, blank clears it, too long is refused. */
import { afterAll, afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { profile } from '../../server/db/schema';
import { PROFILE_NOTE_MAX } from '../../server/profile/profile.rules';
import { call } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createUserFactory } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const users = createUserFactory(cleaner, { tag: 'note' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const PATH = '/app/profile';
const noteOf = async (userId: string) =>
  (await db.select().from(profile).where(eq(profile.userId, userId)))[0]?.note;

describe('PATCH /profile note', () => {
  test('a new account has no note', async () => {
    auth.as(await users.user());
    const res = await call('GET', PATH);
    expect<number>(res.status).toBe(200);
    expect(res.body.note).toBeNull();
  });

  test('stores it trimmed, GET returns it, other fields stay, and a blank value clears it', async () => {
    const me = await users.user();
    auth.as(me);
    await call('PATCH', PATH, { jobTitle: 'Designer' }); // test-only
    const saved = await call('PATCH', PATH, { note: '  Back from leave ' }); // test-only
    expect<number>(saved.status).toBe(200);
    expect(saved.body.note).toBe('Back from leave');
    expect(saved.body.jobTitle).toBe('Designer');
    expect(await noteOf(me.id)).toBe('Back from leave');
    expect((await call('GET', PATH)).body.note).toBe('Back from leave');

    const cleared = await call('PATCH', PATH, { note: '   ' });
    expect(cleared.body.note).toBeNull();
    expect(await noteOf(me.id)).toBeNull();
  });

  test('takes exactly the limit, refuses one more and writes nothing', async () => {
    const me = await users.user();
    auth.as(me);
    const over = await call('PATCH', PATH, { note: 'x'.repeat(PROFILE_NOTE_MAX + 1) });
    expect(over.status).toBeGreaterThanOrEqual(400);
    expect(over.status).toBeLessThan(500);
    expect(await noteOf(me.id)).toBeUndefined();

    const max = await call('PATCH', PATH, { note: 'x'.repeat(PROFILE_NOTE_MAX) });
    expect<number>(max.status).toBe(200);
    expect(await noteOf(me.id)).toBe('x'.repeat(PROFILE_NOTE_MAX));
  });
});
