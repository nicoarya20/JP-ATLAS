/**
 * Leave periods (`leave_period`). Migration 0023 creates the table and drops `leave_request`.
 * A period is a calendar range with no balance and no leave type: Admin records what HRD or a
 * manager already decided outside the app (P14 D2/D4), so there is no status to keep — a row that
 * exists is a leave that holds. The Team status is computed from these rows by date, so a leave
 * ends by itself; nothing is stored per day.
 */
import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, text } from 'drizzle-orm/pg-core';
import { user } from './schema.auth';
import { createdAt, pk, updatedAt } from './schema.columns';

/** A range of days one person is away, inclusive of both ends, as recorded by an Admin. */
export const leavePeriod = pgTable(
  'leave_period',
  {
    id: pk(),
    // CASCADE: a deleted account takes its leave periods with it; nobody else owns them.
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Pure calendar dates in the team zone: string mode avoids timezone shifts.
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    /** Admin-only free text ("umroh", "sakit"); it never reaches a Team DTO (P14 D6). */
    note: text('note'),
    // SET NULL: who recorded it is a trace, not an owner, so a removed admin keeps the period alive.
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('leave_period_end_after_start_check', sql`${t.endDate} >= ${t.startDate}`),
    // "This person's periods" and the overlap check both start from the person.
    index('leave_period_user_id_idx').on(t.userId),
    // The Team status asks "who is away on these days" across everyone.
    index('leave_period_start_date_end_date_idx').on(t.startDate, t.endDate),
  ],
);
