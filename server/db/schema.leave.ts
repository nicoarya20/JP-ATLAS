/**
 * Leave requests (`leave_request`). Migration 0021 creates the table.
 * A request is a calendar range with no balance or leave type (Pengaturan > Ketersediaan). The
 * Team status is computed from these rows by date, so a leave ends by itself; nothing is stored
 * per day. Enum tuples live in this file for the same reason as `schema.notification.ts`.
 */
import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './schema.auth';
import { createdAt, oneOf, pk, updatedAt } from './schema.columns';

/** `pending` waits for an approver, `canceled` is the requester withdrawing; `rejected`/`canceled` are final. */
export const LEAVE_STATUSES = ['pending', 'approved', 'rejected', 'canceled'] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

/** Statuses that hold the calendar: two of them for one person may not overlap. */
export const LEAVE_ACTIVE_STATUSES = [
  'pending',
  'approved',
] as const satisfies readonly LeaveStatus[];

/** A range of days one person is away, inclusive of both ends, decided by an approver or automatically. */
export const leaveRequest = pgTable(
  'leave_request',
  {
    id: pk(),
    // CASCADE: a deleted account takes its requests with it; nobody else owns them.
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Pure calendar dates in the team zone: string mode avoids timezone shifts.
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    note: text('note'),
    status: text('status', { enum: LEAVE_STATUSES }).notNull().default('pending'),
    // NULL with status `approved` = approved automatically (Admin, or the approval switch is off).
    decidedBy: text('decided_by').references(() => user.id, { onDelete: 'set null' }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    rejectReason: text('reject_reason'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    oneOf(t.status, LEAVE_STATUSES),
    check('leave_request_end_after_start_check', sql`${t.endDate} >= ${t.startDate}`),
    // "My requests" and the overlap check start from the person and their open statuses.
    index('leave_request_user_id_status_idx').on(t.userId, t.status),
    // The Team status and the approver's list both ask "who is in this status on these days".
    index('leave_request_status_start_date_end_date_idx').on(t.status, t.startDate, t.endDate),
  ],
);
