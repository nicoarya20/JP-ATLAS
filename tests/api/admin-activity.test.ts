/**
 * `GET /api/admin/activity` (P11 AD-18): the Admin reading of the audit trail. Asserts the contract
 * that makes it different from `/api/audit` — only whitelisted actions are returned, the actor email
 * is masked, and the list paginates — plus the role guard and the empty state. (The 401/403 sweep
 * over every admin route lives in `admin-gate.test.ts`; here we only confirm the happy path and a
 * rejected member.)
 *
 * The audit_log table is shared across suites, so every query here carries `search=<admin.id>`: the
 * seeded rows all have this admin as actor (its unique id is inside the actor email and name), so the
 * search scopes each assertion to exactly the rows this test wrote, never another suite's leftovers.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { AUDIT_ACTIONS } from '../../server/audit';
import { db } from '../../server/db';
import { auditLog } from '../../server/db/schema';
import { call, expectApiError, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'adact' });

let admin: Awaited<ReturnType<typeof f.user>>;

/** Scopes a query to only this test's rows via the admin's unique id (present in its email + name). */
function mineUrl(extra = ''): string {
  return `/admin/activity?search=${encodeURIComponent(admin.id)}${extra}`;
}

/** Inserts one tracked audit row `minutesAgo` before `base`, so desc order is deterministic. */
async function seedEntry(
  action: string,
  targetType: string,
  summary: string,
  minutesAgo: number,
  base: number,
): Promise<void> {
  const id = `${f.tag}-${crypto.randomUUID().slice(0, 8)}`;
  cleaner.track('audit', id);
  await db.insert(auditLog).values({
    id,
    actorId: admin.id,
    actorEmail: admin.email,
    action,
    targetType,
    summary,
    createdAt: new Date(base - minutesAgo * 60_000),
  });
}

beforeEach(async () => {
  resetApiLimiters();
  admin = await f.user({ role: 'admin' });
  auth.as(admin);
});
afterEach(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorId, admin.id));
  await cleaner.flushTest();
});
afterAll(() => cleaner.flushAll());

describe('role guard', () => {
  it('rejects a member with 403 NOT_ADMIN', async () => {
    const member = await f.user({ role: 'member' });
    auth.as(member);
    const res = await call('GET', '/admin/activity');
    expectApiError(res, 403, 'NOT_ADMIN');
  });

  it('lets an admin read the activity', async () => {
    const res = await call('GET', '/admin/activity');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.rows)).toBe(true);
  });
});

describe('the reading', () => {
  const actionsOf = (res: { body: unknown }) =>
    (res.body as { rows: Array<{ action: string }> }).rows.map((r) => r.action);

  it('returns only whitelisted actions, never the technical ones', async () => {
    const base = Date.now();
    await seedEntry(AUDIT_ACTIONS.USER_APPROVE, 'user', 'Akun disetujui', 1, base);
    await seedEntry(AUDIT_ACTIONS.PROJECT_TRASH, 'project', 'Proyek dihapus', 2, base);
    // Server/technical actions: they must never surface in the Admin reading.
    await seedEntry(AUDIT_ACTIONS.LOGS_PURGE, 'logs', 'Purge log', 3, base);
    await seedEntry(AUDIT_ACTIONS.APIKEY_CREATE, 'apikey', 'Buat API key', 4, base);
    await seedEntry(AUDIT_ACTIONS.USER_IMPERSONATE, 'user', 'Impersonasi', 5, base);

    const res = await call('GET', mineUrl());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(actionsOf(res).sort()).toEqual(
      [AUDIT_ACTIONS.PROJECT_TRASH, AUDIT_ACTIONS.USER_APPROVE].sort(),
    );
  });

  it('masks the actor email and never sends the raw address or technical ids', async () => {
    const base = Date.now();
    await seedEntry(AUDIT_ACTIONS.USER_ROLE_SET, 'user', 'Role diubah', 1, base);
    const res = await call('GET', mineUrl());
    const row = res.body.rows[0];
    expect(row.actorEmail).toContain('••••');
    expect(row.actorEmail).not.toBe(admin.email);
    // The raw columns an admin should never receive are absent from the shape.
    expect(row).not.toHaveProperty('ip');
    expect(row).not.toHaveProperty('userAgent');
    expect(row).not.toHaveProperty('meta');
    expect(row).not.toHaveProperty('targetId');
    expect(row).not.toHaveProperty('actorId');
  });

  it('narrows to one category without reaching outside the whitelist', async () => {
    const base = Date.now();
    await seedEntry(AUDIT_ACTIONS.USER_APPROVE, 'user', 'Akun disetujui', 1, base);
    await seedEntry(AUDIT_ACTIONS.PROJECT_TRASH, 'project', 'Proyek dihapus', 2, base);
    const res = await call('GET', mineUrl('&category=proyek'));
    expect(res.status).toBe(200);
    expect(actionsOf(res)).toEqual([AUDIT_ACTIONS.PROJECT_TRASH]);
  });

  it('ignores an action parameter that is outside the whitelist (no bypass)', async () => {
    const base = Date.now();
    await seedEntry(AUDIT_ACTIONS.USER_IMPERSONATE, 'user', 'Impersonasi', 1, base);
    await seedEntry(AUDIT_ACTIONS.USER_APPROVE, 'user', 'Akun disetujui', 2, base);
    const res = await call('GET', mineUrl(`&action=${AUDIT_ACTIONS.USER_IMPERSONATE}`));
    expect(res.status).toBe(200);
    // The non-whitelisted filter is dropped; the base whitelist still hides the impersonation.
    expect(actionsOf(res)).toEqual([AUDIT_ACTIONS.USER_APPROVE]);
  });

  it('paginates with newest first across pages', async () => {
    const base = Date.now();
    for (let i = 0; i < 3; i++) {
      await seedEntry(AUDIT_ACTIONS.USER_APPROVE, 'user', `Akun ${i} disetujui`, i + 1, base);
    }
    const page1 = await call('GET', mineUrl('&limit=2&page=1'));
    expect(page1.body.total).toBe(3);
    expect(page1.body.rows.length).toBe(2);
    const page2 = await call('GET', mineUrl('&limit=2&page=2'));
    expect(page2.body.rows.length).toBe(1);
    // Oldest of the three lands on the last page.
    expect(page2.body.rows[0].summary).toBe('Akun 2 disetujui');
  });

  it('returns an empty list, not an error, when nothing matches', async () => {
    const res = await call('GET', mineUrl('&category=data'));
    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});
