/** Trash retention in calendar days of the team zone (R03 §3.6): "deleted 3 Oct → 26 days left" on 7 Oct. */
import { METRICS } from './config';
import { diffDays, isoDateIn } from './dates';
import type { MetricsConfig } from './types';

/** Whole days left before an item deleted at `deletedAt` can no longer be restored; never negative. */
export function trashDaysLeft(deletedAt: Date, now: Date, c: MetricsConfig = METRICS): number {
  const elapsed = diffDays(isoDateIn(deletedAt, c.TIME_ZONE), isoDateIn(now, c.TIME_ZONE));
  return Math.max(0, c.TRASH_RETENTION_DAYS - elapsed);
}

/** Whether the item may still be restored; with 30 days it expires on the 31st calendar day (day of deletion = day 1). */
export function isRestorable(deletedAt: Date, now: Date, c: MetricsConfig = METRICS): boolean {
  return trashDaysLeft(deletedAt, now, c) > 0;
}
