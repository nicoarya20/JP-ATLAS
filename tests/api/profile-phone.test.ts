/** PATCH /api/app/profile phone format: letters are refused with a clear sentence, real numbers and a blank clear pass. */
import { afterAll, afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { profile } from '../../server/db/schema';
import { isPhoneFormat, PHONE_FORMAT_ERROR } from '../../server/profile/profile.rules';
import { call, expectApiError } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createUserFactory } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const users = createUserFactory(cleaner, { tag: 'phone' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const PATH = '/app/profile';
const phoneOf = async (userId: string) =>
  (await db.select().from(profile).where(eq(profile.userId, userId)))[0]?.phone;

describe('isPhoneFormat', () => {
  test.each(['0812', '+62 812-3456-7890', '(021) 555.0100', ''])('accepts %p', (value) => {
    expect(isPhoneFormat(value)).toBe(true);
  });
  test.each(['abc', '0812x', '08<script>', '081 2; DROP', '０８１２'])('rejects %p', (value) => {
    expect(isPhoneFormat(value)).toBe(false);
  });
});

describe('PATCH /profile phone', () => {
  test.each(['abc', '0812 ext 5', '+62<1>'])(
    'rejects %p with 422, the Indonesian sentence, and writes nothing',
    async (phone) => {
      const me = await users.user();
      auth.as(me);
      const res = await call('PATCH', PATH, { phone });
      expectApiError(res, 422, 'VALIDATION');
      expect(res.body.error).toBe(PHONE_FORMAT_ERROR);
      expect(await phoneOf(me.id)).toBeUndefined();
    },
  );

  test('stores a formatted number trimmed, and a blank value clears it', async () => {
    const me = await users.user();
    auth.as(me);
    const saved = await call('PATCH', PATH, { phone: '  +62 812-3456-7890 ' }); // test-only
    expect<number>(saved.status).toBe(200);
    expect(saved.body.phone).toBe('+62 812-3456-7890');
    expect(await phoneOf(me.id)).toBe('+62 812-3456-7890');
    const cleared = await call('PATCH', PATH, { phone: '   ' });
    expect(cleared.body.phone).toBeNull();
    expect(await phoneOf(me.id)).toBeNull();
  });
});
