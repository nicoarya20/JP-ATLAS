/**
 * Fields every Trash row carries whatever its kind: when it went in, how long it can still be
 * restored (counted by the server, in the team zone, from the one retention constant) and, for a
 * task or event, which trashed project it is waiting for. Shared by the three hydrators.
 */
import type { Membership, Principal } from '../access/types';
import { isoDateIn } from '../metrics/dates';
import { lastRestorableDate, trashDaysLeft } from '../metrics/trash.metrics';
import type { IsoDate, MetricsConfig } from '../metrics/types';
import { isAdminRole } from '../permissions';

/** The date fields of a Trash row; every date is decided by the server. */
export type TrashTiming = {
  /** ISO instant of the delete. */
  deletedAt: string;
  /** Last calendar day (team zone) the item may still be restored. */
  restorableUntil: IsoDate;
  /** Whole days left before the purge; 0 once the item can no longer be restored. */
  daysLeft: number;
};

export function trashTiming(deletedAt: Date, now: Date, metrics: MetricsConfig): TrashTiming {
  return {
    deletedAt: deletedAt.toISOString(),
    restorableUntil: lastRestorableDate(isoDateIn(deletedAt, metrics.TIME_ZONE), metrics),
    daysLeft: trashDaysLeft(deletedAt, now, metrics),
  };
}

/** The trashed project a task or event waits for; `visible` says the caller can find it on the Projects tab. */
export type TrashBlockedBy = { projectId: string; name: string; visible: boolean };

/**
 * Whether the caller sees `projectId` among the trashed projects: Admin/Super-admin, whoever
 * deleted it and its managers, the same rule as `trashListScope`, so "Lihat proyeknya" never dead-ends.
 */
export function canSeeTrashedProject(
  p: Principal,
  deletedBy: string | null,
  m: Membership,
): boolean {
  return (
    isAdminRole(p.appRole) || (deletedBy !== null && deletedBy === p.id) || m?.role === 'manager'
  );
}
