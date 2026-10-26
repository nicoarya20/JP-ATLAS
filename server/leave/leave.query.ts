/**
 * Reads of `leave_period` the admin paths need: the period under way, the period a new range would
 * collide with, and one person's recorded history (P14 §10 T1). Each read takes the executor, so
 * the service can run it inside its own transaction. The Team status has its own statement in
 * `leave.status.query.ts`; all of them lean on `leave_period_user_id_idx`.
 */
import { and, asc, count, desc, eq, gte, lte, ne } from 'drizzle-orm';
import { db } from '../db';
import { leavePeriod, user } from '../db/schema';
import type { IsoDate } from '../metrics/types';
import type { Executor } from '../pm/tx';
import { leaveDays } from './leave.validate';

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

/**
 * One recorded period as the Admin drawer's history reads it (P14 §10 T1). The `days` count and the
 * ISO timestamp are built here rather than in the route: a period that is entirely in the past is
 * invisible everywhere else, so this is the only screen that can show it, and nothing else needs a
 * second shape for it. `recordedBy` comes from the same statement — one row per period, no N+1.
 */
export type LeaveHistoryRow = LeavePeriodRow & {
  days: number;
  /** When the Admin wrote it down, ISO; the client formats it in the reader's zone. */
  recordedAt: string;
  /** The Admin who recorded it, or null once that account is gone (`created_by` is ON DELETE SET NULL). */
  recordedBy: { id: string; name: string | null } | null;
};

/** Default page of the history list; the drawer is a side panel, not a report. */
export const LEAVE_HISTORY_LIMIT = 10;
/** Ceiling a caller may ask for, so a page size cannot turn into "load every period". */
export const LEAVE_HISTORY_MAX_LIMIT = 50;

/**
 * One person's recorded periods, newest range first, with the Admin who wrote each one. Paged on
 * purpose: somebody with years of history must not arrive as one answer. `total` is a second
 * statement because the page itself is truncated, so the list cannot count what it does not hold.
 */
export async function listLeavePeriods(
  userId: string,
  paging: { limit: number; offset: number },
  exec: Executor = db,
): Promise<{ items: LeaveHistoryRow[]; total: number }> {
  const rows = await exec
    .select({
      ...COLUMNS,
      createdAt: leavePeriod.createdAt,
      byId: user.id,
      byName: user.name,
    })
    .from(leavePeriod)
    // LEFT JOIN, not INNER: a period whose recording admin was deleted must still be listed.
    .leftJoin(user, eq(user.id, leavePeriod.createdBy))
    .where(eq(leavePeriod.userId, userId))
    .orderBy(desc(leavePeriod.startDate), desc(leavePeriod.id))
    .limit(paging.limit)
    .offset(paging.offset);
  const [counted] = await exec
    .select({ total: count() })
    .from(leavePeriod)
    .where(eq(leavePeriod.userId, userId));
  return {
    items: rows.map(({ createdAt, byId, byName, ...row }) => ({
      ...row,
      days: leaveDays(row.startDate, row.endDate),
      recordedAt: createdAt.toISOString(),
      recordedBy: byId === null ? null : { id: byId, name: byName },
    })),
    total: counted?.total ?? 0,
  };
}
