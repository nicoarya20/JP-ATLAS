/**
 * Runtime check of what a held (pending / rejected) account can do through Better Auth's own
 * endpoints (T-S1, N04/N05/N08, owner decision Q5). Real sessions, real gate (`api.handle`), test
 * DB; no auth spies. These tests DOCUMENT current behaviour; a "KNOWN GAP" name marks a hole that
 * is reported to the owner instead of being closed here (the status gate is their decision).
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import { approveUser, rejectUser } from '../../server/account/approval.service';
import { api } from '../../server/api';
import { db } from '../../server/db';
import { apikey, auditLog, user } from '../../server/db/schema';
import { superAdminEmails } from '../../server/env';
import { resolveActor } from '../../server/guard';
import { resolveUserRole } from '../../server/roles';
import { waitForAudit } from '../support/api';
import { createCleaner } from '../support/cleanup';
import { createUserFactory } from '../support/factory.user';

const BASE = 'http://localhost';
const TAG = `held-${crypto.randomUUID().slice(0, 8)}`;
const PASSWORD = `pw-${crypto.randomUUID()}`; // test-only
const createdEmails: string[] = [];
const allowlisted: string[] = [];
const cleaner = createCleaner();
const users = createUserFactory(cleaner, { tag: TAG });

type Held = 'pending' | 'rejected';
type Account = { id: string; email: string; cookie: string };

const json = (cookie: string, body: unknown, extra: Record<string, string> = {}) => ({
  method: 'POST',
  headers: { cookie, 'content-type': 'application/json', origin: BASE, ...extra },
  body: JSON.stringify(body),
});

const call = (path: string, init: RequestInit = {}) =>
  api.handle(new Request(`${BASE}${path}`, init));

function cookieOf(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';', 1)[0])
    .join('; ');
}

async function signUp(email: string): Promise<Response> {
  return call('/api/auth/sign-up/email', json('', { email, password: PASSWORD, name: 'Held' }));
}

/** A fresh email account held in `status`, signed in through the real endpoint. */
async function heldAccount(label: string, status: Held): Promise<Account> {
  const email = `${TAG}-${label}@example.test`;
  createdEmails.push(email);
  expect((await signUp(email)).status).toBe(200);
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (status === 'rejected') {
    await db
      .update(user)
      .set({
        approvalStatus: 'rejected',
        approvalReason: 'Bukan karyawan',
        approvalDecidedAt: new Date(),
      })
      .where(eq(user.id, row.id));
  }
  const signIn = await call('/api/auth/sign-in/email', json('', { email, password: PASSWORD }));
  expect(signIn.status).toBe(200);
  return { id: row.id, email, cookie: cookieOf(signIn) };
}

const rowOf = async (id: string) =>
  (await db.select().from(user).where(eq(user.id, id)).limit(1))[0];

afterAll(async () => {
  for (const email of allowlisted) (superAdminEmails as Set<string>).delete(email);
  if (createdEmails.length) await db.delete(user).where(inArray(user.email, createdEmails));
  await cleaner.flushAll();
});

describe.each(['pending', 'rejected'] as const)(
  'a %s account calling Better Auth directly',
  (status) => {
    test('the app gate holds it (control)', async () => {
      const acc = await heldAccount(`${status}-ctl`, status);
      const res = await call('/api/app/whoami', { headers: { cookie: acc.cookie } });
      expect(res.status).toBe(403);
      expect((await res.json()).code).toBe(
        status === 'pending' ? 'ACCOUNT_PENDING' : 'ACCOUNT_REJECTED',
      );
    });

    test('KNOWN GAP N04: /update-user changes its name, but never its approval fields or role', async () => {
      const acc = await heldAccount(`${status}-upd`, status);
      const res = await call(
        '/api/auth/update-user',
        json(acc.cookie, { name: 'Diganti Sendiri', approvalStatus: 'approved', role: 'admin' }),
      );
      const row = await rowOf(acc.id);
      // Better Auth refuses the whole body when it carries `input:false` fields.
      expect(res.status).toBe(400);
      expect(row.approvalStatus).toBe(status);
      expect(row.role).toBe('member');

      const nameOnly = await call(
        '/api/auth/update-user',
        json(acc.cookie, { name: 'Diganti Sendiri' }),
      );
      expect(nameOnly.status).toBe(200);
      expect((await rowOf(acc.id)).name).toBe('Diganti Sendiri');
      expect((await rowOf(acc.id)).approvalStatus).toBe(status);
    });

    test('KNOWN GAP N04: /api-key/create mints a key, but the key is held at /api/app and carries no scope', async () => {
      const acc = await heldAccount(`${status}-key`, status);
      const res = await call(
        '/api/auth/api-key/create',
        json(acc.cookie, { name: 'kunci-sendiri' }),
      );
      expect(res.status).toBe(200);
      const created = (await res.json()) as { key: string; id: string; permissions: unknown };
      expect(created.key).toBeString();
      expect(created.permissions ?? null).toBeNull();

      const list = await call('/api/auth/api-key/list', { headers: { cookie: acc.cookie } });
      expect(list.status).toBe(200);

      // Using the key while held: the app gate answers like the cookie path.
      const held = await call('/api/app/whoami', { headers: { 'x-api-key': created.key } });
      expect(held.status).toBe(403);

      // Client-created keys may not choose their own permissions (server-only property).
      const scoped = await call(
        '/api/auth/api-key/create',
        json(acc.cookie, { name: 'kunci-scope', permissions: { app: ['read', 'write'] } }),
      );
      expect(scoped.status).toBe(400);

      // Even once approved, the unscoped key is refused by the scope check.
      await db.update(user).set({ approvalStatus: 'approved' }).where(eq(user.id, acc.id));
      const approved = await call('/api/app/whoami', { headers: { 'x-api-key': created.key } });
      expect(approved.status).toBe(403);
      await db.delete(apikey).where(eq(apikey.referenceId, acc.id));
    });

    test('KNOWN GAP N04/N05: /delete-user lets it delete itself (fresh session, no password)', async () => {
      const acc = await heldAccount(`${status}-del`, status);
      const res = await call('/api/auth/delete-user', json(acc.cookie, {}));
      expect(res.status).toBe(200);
      expect(await rowOf(acc.id)).toBeUndefined();
    });
  },
);

