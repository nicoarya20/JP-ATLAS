/**
 * Typed client for `/api/admin/users/:id/leave` (P14 CU-04): read somebody's availability, record a
 * period, end the one under way. Admin console only — leave is applied for outside the app and only
 * recorded here (P14 D3) — and the only surface that carries the Admin-only note (P14 D6).
 *
 * The shapes are written out instead of imported from `@server/leave/leave.query`: that module
 * reaches the database, so it may not enter the browser bundle. Page size is never hardcoded here;
 * the answer says which `limit` it used, so the server stays the single authority on it.
 */
import { json, request } from './admin-users-api';

/** A recorded period, as the admin API answers it. `note` goes no further than this screen (D6). */
export type AdminLeavePeriod = {
  id: string;
  /** `YYYY-MM-DD`, both ends inclusive. */
  startDate: string;
  endDate: string;
  note: string | null;
  days: number;
};

/** A period in the history list: who wrote it down, and when. */
export type AdminLeaveEntry = AdminLeavePeriod & {
  recordedAt: string;
  /** Null once the Admin who recorded it is gone; the period stays. */
  recordedBy: { id: string; name: string | null } | null;
};

export type AdminLeaveRead = {
  /** Today in the team zone, so a past period is told from a future one without the browser clock. */
  today: string;
  /** The period covering today, or null when the person is here. */
  running: AdminLeavePeriod | null;
  items: AdminLeaveEntry[];
  total: number;
  page: number;
  limit: number;
};

export type SetLeaveInput = { startDate: string; endDate: string; note?: string | null };
/** `replaced` carries the period that was overwritten, so the screen can say so instead of hiding it. */
export type SetLeaveResult = {
  ok: true;
  period: AdminLeavePeriod;
  replaced: AdminLeavePeriod | null;
};
export type ClearLeaveResult = { ok: true; cleared: AdminLeavePeriod };

const leaveUrl = (userId: string) => `/api/admin/users/${encodeURIComponent(userId)}/leave`;

/** Query key of one person's availability; the page is part of it so paging keeps its own cache entry. */
export const userLeaveKey = (userId: string, page = 1) =>
  ['admin-user-leave', userId, page] as const;
/** Prefix every page of one person shares, for invalidating after a write. */
export const userLeaveKeyPrefix = (userId: string) => ['admin-user-leave', userId] as const;

export const fetchUserLeave = (userId: string, page = 1) =>
  request<AdminLeaveRead>(`${leaveUrl(userId)}?page=${page}`);

/** Records the period, replacing the one under way when there is one (the answer names it). */
export const setUserLeave = (userId: string, input: SetLeaveInput) =>
  request<SetLeaveResult>(leaveUrl(userId), json('PUT', input));

/** Ends the leave under way; the row is deleted, so it leaves the history too. */
export const clearUserLeave = (userId: string) =>
  request<ClearLeaveResult>(leaveUrl(userId), json('DELETE'));
