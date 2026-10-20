/**
 * Client for the leave routes (`/api/app/leave`, Pengaturan > Ketersediaan). The reads happen in the
 * settings loader; this file holds the writes the page sends and the loader data it receives.
 * A failed call throws `ApiError` (the server's own Indonesian sentence for a 4xx).
 */
import type { LeaveMeDto, LeaveRequestDto } from '@server/leave/leave.dto';
import { apiRequest, jsonRequest } from './http';

export type { LeaveMeDto, LeaveRequestDto } from '@server/leave/leave.dto';

/**
 * Who answers a request from this person: `none` (an Admin, whose leave is approved at once),
 * `admin` (a Project Manager) or `manager_or_admin` (a Member). Decided by the loader, never by the page.
 */
export type LeaveApprovers = 'none' | 'admin' | 'manager_or_admin';

/** What the settings loader hands the leave sections; every right was decided on the server. */
export type LeavePageData = {
  me: LeaveMeDto;
  /** Today in the team zone `YYYY-MM-DD`; the date fields never read the browser clock. */
  today: string;
  flags: {
    canManageSwitch: boolean;
    /** A new request is approved on the spot (Admin, or the approval switch is off). */
    autoApproves: boolean;
    approvers: LeaveApprovers;
  };
};

export type LeaveInput = { startDate: string; endDate: string; note: string | null };

const LEAVE_URL = '/api/app/leave';
const pathId = (id: string) => encodeURIComponent(id);

type Written = { request: LeaveRequestDto };

export const submitLeave = (input: LeaveInput) =>
  apiRequest<Written>(LEAVE_URL, jsonRequest('POST', input));

export const cancelLeave = (id: string) =>
  apiRequest<Written>(`${LEAVE_URL}/${pathId(id)}`, jsonRequest('DELETE'));

export const approveLeave = (id: string) =>
  apiRequest<Written>(`${LEAVE_URL}/${pathId(id)}/approve`, jsonRequest('POST'));

export const rejectLeave = (id: string, reason: string | null) =>
  apiRequest<Written>(`${LEAVE_URL}/${pathId(id)}/reject`, jsonRequest('POST', { reason }));

export const putLeaveSwitch = (requiresApproval: boolean) =>
  apiRequest<{ requiresApproval: boolean }>(
    `${LEAVE_URL}/settings`,
    jsonRequest('PUT', { requiresApproval }),
  );
