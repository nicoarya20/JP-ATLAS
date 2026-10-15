/** Test fixtures for account rows (S0.a): a `user` that is already approved, because the DB default is `pending`. */
import type { schema } from '../../server/db';

export type TestUserRow = typeof schema.user.$inferInsert;

const TEST_EMAIL_DOMAIN = 'example.test'; // test-only

/**
 * Returns a `user` insert row with `approvalStatus: 'approved'` and a unique id/email.
 * Since migration 0014 new rows default to `pending`; tests that need a working account
 * (guards, API keys) must not depend on that default, so they build rows through this helper.
 */
export function testUser(overrides: Partial<TestUserRow> = {}): TestUserRow {
  const id = overrides.id ?? `test-user-${crypto.randomUUID()}`;
  return {
    id,
    name: 'Test User', // test-only
    email: `${id}@${TEST_EMAIL_DOMAIN}`,
    emailVerified: true,
    role: 'member',
    approvalStatus: 'approved',
    ...overrides,
  };
}
