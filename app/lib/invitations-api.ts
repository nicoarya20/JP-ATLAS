/** Typed client for /api/admin/invitations used by /dashboard/users. */
import { json, request } from './admin-users-api';

export type InvitationState = 'active' | 'used' | 'expired' | 'revoked';

export type AdminInvitation = {
  id: string;
  email: string;
  role: string;
  /** Status as the server derived it when the list was read; use `invitationState` for "now". */
  status: InvitationState;
  invitedBy: string | null;
  invitedByName: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type InvitationListResponse = {
  invitations: AdminInvitation[];
  total: number;
  limit: number;
  offset: number;
};

export type InvitationFilter = 'all' | InvitationState;

const BASE = '/api/admin/invitations';

/** Plain-language state names, in the order the filter shows them. */
export const INVITATION_STATE_LABEL: Record<InvitationState, string> = {
  active: 'Aktif',
  used: 'Terpakai',
  expired: 'Kedaluwarsa',
  revoked: 'Dicabut',
};

export const INVITATION_STATE_COLOR: Record<InvitationState, string> = {
  active: 'teal',
  used: 'blue',
  expired: 'gray',
  revoked: 'orange',
};

/**
 * State of an invitation at `now`. Same precedence as the server (used and revoked are
 * final, expiry only matters while open), recomputed here so a page left open does not
 * keep showing an invitation as active after it expired.
 */
export function invitationState(
  inv: Pick<AdminInvitation, 'acceptedAt' | 'revokedAt' | 'expiresAt'>,
  now = Date.now(),
): InvitationState {
  if (inv.acceptedAt) return 'used';
  if (inv.revokedAt) return 'revoked';
  if (new Date(inv.expiresAt).getTime() <= now) return 'expired';
  return 'active';
}

export function buildInvitationQuery(p: {
  status?: InvitationFilter;
  limit?: number;
  offset?: number;
}): URLSearchParams {
  const q = new URLSearchParams();
  if (p.status && p.status !== 'all') q.set('status', p.status);
  if (p.limit) q.set('limit', String(p.limit));
  if (p.offset) q.set('offset', String(p.offset));
  return q;
}

export const fetchInvitations = (p: {
  status?: InvitationFilter;
  limit?: number;
  offset?: number;
}) => request<InvitationListResponse>(`${BASE}?${buildInvitationQuery(p)}`);

export const createInvitation = (email: string, role: string) =>
  request<{ invitation: { id: string } }>(BASE, json('POST', { email, role }));

export const revokeInvitation = (id: string) =>
  request<{ ok: true }>(`${BASE}/${encodeURIComponent(id)}`, json('DELETE'));
