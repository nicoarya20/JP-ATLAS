/**
 * Guards on `POST /api/app/profile/password` — the route that mints the first email+password login
 * for a Google-born account. Each guard gets its own test because any one of them failing open
 * hands someone a permanent way into an account. The happy path lives in `profile-password.test.ts`,
 * which needs a real session cookie.
 */
import { afterAll, afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { api } from '../../server/api';
import { setApiKeyIdentity } from '../../server/api-keys/identity';
import { db } from '../../server/db';
import { account, auditLog } from '../../server/db/schema';
import * as settingsMod from '../../server/settings';
import { call, expectApiError, type Json, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'setpwd-g' });

const PATH = '/app/profile/password';
const GOOD_PASSWORD = 'rahasia-panjang-2026'; // test-only
const SHORT_PASSWORD = 'pendek1'; // test-only, 7 characters

// The runtime switch is off by default (`AUTH_DEFAULTS`), so the route would refuse every test for
// the wrong reason. Spying keeps the stored row untouched for the other files in the run.
const realGetSettings = settingsMod.getSettings;
let emailAuthEnabled = true;
const settingsSpy = spyOn(settingsMod, 'getSettings').mockImplementation(async () => ({
  ...(await realGetSettings()),
  emailAuthEnabled,
}));

beforeEach(() => {
  emailAuthEnabled = true;
  resetApiLimiters();
});
afterEach(() => cleaner.flushTest());
afterAll(async () => {
  settingsSpy.mockRestore();
  await cleaner.flushAll();
});

/** Sends the POST as an API key identity, the way the key plugin injects one (no session cookie). */
async function callAsKey(owner: TestUser, scopes: string[]): Promise<Json> {
  const request = new Request(`http://localhost/api${PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ newPassword: GOOD_PASSWORD }),
  });
  setApiKeyIdentity(request, {
    keyId: 'setpwd-key',
    keyName: null,
    scopes,
    user: { id: owner.id, email: owner.email, name: owner.name },
    role: owner.role,
    startedAt: Date.now(),
  });
  const res = await api.handle(request);
  return { status: res.status, body: await res.json() };
}

/** The `credential` row Better Auth writes for an email+password login. */
async function giveCredential(userId: string): Promise<void> {
  const now = new Date();
  await db.insert(account).values({
    id: `cred-${userId}`,
    accountId: userId,
    providerId: 'credential',
    userId,
    password: 'already-hashed-by-better-auth', // test-only
    createdAt: now,
    updatedAt: now,
  });
}

describe('POST /app/profile/password guards', () => {
  test('anonymous → 401, before the body is even looked at', async () => {
    auth.as(null);
    expectApiError(await call('POST', PATH, { newPassword: GOOD_PASSWORD }), 401, 'UNAUTHORIZED');
  });

  test('an API key is refused whatever its scopes, so a leaked key cannot mint a login', async () => {
    const me = await f.user();
    auth.as(null);
    for (const scopes of [['app:write'], ['app:read', 'app:write'], []]) {
      const res = await callAsKey(me, scopes);
      expect<number>(res.status).toBe(403);
      expect(res.body.code).toBe('SESSION_ONLY');
    }
  });

  test('while impersonating → 403 IMPERSONATING (a penyamar must leave no password behind)', async () => {
    const me = await f.user();
    auth.as(me, { impersonatedBy: 'super-admin-id' });
    expectApiError(await call('POST', PATH, { newPassword: GOOD_PASSWORD }), 403, 'IMPERSONATING');
  });

  test('impersonation is refused before the password is even read, and nothing is audited', async () => {
    const me = await f.user();
    auth.as(me, { impersonatedBy: 'super-admin-id' });
    const res = await call('POST', PATH, { newPassword: SHORT_PASSWORD });
    // Not VALIDATION: identity is decided first, so a penyamar never gets input feedback either.
    expect(res.body.code).toBe('IMPERSONATING');
    await Bun.sleep(20);
    const rows = await db.select().from(auditLog).where(eq(auditLog.actorId, me.id));
    expect(rows).toEqual([]);
  });

  test('with email sign-in switched off → 409 EMAIL_AUTH_DISABLED and no credential row', async () => {
    const me = await f.user();
    emailAuthEnabled = false;
    auth.as(me);
    const res = await call('POST', PATH, { newPassword: GOOD_PASSWORD });
    expectApiError(res, 409, 'EMAIL_AUTH_DISABLED');
    // The message explains the real state instead of pointing at a capability nobody has.
    expect(res.body.error).toContain('dimatikan');
    expect(res.body.error).not.toContain('hubungi admin');
    const rows = await db.select().from(account).where(eq(account.userId, me.id));
    expect(rows).toEqual([]);
  });

  test('a password shorter than the minimum → 422, and the answer never quotes it', async () => {
    const me = await f.user();
    auth.as(me);
    const res = await call('POST', PATH, { newPassword: SHORT_PASSWORD });
    expectApiError(res, 422, 'VALIDATION');
    expect(res.body.error).toContain('minimal 8 karakter');
    expect(JSON.stringify(res.body)).not.toContain(SHORT_PASSWORD);
  });

  test('a password longer than the maximum → 422, and the answer never quotes it', async () => {
    const me = await f.user();
    auth.as(me);
    const tooLong = 'x'.repeat(129); // test-only
    const res = await call('POST', PATH, { newPassword: tooLong });
    expectApiError(res, 422, 'VALIDATION');
    expect(JSON.stringify(res.body)).not.toContain(tooLong);
  });

  test('a non-string password → 422 without the value appearing in the 422 issues', async () => {
    const me = await f.user();
    auth.as(me);
    const res = await call('POST', PATH, { newPassword: 12345678 });
    expectApiError(res, 422, 'VALIDATION');
    expect(JSON.stringify(res.body)).not.toContain('12345678');
  });

  test('an account that already has a password → 409, so this is never a way around the old one', async () => {
    const me = await f.user();
    await giveCredential(me.id);
    auth.as(me);
    const res = await call('POST', PATH, { newPassword: GOOD_PASSWORD });
    expectApiError(res, 409, 'PASSWORD_ALREADY_SET');
    expect(res.body.error).toContain('Ganti password');
    // The stored hash is untouched: the route refused, it did not overwrite.
    const [row] = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, me.id), eq(account.providerId, 'credential')));
    expect(row.password).toBe('already-hashed-by-better-auth');
  });
});
