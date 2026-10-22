/**
 * Deleting your own account through Better Auth `/delete-user` (Q4/N03 + P9 A7): only a Super-admin,
 * never while the sole manager of an active project, and a refusal deletes nothing.
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { api } from '../../server/api';
import { db } from '../../server/db';
import { project, projectMember, user } from '../../server/db/schema';
import { superAdminEmails } from '../../server/env';
import { createCleaner } from '../support/cleanup';

const BASE = 'http://localhost';
const TAG = `selfdel-${crypto.randomUUID().slice(0, 8)}`;
const PASSWORD = `pw-${crypto.randomUUID()}`; // test-only
const cleaner = createCleaner();
const emails: string[] = [];
const projectIds: string[] = [];

const json = (cookie: string, body: unknown) => ({
  method: 'POST',
  headers: { cookie, 'content-type': 'application/json', origin: BASE },
  body: JSON.stringify(body),
});
const call = (path: string, init: RequestInit = {}) =>
  api.handle(new Request(`${BASE}${path}`, init));
const cookieOf = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(';', 1)[0])
    .join('; ');

/** A real email account, signed in; `superAdmin` puts its email on the allowlist like SUPER_ADMIN_EMAILS does. */
async function account(label: string, superAdmin: boolean) {
  const email = `${TAG}-${label}@example.test`;
  emails.push(email);
  const up = await call(
    '/api/auth/sign-up/email',
    json('', { email, password: PASSWORD, name: label }),
  );
  expect(up.status).toBe(200);
  const [row] = await db.select().from(user).where(eq(user.email, email));
  if (superAdmin) (superAdminEmails as Set<string>).add(email);
  const signIn = await call('/api/auth/sign-in/email', json('', { email, password: PASSWORD }));
  expect(signIn.status).toBe(200);
  return { id: row.id, email, cookie: cookieOf(signIn) };
}

async function ownProject(leadId: string, name: string, extraManager?: string) {
  const id = `${TAG}-${crypto.randomUUID().slice(0, 8)}`;
  projectIds.push(id);
  await db
    .insert(project)
    .values({ id, name, status: 'active', priority: 'medium', leadId, createdBy: leadId });
  const managers = [leadId, ...(extraManager ? [extraManager] : [])];
  await db.insert(projectMember).values(
    managers.map((userId) => ({
      projectId: id,
      userId,
      role: 'manager' as const,
      addedBy: leadId,
    })),
  );
  return id;
}

const exists = async (id: string) =>
  (await db.select({ id: user.id }).from(user).where(eq(user.id, id))).length === 1;

afterAll(async () => {
  for (const email of emails) (superAdminEmails as Set<string>).delete(email);
  if (projectIds.length) await db.delete(project).where(inArray(project.id, projectIds));
  if (emails.length) await db.delete(user).where(inArray(user.email, emails));
  await cleaner.flushAll();
});

describe('POST /api/auth/delete-user', () => {
  test('a member is refused with 403 DELETE_ACCOUNT_FORBIDDEN and keeps the account', async () => {
    const me = await account('member', false);
    const res = await call('/api/auth/delete-user', json(me.cookie, {}));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'DELETE_ACCOUNT_FORBIDDEN' });
    expect(await exists(me.id)).toBe(true);
  });

  test('a Super-admin who manages nothing alone deletes the account', async () => {
    const me = await account('boss-clean', true);
    const res = await call('/api/auth/delete-user', json(me.cookie, {}));
    expect(res.status).toBe(200);
    expect(await exists(me.id)).toBe(false);
  });

  test('a Super-admin who is the only manager of an active project gets 409 SOLE_MANAGER naming it', async () => {
    const me = await account('boss-sole', true);
    await ownProject(me.id, 'Pameran Oktober');
    const res = await call('/api/auth/delete-user', json(me.cookie, {}));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('SOLE_MANAGER');
    expect(body.message).toContain('Pameran Oktober');
    expect(await exists(me.id)).toBe(true);
  });

  test('once another manager is named the same Super-admin can delete, and the project stays', async () => {
    const me = await account('boss-handover', true);
    const heir = await account('heir', false);
    const proj = await ownProject(me.id, 'Serah Terima', heir.id);
    const res = await call('/api/auth/delete-user', json(me.cookie, {}));
    expect(res.status).toBe(200);
    expect(await exists(me.id)).toBe(false);
    const [kept] = await db.select().from(project).where(eq(project.id, proj));
    expect(kept?.leadId).toBeNull();
  });
});
