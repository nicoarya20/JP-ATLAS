/**
 * Tests for resolveUserRole (server/roles.ts) — the request-path reconciler that
 * aligns a user's stored role with SUPER_ADMIN_EMAILS and persists only when the
 * role actually changes. Uses real DB rows with random emails that are never in
 * the env allowlist, so the "demote stale super-admin" and "keep role" branches
 * are deterministic regardless of the ambient SUPER_ADMIN_EMAILS value.
 */
import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../server/db';
import { user } from '../server/db/schema';
import { superAdminEmails } from '../server/env';
import { ROLES } from '../server/permissions';
import { resolveUserRole } from '../server/roles';
import { testUser } from './support/accounts';

const created: string[] = [];
const allowlisted: string[] = [];

/** Adds an email to the live SUPER_ADMIN_EMAILS set for one test; removed in afterEach. */
function allowlist(email: string): void {
  (superAdminEmails as Set<string>).add(email);
  allowlisted.push(email);
}

async function seedUser(role: string): Promise<{ id: string; email: string }> {
  const id = `roles-${crypto.randomUUID()}`;
  const email = `${id}@test.local`;
  await db.insert(user).values(
    testUser({
      id,
      name: id,
      email,
      emailVerified: false,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
  created.push(id);
  return { id, email };
}

async function storedRole(id: string): Promise<string | null> {
  const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, id)).limit(1);
  return row?.role ?? null;
}

afterEach(async () => {
  for (const email of allowlisted.splice(0)) (superAdminEmails as Set<string>).delete(email);
  for (const id of created.splice(0))
    await db
      .delete(user)
      .where(eq(user.id, id))
      .catch(() => {});
});

describe('resolveUserRole', () => {
  test('demotes a stale super-admin (email not in allowlist) and persists the change', async () => {
    const u = await seedUser(ROLES.SUPER_ADMIN);
    const resolved = await resolveUserRole({
      id: u.id,
      email: u.email,
      role: ROLES.SUPER_ADMIN,
      emailVerified: true,
    });
    expect(resolved).toBe(ROLES.MEMBER);
    expect(await storedRole(u.id)).toBe(ROLES.MEMBER);
  });

  test('keeps an admin role unchanged and does not rewrite it', async () => {
    const u = await seedUser(ROLES.ADMIN);
    const resolved = await resolveUserRole({
      id: u.id,
      email: u.email,
      role: ROLES.ADMIN,
      emailVerified: true,
    });
    expect(resolved).toBe(ROLES.ADMIN);
    expect(await storedRole(u.id)).toBe(ROLES.ADMIN);
  });

  test('normalizes an unknown stored role to member', async () => {
    const u = await seedUser('user');
    const resolved = await resolveUserRole({
      id: u.id,
      email: u.email,
      role: 'legacy-editor',
      emailVerified: true,
    });
    expect(resolved).toBe(ROLES.MEMBER);
  });

  test('keeps a stored project_manager and does not rewrite it', async () => {
    const u = await seedUser(ROLES.PROJECT_MANAGER);
    const resolved = await resolveUserRole({
      id: u.id,
      email: u.email,
      role: ROLES.PROJECT_MANAGER,
      emailVerified: true,
    });
    expect(resolved).toBe(ROLES.PROJECT_MANAGER);
    expect(await storedRole(u.id)).toBe(ROLES.PROJECT_MANAGER);
  });

  test('promotes an allowlisted email to super-admin only when it is verified', async () => {
    const u = await seedUser(ROLES.MEMBER);
    allowlist(u.email);

    const unverified = await resolveUserRole({
      id: u.id,
      email: u.email,
      role: ROLES.MEMBER,
      emailVerified: false,
    });
    expect(unverified).toBe(ROLES.MEMBER);
    expect(await storedRole(u.id)).toBe(ROLES.MEMBER);

    const verified = await resolveUserRole({
      id: u.id,
      email: u.email,
      role: ROLES.MEMBER,
      emailVerified: true,
    });
    expect(verified).toBe(ROLES.SUPER_ADMIN);
    expect(await storedRole(u.id)).toBe(ROLES.SUPER_ADMIN);
  });

  test('demotes a stored super-admin whose email is no longer verified', async () => {
    const u = await seedUser(ROLES.SUPER_ADMIN);
    allowlist(u.email);
    const resolved = await resolveUserRole({
      id: u.id,
      email: u.email,
      role: ROLES.SUPER_ADMIN,
      emailVerified: false,
    });
    expect(resolved).toBe(ROLES.MEMBER);
    expect(await storedRole(u.id)).toBe(ROLES.MEMBER);
  });

  test('writes to the DB only when the effective role changes', async () => {
    const legacy = await seedUser('user');
    const stale = await seedUser(ROLES.SUPER_ADMIN);
    const update = spyOn(db, 'update');
    try {
      // Legacy 'user' already reads as member: no write, stored value untouched.
      await resolveUserRole({
        id: legacy.id,
        email: legacy.email,
        role: 'user',
        emailVerified: true,
      });
      expect(update).not.toHaveBeenCalled();
      expect(await storedRole(legacy.id)).toBe('user');

      await resolveUserRole({
        id: stale.id,
        email: stale.email,
        role: ROLES.SUPER_ADMIN,
        emailVerified: true,
      });
      expect(update).toHaveBeenCalledTimes(1);
    } finally {
      update.mockRestore();
    }
  });
});
