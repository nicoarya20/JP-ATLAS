/**
 * P1 §7 #4: `session.session.impersonatedBy` is available from `auth.api.getSession`
 * for a REAL impersonation session (no getSession stub), and resolveActor surfaces it.
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { api } from '../../server/api';
import { auth } from '../../server/auth';
import { db } from '../../server/db';
import { user } from '../../server/db/schema';
import { resolveActor } from '../../server/guard';
import { testUser } from '../support/accounts';

const TAG = `imp-${crypto.randomUUID().slice(0, 8)}`;
const ADMIN_EMAIL = `${TAG}-admin@example.test`; // test-only
const PASSWORD = 'TestPass123!'; // test-only
const targetRow = testUser({ id: `${TAG}-target` });
let adminId = '';

afterAll(async () => {
  await db.delete(user).where(inArray(user.id, [targetRow.id, adminId].filter(Boolean)));
});

/** Cookie header from Set-Cookie lines; the last value per name wins (impersonation clears then re-sets the session cookie). */
const cookieOf = (res: Response) => {
  const jar = new Map<string, string>();
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const pair = line.split(';')[0];
    const sep = pair.indexOf('=');
    if (sep > 0) jar.set(pair.slice(0, sep), pair.slice(sep + 1));
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
};

/**
 * Real sign-up (email auth is open outside production), then promote + approve the row directly.
 * Only super-admin holds `user:impersonate`. The row is promoted in the DB and never passed through
 * resolveActor, which would demote it (SUPER_ADMIN_EMAILS is the source of truth for that role).
 */
async function signedInAdminCookie(): Promise<string> {
  const res = await api.handle(
    new Request('http://localhost/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD, name: 'Impersonator' }),
    }),
  );
  expect(res.status).toBe(200);
  const [row] = await db
    .update(user)
    .set({ role: 'super-admin', approvalStatus: 'approved', emailVerified: true })
    .where(eq(user.email, ADMIN_EMAIL))
    .returning({ id: user.id });
  adminId = row.id;
  return cookieOf(res);
}

describe('real impersonation session', () => {
  test('getSession exposes impersonatedBy and resolveActor fills Actor.impersonatedBy', async () => {
    const adminCookie = await signedInAdminCookie();
    await db.insert(user).values(targetRow);

    // Baseline: the admin's own session is not an impersonation.
    const own = await auth.api.getSession({ headers: new Headers({ cookie: adminCookie }) });
    expect(own?.user.id).toBe(adminId);
    expect(own?.session.impersonatedBy ?? null).toBeNull();

    const imp = await auth.api.impersonateUser({
      body: { userId: targetRow.id },
      headers: new Headers({ cookie: adminCookie }),
      asResponse: true,
    });
    expect(imp.status).toBe(200);
    const impCookie = cookieOf(imp);

    const session = await auth.api.getSession({ headers: new Headers({ cookie: impCookie }) });
    expect(session?.user.id).toBe(targetRow.id);
    expect(session?.session.impersonatedBy).toBe(adminId);

    const actor = await resolveActor(
      new Request('http://localhost/x', { headers: { cookie: impCookie } }),
    );
    expect(actor?.user.id).toBe(targetRow.id);
    expect(actor?.impersonatedBy).toBe(adminId);
  });
});
