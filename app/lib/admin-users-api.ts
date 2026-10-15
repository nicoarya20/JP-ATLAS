/** Typed client for /api/admin/users used by /dev/users. */

/** Account approval state (S0A); `pending` accounts wait for an Admin decision. */
export type UserApprovalStatus = 'pending' | 'approved' | 'rejected';

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
  approvalStatus: UserApprovalStatus;
  approvalReason: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  loginCount: number;
  activeSessions: number;
  providers: string[];
};

export type UserStats = {
  total: number;
  admins: number;
  superAdmins: number;
  banned: number;
  pending: number;
  verified: number;
  new7d: number;
  active24h: number;
};

export type UserSort = 'newest' | 'oldest' | 'name' | 'lastLogin';
export type ApprovalFilter = 'all' | UserApprovalStatus;
export type UserFilters = {
  search: string;
  role: string | null;
  status: 'all' | 'active' | 'banned';
  approval: ApprovalFilter;
  period: '7' | '30' | '90' | 'all';
  sort: UserSort;
};
export const DEFAULT_USER_FILTERS: UserFilters = {
  search: '',
  role: null,
  status: 'all',
  approval: 'all',
  period: 'all',
  sort: 'newest',
};

export type UserListParams = UserFilters & { page: number; limit: number };
export type UserListResponse = { users: AdminUser[]; total: number; page: number; limit: number };

/** Page size of the approval queue; oldest request first so nobody waits behind newer sign-ups. */
export const PENDING_LIMIT = 50;
export const PENDING_PARAMS: UserListParams = {
  ...DEFAULT_USER_FILTERS,
  approval: 'pending',
  sort: 'oldest',
  page: 1,
  limit: PENDING_LIMIT,
};

const BASE = '/api/admin/users';

export function buildUserQuery(p: Partial<UserListParams>): URLSearchParams {
  const q = new URLSearchParams();
  if (p.page) q.set('page', String(p.page));
  if (p.limit) q.set('limit', String(p.limit));
  if (p.search?.trim()) q.set('search', p.search.trim());
  if (p.role) q.set('role', p.role);
  if (p.status && p.status !== 'all') q.set('status', p.status);
  if (p.approval && p.approval !== 'all') q.set('approval', p.approval);
  if (p.period && p.period !== 'all') q.set('days', p.period);
  if (p.sort && p.sort !== 'newest') q.set('sort', p.sort);
  return q;
}

export function hasActiveUserFilters(f: UserFilters): boolean {
  return (
    f.search.trim() !== '' ||
    f.role !== null ||
    f.status !== 'all' ||
    f.approval !== 'all' ||
    f.period !== 'all' ||
    f.sort !== 'newest'
  );
}

/** Shared by the other /api/admin clients: throws an Error carrying the server's Indonesian message. */
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `${init?.method ?? 'GET'} ${url} gagal (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}
export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const fetchUsers = (p: UserListParams) =>
  request<UserListResponse>(`${BASE}?${buildUserQuery(p)}`);
export const fetchUserStats = () => request<UserStats>(`${BASE}/stats`);
export const setUserRole = (id: string, role: string) =>
  request<{ ok: true }>(`${BASE}/${encodeURIComponent(id)}/role`, json('POST', { role }));
export const banUser = (id: string, reason?: string, expiresIn?: number) =>
  request<{ ok: true }>(
    `${BASE}/${encodeURIComponent(id)}/ban`,
    json('POST', { reason: reason || undefined, expiresIn }),
  );
export const unbanUser = (id: string) =>
  request<{ ok: true }>(`${BASE}/${encodeURIComponent(id)}/unban`, json('POST', {}));
export const deleteUser = (id: string) =>
  request<{ ok: true }>(`${BASE}/${encodeURIComponent(id)}`, json('DELETE'));
/** Approves a pending or rejected account; `role` is optional and keeps the current role when omitted. */
export const approveUser = (id: string, role?: string) =>
  request<{ ok: true }>(`${BASE}/${encodeURIComponent(id)}/approve`, json('POST', { role }));
/** Rejects a pending account; the server requires a 3-200 character reason. */
export const rejectUser = (id: string, reason: string) =>
  request<{ ok: true }>(`${BASE}/${encodeURIComponent(id)}/reject`, json('POST', { reason }));

/** Ban duration presets (seconds); null = permanent. */
export const BAN_DURATIONS: Array<{ value: string; label: string; seconds: number | null }> = [
  { value: 'permanent', label: 'Permanen', seconds: null },
  { value: '1d', label: '1 hari', seconds: 86_400 },
  { value: '7d', label: '7 hari', seconds: 7 * 86_400 },
  { value: '30d', label: '30 hari', seconds: 30 * 86_400 },
];

/** True when a ban is still in force (no expiry, or expiry in the future). */
export function isBanActive(
  u: Pick<AdminUser, 'banned' | 'banExpires'>,
  now = Date.now(),
): boolean {
  if (!u.banned) return false;
  return !u.banExpires || new Date(u.banExpires).getTime() > now;
}

/** Plain-language role names shown to people (the stored value stays the English key). */
export const ROLE_LABEL: Record<string, string> = {
  member: 'Member',
  project_manager: 'Project Manager',
  admin: 'Admin',
  'super-admin': 'Super-admin',
};

export type UserStatusKey = 'active' | 'banned' | 'pending' | 'rejected';
export type UserStatus = { key: UserStatusKey; label: string; color: string };

/**
 * One account status for badges. A suspension wins over the approval state because
 * it is the stronger restriction; otherwise the approval state decides.
 */
export function userStatus(
  u: Pick<AdminUser, 'banned' | 'banExpires' | 'approvalStatus'>,
  now = Date.now(),
): UserStatus {
  if (isBanActive(u, now)) return { key: 'banned', label: 'Diblokir', color: 'red' };
  if (u.approvalStatus === 'pending')
    return { key: 'pending', label: 'Menunggu persetujuan', color: 'yellow' };
  if (u.approvalStatus === 'rejected')
    return { key: 'rejected', label: 'Ditolak', color: 'orange' };
  return { key: 'active', label: 'Aktif', color: 'teal' };
}
