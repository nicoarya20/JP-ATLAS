/**
 * Reads of `leave_period` the admin write paths need: the period under way, and the period a new
 * range would collide with. Each function is one statement and takes the executor, so the service
 * can read inside its own transaction. The Team status has its own statement in
 * `leave.status.query.ts`; both lean on `leave_period_user_id_idx`.
 */
import { and, asc, eq, gte, lte, ne } from 'drizzle-orm';
import { db } from '../db';
import { leavePeriod } from '../db/schema';
import type { IsoDate } from '../metrics/types';
import type { Executor } from '../pm/tx';

/** A recorded period as the admin paths read it; `note` is Admin-only and stops here (P14 D6). */
export type LeavePeriodRow = {
  id: string;
  startDate: IsoDate;
  endDate: IsoDate;
  note: string | null;
};

const COLUMNS = {
  id: leavePeriod.id,
  startDate: leavePeriod.startDate,
  endDate: leavePeriod.endDate,
  note: leavePeriod.note,
} as const;

/**
 * The leave `userId` is on today, or null when they are here. Earliest start wins, so two periods
 * that both cover today (possible for rows the migration carried over) resolve to one answer.
 */
export async function runningPeriod(
  userId: string,
  today: IsoDate,
  exec: Executor = db,
): Promise<LeavePeriodRow | null> {
  const [row] = await exec
    .select(COLUMNS)
    .from(leavePeriod)
    .where(
      and(
        eq(leavePeriod.userId, userId),
        lte(leavePeriod.startDate, today),
        gte(leavePeriod.endDate, today),
      ),
    )
    .orderBy(asc(leavePeriod.startDate), asc(leavePeriod.id))
    .limit(1);
  return row ?? null;
}

/**
 * A period of the same person that shares at least one day with `start`..`end`, or null. `exceptId`
 * is the row being replaced, which may of course overlap itself. The answer carries the range so
 * the 409 can name the period the Admin has to look at (P14 §10 T2).
 */
export async function overlappingPeriod(
  userId: string,
  start: IsoDate,
  end: IsoDate,
  exceptId: string | null,
  exec: Executor = db,
): Promise<LeavePeriodRow | null> {
  const [row] = await exec
    .select(COLUMNS)
    .from(leavePeriod)
    .where(
      and(
        eq(leavePeriod.userId, userId),
        // Two inclusive ranges touch when each starts no later than the other ends.
        lte(leavePeriod.startDate, end),
        gte(leavePeriod.endDate, start),
        exceptId ? ne(leavePeriod.id, exceptId) : undefined,
      ),
    )
    .orderBy(asc(leavePeriod.startDate), asc(leavePeriod.id))
    .limit(1);
  return row ?? null;
}
