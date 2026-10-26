/**
 * Client types for the leave UI. Since P14 nobody applies for leave in the app — Admin records it
 * (P14 D2/D3) — so Ketersediaan on /app/settings only reads, and the only write left here is the
 * Inbox approval card, which CU-06 takes away together with its notification kinds.
 */
import { apiRequest, jsonRequest } from './http';

/** What the settings loader hands the Ketersediaan card: the person's own state, read-only. */
export type LeavePageData = {
  /** The leave under way, or null when the person is here. */
  onLeaveUntil: string | null;
  /** Today in the team zone `YYYY-MM-DD`; the card never reads the browser clock. */
  today: string;
};

const LEAVE_URL = '/api/app/leave';
const pathId = (id: string) => encodeURIComponent(id);

type Written = { request: { id: string } };

export const approveLeave = (id: string) =>
  apiRequest<Written>(`${LEAVE_URL}/${pathId(id)}/approve`, jsonRequest('POST'));

export const rejectLeave = (id: string, reason: string | null) =>
  apiRequest<Written>(`${LEAVE_URL}/${pathId(id)}/reject`, jsonRequest('POST', { reason }));
