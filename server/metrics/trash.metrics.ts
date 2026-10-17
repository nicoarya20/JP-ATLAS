/** Trash retention in calendar days of the team zone (R03 §3.6): "deleted 3 Oct → 26 days left" on 7 Oct. */
import { METRICS } from './config';
import { diffDays, isoDateIn } from './dates';
import type { IsoDate, MetricsConfig } from './types';

/** Whole days left before an item deleted at `deletedAt` can no longer be restored; never negative. */
export function trashDaysLeft(deletedAt: Date, now: Date, c: MetricsConfig = METRICS): number {
  const elapsed = diffDays(isoDateIn(deletedAt, c.TIME_ZONE), isoDateIn(now, c.TIME_ZONE));
  return Math.max(0, c.TRASH_RETENTION_DAYS - elapsed);
}

/** Whether the item may still be restored; with 30 days it expires on the 31st calendar day (day of deletion = day 1). */
export function isRestorable(deletedAt: Date, now: Date, c: MetricsConfig = METRICS): boolean {
  return trashDaysLeft(deletedAt, now, c) > 0;
}

/**
 * The last calendar day (team zone) an item deleted on `deletedOn` may be restored: the day of
 * deletion counts as day 1, so it is `deletedOn + TRASH_RETENTION_DAYS - 1`, matching `isRestorable`.
 */
export function lastRestorableDate(deletedOn: IsoDate, c: MetricsConfig = METRICS): IsoDate {
  const d = new Date(`${deletedOn}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid ISO date: ${JSON.stringify(deletedOn)}`);
  d.setUTCDate(d.getUTCDate() + c.TRASH_RETENTION_DAYS - 1);
  return d.toISOString().slice(0, 10);
}
