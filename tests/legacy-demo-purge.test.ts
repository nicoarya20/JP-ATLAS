/** purgeLegacyDemoUsers (S0A-13): old anonymous demo accounts go, regular accounts stay, batches cover >500 rows. */
import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { eq, like } from 'drizzle-orm';
import { db } from '../server/db';
import { post, user } from '../server/db/schema';
import { purgeLegacyDemoUsers, runLegacyDemoPurge } from '../server/demo/cleanup';
import { logger } from '../server/logger';
import { testUser } from './support/accounts';

const TAG = `lp-${crypto.randomUUID().slice(0, 8)}`;
// Matches the BATCH constant in cleanup.ts; 520 rows force a second DELETE round.
const OVER_ONE_BATCH = 520;
const DAY_MS = 86_400_000;

const rowsOf = (n: number, isAnonymous: boolean, prefix: string) =>
  Array.from({ length: n }, (_, i) =>
    testUser({ id: `${TAG}-${prefix}-${i}`, isAnonymous, approvalStatus: 'rejected' }),
  );
const remaining = async (prefix: string) =>
  (
    await db
      .select({ id: user.id })
      .from(user)
      .where(like(user.id, `${TAG}-${prefix}-%`))
  ).length;

afterEach(async () => {
  await db.delete(user).where(like(user.id, `${TAG}-%`));
});

describe('purgeLegacyDemoUsers', () => {
  test('removes old anonymous users with their posts and leaves regular accounts intact', async () => {
    const old = new Date(Date.now() - 30 * DAY_MS);
    const [anon] = await db
      .insert(user)
      .values(testUser({ id: `${TAG}-anon-0`, isAnonymous: true, createdAt: old }))
      .returning({ id: user.id });
    const [regular] = await db
      .insert(user)
      .values(testUser({ id: `${TAG}-real-0`, isAnonymous: false, createdAt: old }))
      .returning({ id: user.id });
    const [legacyNull] = await db
      .insert(user)
      .values(testUser({ id: `${TAG}-null-0` }))
      .returning({ id: user.id });
    await db.insert(post).values({ title: `Post ${TAG}`, authorId: anon.id });

    const deleted = await purgeLegacyDemoUsers();

    expect(deleted).toBeGreaterThanOrEqual(1);
    expect(await remaining('anon')).toBe(0);
    expect(await db.select().from(post).where(eq(post.authorId, anon.id))).toHaveLength(0);
    for (const id of [regular.id, legacyNull.id])
      expect(await db.select({ id: user.id }).from(user).where(eq(user.id, id))).toHaveLength(1);
  });

  test('sweeps more than one batch of anonymous users and still spares regular ones', async () => {
    await db.insert(user).values(rowsOf(OVER_ONE_BATCH, true, 'bulk'));
    await db.insert(user).values(rowsOf(3, false, 'keep'));

    const deleted = await purgeLegacyDemoUsers();

    expect(deleted).toBeGreaterThanOrEqual(OVER_ONE_BATCH);
    expect(await remaining('bulk')).toBe(0);
    expect(await remaining('keep')).toBe(3);
  });

  test('returns 0 and touches nothing when no anonymous user is left', async () => {
    await db.insert(user).values(rowsOf(2, false, 'keep'));
    await purgeLegacyDemoUsers();
    expect(await purgeLegacyDemoUsers()).toBe(0);
    expect(await remaining('keep')).toBe(2);
  });
});

describe('runLegacyDemoPurge', () => {
  test('logs a failure without PII and does not throw, so the server still boots', async () => {
    const del = spyOn(db, 'delete').mockImplementation((() => {
      throw new Error('db down');
    }) as unknown as typeof db.delete);
    const warn = spyOn(logger, 'warn');
    try {
      await expect(runLegacyDemoPurge()).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(warn.mock.calls[0][1])).toContain('legacy demo user purge failed');
    } finally {
      del.mockRestore();
      warn.mockRestore();
    }
  });
});