describe('N05: a rejected account deletes itself, then signs up again', () => {
  test('KNOWN GAP N05: the new account is pending with no trace of the rejection on it', async () => {
    const email = `${TAG}-again@example.test`;
    createdEmails.push(email);
    expect((await signUp(email)).status).toBe(200);
    const [first] = await db.select().from(user).where(eq(user.email, email));
    const admin = await users.user({ role: 'admin' });
    const actor = { id: admin.id, appRole: 'admin' as const, impersonating: false };
    const rejected = await rejectUser({ actor, targetId: first.id, reason: 'Bukan karyawan' });
    expect(rejected.ok).toBe(true);
    const audits = await waitForAudit(
      eq(auditLog.targetId, first.id),
      eq(auditLog.action, 'user.reject'),
    );
    for (const a of audits) cleaner.track('audit', a.id);
    expect(audits).toHaveLength(1);

    const signIn = await call('/api/auth/sign-in/email', json('', { email, password: PASSWORD }));
    expect(signIn.status).toBe(200);
    expect((await call('/api/auth/delete-user', json(cookieOf(signIn), {}))).status).toBe(200);

    expect((await signUp(email)).status).toBe(200);
    const [again] = await db.select().from(user).where(eq(user.email, email));
    expect(again.id).not.toBe(first.id);
    expect(again.approvalStatus).toBe('pending');
    expect(again.approvalReason).toBeNull();
    expect(again.approvalDecidedBy).toBeNull();
    // Only the audit log still remembers the rejection, under the deleted account's id.
    const kept = await db
      .select({ id: auditLog.id })
      .from(auditLog)
      .where(and(eq(auditLog.targetId, first.id), eq(auditLog.action, 'user.reject')));
    expect(kept).toHaveLength(1);
  });
});

describe('N08: a pending account whose email is later added to SUPER_ADMIN_EMAILS', () => {
  test('KNOWN GAP N08: resolveUserRole (the / loader) promotes the role while status stays pending', async () => {
    const acc = await heldAccount('n08', 'pending');
    (superAdminEmails as Set<string>).add(acc.email);
    allowlisted.push(acc.email);

    // The guard still holds it: no actor, so nothing role-gated is reachable.
    const req = new Request(`${BASE}/app`, { headers: { cookie: acc.cookie } });
    expect(await resolveActor(req)).toBeNull();

    // `/` (app/routes/home.tsx) calls resolveUserRole on the session user without a status check.
    const session = await rowOf(acc.id);
    expect(await resolveUserRole(session)).toBe('super-admin');
    const after = await rowOf(acc.id);
    expect(after.role).toBe('super-admin');
    expect(after.approvalStatus).toBe('pending');

    // Dead end in the app: no Admin or Super-admin may approve a super-admin target.
    const superAdmin = {
      id: crypto.randomUUID(),
      appRole: 'super-admin' as const,
      impersonating: false,
    };
    const admin = { ...superAdmin, appRole: 'admin' as const };
    expect(await approveUser({ actor: superAdmin, targetId: acc.id })).toEqual({
      ok: false,
      code: 'TARGET_PROTECTED',
    });
    expect(await approveUser({ actor: admin, targetId: acc.id })).toEqual({
      ok: false,
      code: 'TARGET_PROTECTED',
    });
  });
});
