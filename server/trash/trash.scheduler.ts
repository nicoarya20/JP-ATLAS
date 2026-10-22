/**
 * Daily start of the Trash purge (`trash.purge.ts`): checked hourly and run at most once a day,
 * plus one run shortly after boot, the cadence of `notification.scheduler.ts`. Safe to call twice
 * and safe to tick twice, because the purge is idempotent.
 */
import { runTrashPurge } from './trash.purge';

const DAY_MS = 86_400_000;
const CHECK_INTERVAL_MS = 60 * 60_000;
/** Gives Postgres and the migrations time to settle before the first run touches the DB. */
const BOOT_DELAY_MS = 20_000;

const g = globalThis as typeof globalThis & {
  __simplePmTrashPurge?: { started: boolean; lastRunAt: number };
};
// The SSR bundle is a second copy of this module, so the run state lives on globalThis (CLAUDE.md).
g.__simplePmTrashPurge ??= { started: false, lastRunAt: 0 };
const state = g.__simplePmTrashPurge;

export function startTrashPurgeScheduler(): void {
  if (state.started) return;
  state.started = true;
  const tick = () => {
    const now = Date.now();
    if (now - state.lastRunAt < DAY_MS) return;
    state.lastRunAt = now;
    void runTrashPurge(new Date(now));
  };
  setInterval(tick, CHECK_INTERVAL_MS).unref?.();
  setTimeout(tick, BOOT_DELAY_MS).unref?.();
}
