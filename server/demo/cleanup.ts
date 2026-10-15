/**
 * Removes leftover anonymous demo accounts from before the demo sandbox was retired.
 * TODO(demo): hapus purge ini setelah semua lingkungan terbersihkan — S0A-13 (lihat CHANGELOG [Removed])
 */
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { user } from '../db/schema';
import { logger } from '../logger';

/** Rows per DELETE so one sweep never holds a long lock on `user`. */
const BATCH = 500;
/** Gives local Postgres and migrations time to settle before the one-off sweep touches the DB. */
const BOOT_DELAY_MS = 20_000;

/**
 * Delete every `is_anonymous = true` user (no TTL: the feature is gone) in batches;
 * returns how many were removed. FKs cascade (or set null on logs) and demo users
 * could never upload to storage, so a plain DB delete is enough. Regular accounts
 * are never matched.
 */
export async function purgeLegacyDemoUsers(): Promise<number> {
  const legacy = eq(user.isAnonymous, true);
  let total = 0;
  for (;;) {
    const rows = await db
      .delete(user)
      .where(inArray(user.id, db.select({ id: user.id }).from(user).where(legacy).limit(BATCH)))
      .returning({ id: user.id });
    total += rows.length;
    if (rows.length < BATCH) return total;
  }
}

/** One-off sweep shortly after boot; failures are logged (no PII) and never stop the server. */
export function schedulePurgeLegacyDemoUsers(): void {
  setTimeout(async () => {
    try {
      const deleted = await purgeLegacyDemoUsers();
      logger.info({ deleted }, 'legacy demo users purged');
    } catch (err) {
      logger.warn({ err }, 'legacy demo user purge failed');
    }
  }, BOOT_DELAY_MS).unref?.();
}
