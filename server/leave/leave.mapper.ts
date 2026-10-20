/** Turns a `leave_request` row (plus the decider's name) into the DTO every leave read and write answers with. */
import type { leaveRequest } from '../db/schema';
import type { IsoDate } from '../metrics/types';
import type { LeavePerson, LeaveRequestDto } from './leave.dto';
import { canCancelLeaveOn } from './leave.policy';
import { leaveDays } from './leave.validate';

export type LeaveRow = typeof leaveRequest.$inferSelect;

/** A row with the decider joined in; `decider` is null while pending, auto-approved, or after the decider's account is gone. */
export type LeaveRowWithDecider = LeaveRow & { decider: LeavePerson | null };

export function toLeaveDto(row: LeaveRowWithDecider, today: IsoDate): LeaveRequestDto {
  return {
    id: row.id,
    userId: row.userId,
    startDate: row.startDate,
    endDate: row.endDate,
    days: leaveDays(row.startDate, row.endDate),
    note: row.note,
    status: row.status,
    decidedBy: row.decider,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    rejectReason: row.rejectReason,
    createdAt: row.createdAt.toISOString(),
    canCancel: canCancelLeaveOn(row, today),
  };
}
