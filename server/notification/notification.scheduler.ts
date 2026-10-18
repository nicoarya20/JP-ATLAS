/**
 * Daily sweep of old Inbox cards (S3 I11, P5 §6 I11). Two kinds of card expire: everything in the
 * news lane, and action cards that have already been resolved. An open action card is never
 * deleted — it is work somebody still owes, and it leaves the Inbox by being resolved, not by aging.
 *
 * The sweep deletes in batches so one run never holds a long lock on the table, and it logs a
 * count only: no recipient, no title, no payload (R12).
 */
import { and, inArray, isNotNull, lt, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { notification } from '../db/schema';
import { logger } from '../logger';
import type { Executor } from '../pm/tx';
import { NOTIF_RETENTION_DAYS } from './notification.catalog';

/** Rows per DELETE, as in `server/demo/cleanup.ts`, so a big backlog is cleared in steps. */
const BATCH = 500;
const DAY_MS = 86_400_000;
/** Checked hourly and run at most once a day, the cadence `server/settings-retention.ts` uses. */
const CHECK_INTERVAL_MS = 60 * 60_000;
/** Gives Postgres and the migrations time to settle before the first sweep touches the DB. */
const BOOT_DELAY_MS = 15_000;

const g = globalThis as typeof globalThis & {
  __simplePmNotifPurge?: { started: boolean; lastRunAt: number };
};
// The SSR bundle is a second copy of this module, so the run state lives on globalThis (CLAUDE.md).
g.__simplePmNotifPurge ??= { started: false, lastRunAt: 0 };
const state = g.__simplePmNotifPurge;

/**
 * Deletes cards older than the retention window, in batches, and returns how many went.
 * `now` is injected by the tests; callers in the app leave it out.
 */
export async function purgeOldNotifications(
  now: number = Date.now(),
  exec: Executor = db,
): Promise<number> {
  const cutoff = new Date(now - NOTIF_RETENTION_DAYS * DAY_MS);
  const expired = and(
    lt(notification.createdAt, cutoff),
    // An open action card is exempt; a resolved one has done its job.
    or(sql`${notification.lane} = 'info'`, isNotNull(notification.resolvedAt)),
  );
  let total = 0;
  for (;;) {
    const rows = await exec
      .delete(notification)
      .where(
        inArray(
          notification.id,
          exec.select({ id: notification.id }).from(notification).where(expired).limit(BATCH),
        ),
      )
      .returning({ id: notification.id });
    total += rows.length;
    if (rows.length < BATCH) return total;
  }
}

/** Runs the sweep once; a failure is logged (error object only) and never propagates. */
export async function runNotificationPurge(now: number = Date.now()): Promise<number> {
  try {
    const deleted = await purgeOldNotifications(now);
    if (deleted > 0) logger.info({ deleted }, 'inbox cards purged');
    return deleted;
  } catch (err) {
    logger.warn({ err }, 'inbox card purge failed');
    return 0;
  }
}

/**
 * Starts the daily sweep: checked hourly, run at most once a day, plus one run shortly after boot.
 * Safe to call twice (the second call is ignored) and safe to tick twice: the delete is idempotent.
 */
export function startNotificationPurgeScheduler(): void {
  if (state.started) return;
  state.started = true;
  const tick = () => {
    const now = Date.now();
    if (now - state.lastRunAt < DAY_MS) return;
    state.lastRunAt = now;
    void runNotificationPurge(now);
  };
  setInterval(tick, CHECK_INTERVAL_MS).unref?.();
  setTimeout(tick, BOOT_DELAY_MS).unref?.();
}
