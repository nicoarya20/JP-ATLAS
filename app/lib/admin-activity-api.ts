/**
 * Client for `GET /api/admin/activity` (P11 AD-18): the read-only, email-masked Admin reading of the
 * audit trail. The actor email arrives already masked from the server — the browser never sees a
 * full address.
 */

export type AdminActivityRow = {
  id: string;
  actorName: string | null;
  /** Already masked server-side, e.g. `bu••••@contoh.com`. */
  actorEmail: string | null;
  actorImage: string | null;
  action: string;
  targetType: string;
  summary: string;
  createdAt: string;
};

/** `{ id, label }` of a whitelist category; the page gets the list from its loader, not a client const. */
export type ActivityCategory = { id: string; label: string };

export type AdminActivityFilters = {
  search: string;
  category: string | null;
  period: '1' | '7' | '30' | 'all';
};

export const DEFAULT_ACTIVITY_FILTERS: AdminActivityFilters = {
  search: '',
  category: null,
  period: 'all',
};

export type AdminActivityListParams = AdminActivityFilters & { page: number; limit: number };
export type AdminActivityListResponse = {
  rows: AdminActivityRow[];
  total: number;
  page: number;
  limit: number;
};

const BASE = '/api/admin/activity';

export function buildActivityQuery(p: Partial<AdminActivityListParams>): URLSearchParams {
  const q = new URLSearchParams();
  if (p.page) q.set('page', String(p.page));
  if (p.limit) q.set('limit', String(p.limit));
  if (p.search?.trim()) q.set('search', p.search.trim());
  if (p.category) q.set('category', p.category);
  if (p.period && p.period !== 'all') q.set('days', p.period);
  return q;
}

export function hasActiveActivityFilters(f: AdminActivityFilters): boolean {
  return f.search.trim() !== '' || f.category !== null || f.period !== 'all';
}

export async function fetchAdminActivity(
  p: AdminActivityListParams,
): Promise<AdminActivityListResponse> {
  const res = await fetch(`${BASE}?${buildActivityQuery(p)}`);
  if (!res.ok) throw new Error(`Gagal memuat aktivitas (${res.status})`);
  return res.json();
}
