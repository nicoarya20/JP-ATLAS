/**
 * Happy path of `POST /api/app/profile/password`, end to end with a real session cookie: a
 * Google-born account gives itself an email+password login, can then sign in with it, and its other
 * devices are signed out. Better Auth's `setPassword` and `revokeOtherSessions` read the session
 * from the cookie themselves, so this file uses real sign-up/sign-in instead of the auth spies
 * (`profile-password.guards.test.ts` covers the refusals, which never reach Better Auth).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { api } from '../../server/api';
import { db } from '../../server/db';
import { account, auditLog, user } from '../../server/db/schema';
import * as settingsMod from '../../server/settings';
import { resetApiLimiters, waitForAudit } from '../support/api';

const EMAIL = `setpwd-${crypto.randomUUID()}@test.local`; // test-only
const SIGNUP_PASSWORD = 'SignupPass123!'; // test-only
const NEW_PASSWORD = 'sandi-pertama-dari-google-2026'; // test-only
const PATH = 'http://localhost/api/app/profile/password';

// Email sign-in is off in `AUTH_DEFAULTS`, and the route refuses while it is. Spying leaves the
// stored settings row alone, so no other file in the run sees a flipped switch.
const realGetSettings = settingsMod.getSettings;
const settingsSpy = spyOn(settingsMod, 'getSettings').mockImplementation(async () => ({
  ...(await realGetSettings()),
  emailAuthEnabled: true,
}));

let userId = '';
/** Cookie of the device that sets the password, and of a second device that must be signed out. */
let cookieA = '';
let cookieB = '';

const cookieHeader = (res: Response) =>
  (res.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .filter(Boolean)
    .join('; ');

const post = (path: string, body: unknown, cookie?: string) =>
  api.handle(
    new Request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }),
  );

const signIn = (password: string) =>
  post('http://localhost/api/auth/sign-in/email', { email: EMAIL, password });

/**
 * Builds the shape a Google sign-in leaves behind: a `user` with a `google` account row and no
 * `credential` row. Better Auth has no server-side way to fake a Google callback, so the account is
 * signed up with email+password (which yields two real sessions) and the credential row is then
 * swapped for a Google one — leaving exactly the rows the route cares about.
 */
beforeAll(async () => {
  const signUp = await post('http://localhost/api/auth/sign-up/email', {
    email: EMAIL,
    password: SIGNUP_PASSWORD,
    name: 'Pengguna Google', // test-only
  });
  expect(signUp.status).toBe(200);
  cookieA = cookieHeader(signUp);
  const second = await signIn(SIGNUP_PASSWORD);
  expect(second.status).toBe(200);
  cookieB = cookieHeader(second);
  expect(cookieA).not.toBe(cookieB);

  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, EMAIL));
  userId = row.id;
  // `/api/app/*` is closed to a held account, and sign-up leaves every new account pending.
  await db.update(user).set({ approvalStatus: 'approved' }).where(eq(user.id, userId));
  await db
    .delete(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
  const now = new Date();
  await db.insert(account).values({
    id: `google-${userId}`,
    accountId: `google-sub-${userId}`, // test-only
    providerId: 'google',
    userId,
    createdAt: now,
    updatedAt: now,
  });
});

beforeEach(() => resetApiLimiters());

afterAll(async () => {
  settingsSpy.mockRestore();
  await db.delete(auditLog).where(eq(auditLog.actorId, userId));
  await db
    .delete(user)
    .where(eq(user.id, userId))
    .catch(() => {});
});

describe('POST /api/app/profile/password (first password for a Google account)', () => {
  test('creates the credential, signs the other device out, and never echoes the password', async () => {
    // Nothing to sign in with yet: the account has only ever used Google.
    expect((await signIn(NEW_PASSWORD)).status).toBeGreaterThanOrEqual(400);

    const res = await post(PATH, { newPassword: NEW_PASSWORD }, cookieA);
    const body = (await res.json()) as { ok: boolean; otherSessionsRevoked: boolean };
    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, otherSessionsRevoked: true });
    expect(JSON.stringify(body)).not.toContain(NEW_PASSWORD);

    // A credential account now exists, and it holds a hash rather than the password itself.
    const [cred] = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
    expect(cred).toBeDefined();
    expect(cred.password).toBeTruthy();
    expect(cred.password).not.toContain(NEW_PASSWORD);
    // Google still works: this adds a way in, it does not replace one.
    const providers = await db
      .select({ providerId: account.providerId })
      .from(account)
      .where(eq(account.userId, userId));
    expect(providers.map((p) => p.providerId).sort()).toEqual(['credential', 'google']);
  });

  test('the new password really signs in (this is what the mobile app needs)', async () => {
    const res = await signIn(NEW_PASSWORD);
    expect(res.status).toBe(200);
    expect(cookieHeader(res)).toContain('session');
  });

  test('the other device was signed out, while this one stays signed in', async () => {
    const other = await api.handle(
      new Request('http://localhost/api/me', { headers: { cookie: cookieB } }),
    );
    expect(((await other.json()) as { user: unknown }).user).toBeNull();
    const mine = await api.handle(
      new Request('http://localhost/api/me', { headers: { cookie: cookieA } }),
    );
    expect(((await mine.json()) as { user: { id: string } | null }).user?.id).toBe(userId);
  });

  test('the audit entry records who and when, never the password nor its length', async () => {
    // The audit write is fire-and-forget, so poll for it rather than reading once.
    const rows = await waitForAudit(
      eq(auditLog.actorId, userId),
      eq(auditLog.action, 'user.password.set'),
    );
    expect(rows.length).toBe(1);
    const [row] = rows;
    expect(row.targetType).toBe('user');
    expect(row.targetId).toBe(userId);
    expect(row.meta).toEqual({ otherSessionsRevoked: true });
    expect(JSON.stringify(row)).not.toContain(NEW_PASSWORD);
    // Not even the length: on its own it narrows a brute force. Checked on the fields the route
    // writes rather than the whole row, because a timestamp can hold any two digits by chance.
    expect(JSON.stringify({ summary: row.summary, meta: row.meta })).not.toContain(
      String(NEW_PASSWORD.length),
    );
  });

  test('a second attempt is refused: from here on only Ganti password may change it', async () => {
    const res = await post(PATH, { newPassword: 'sandi-kedua-yang-lain-2026' }, cookieA); // test-only
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('PASSWORD_ALREADY_SET');
  });
});
