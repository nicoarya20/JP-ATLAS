/**
 * Shapes and limits of the leave module (Team status, Pengaturan > Ketersediaan). Explicit DTOs,
 * not table rows. Dates leave the server as `YYYY-MM-DD` strings in the team zone. The Admin-only
 * note is deliberately absent from every type here: nothing a colleague reads may carry it (P14 D6).
 */

import type { IsoDate } from '../metrics/types';
import type { PmCode } from '../pm/errors';

// Limits live here, not in a DB CHECK: raising one must not need a migration.
/** Longest range one leave period may cover, in days (both ends count). */
export const LEAVE_MAX_DAYS = 90;
/** Longest note an Admin may record on a period. */
export const LEAVE_NOTE_MAX = 500;

/**
 * What the Team menu shows next to a person, or `null` when they are here. There is no second
 * kind any more: leave is recorded, not requested, so there is no waiting state to show (P14 D2).
 */
export type LeaveStatusDto = { kind: 'on_leave'; until: IsoDate };

/** A write that cannot proceed: the API code the route maps, plus the sentence the user reads. */
export type LeaveRefusal = { ok: false; code: PmCode; error?: string };

export const refusal = (code: PmCode, error?: string): LeaveRefusal =>
  error === undefined ? { ok: false, code } : { ok: false, code, error };
