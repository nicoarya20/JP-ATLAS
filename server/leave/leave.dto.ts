/**
 * Shapes and limits of the leave module (Pengaturan > Ketersediaan, Inbox approval card, Team status).
 * Explicit DTOs, not table rows. Dates leave the server as `YYYY-MM-DD` strings in the team zone and
 * instants as ISO strings. A person is only ever `{ id, name }`, never an email or a phone number.
 */

import type { LeaveStatus } from '../db/schema.leave';
import type { IsoDate } from '../metrics/types';
import type { PmCode } from '../pm/errors';

export type { LeaveStatus };

/** A person as leave shows them: id and name only. */
export type LeavePerson = { id: string; name: string };

/** "Now" and "today" in the team zone, injected so a day boundary is testable and never cached. */
export type LeaveClock = { now: Date; today: IsoDate };

// Limits live here, not in a DB CHECK: raising one must not need a migration.
/** Longest range one request may cover, in days (both ends count). */
export const LEAVE_MAX_DAYS = 90;
/** Longest requester note. */
export const LEAVE_NOTE_MAX = 500;
/** Longest reject reason the requester reads. */
export const LEAVE_REJECT_REASON_MAX = 300;
/** Past requests `GET /leave/me` returns, newest first. */
export const LEAVE_HISTORY_LIMIT = 10;
/** Most people one `leaveStatusFor` call may be asked about (one Team page is at most 50). */
export const LEAVE_STATUS_PEOPLE_MAX = 200;

/** One leave request as the requester, an approver or the Team status reads it. */
export type LeaveRequestDto = {
  id: string;
  userId: string;
  startDate: IsoDate;
  endDate: IsoDate;
  /** Calendar days, both ends included. */
  days: number;
  note: string | null;
  status: LeaveStatus;
  /** Null while pending and when the request was approved automatically (Admin, or the switch is off). */
  decidedBy: LeavePerson | null;
  decidedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  /** Whether the requester can still withdraw it today (pending, or approved up to its last day). */
  canCancel: boolean;
};

/** What `GET /leave/me` answers: the requester's own current state plus recent history. */
export type LeaveMeDto = {
  state: 'none' | 'pending' | 'approved' | 'rejected';
  request: LeaveRequestDto | null;
  history: LeaveRequestDto[];
  requiresApproval: boolean;
};

/** A pending request as the approver's list and the Inbox card read it. */
export type LeavePendingDto = {
  id: string;
  requester: LeavePerson;
  startDate: IsoDate;
  endDate: IsoDate;
  days: number;
  note: string | null;
  createdAt: string;
  /** The requester's unfinished tasks whose due date falls inside the range. */
  dueTasks: number;
};

export type LeavePendingPage = {
  items: LeavePendingDto[];
  total: number;
  page: number;
  limit: number;
};

/** What the Team menu shows next to a person; absent (null) when there is nothing the viewer may see. */
export type LeaveStatusDto =
  | { kind: 'on_leave'; until: IsoDate }
  | { kind: 'pending'; from: IsoDate; to: IsoDate };

/** A write that cannot proceed: the API code the route maps, plus the sentence the user reads. */
export type LeaveRefusal = { ok: false; code: PmCode; error?: string };

export type LeaveWriteResult = { ok: true; request: LeaveRequestDto } | LeaveRefusal;

export const refusal = (code: PmCode, error?: string): LeaveRefusal =>
  error === undefined ? { ok: false, code } : { ok: false, code, error };

/** A policy verdict as a refusal; the policy's hidden-record code is the 404 a missing request gives. */
export function refuse(code: string): LeaveRefusal {
  return refusal((code === 'NOT_VISIBLE' ? 'NOT_FOUND' : code) as PmCode);
}
