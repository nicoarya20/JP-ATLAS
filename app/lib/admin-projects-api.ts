/** Typed client for `/api/admin/projects` (P11 AD-11..AD-13), used by /dashboard/projects. */
import type { ProjectStatus } from '@server/pm/enums';
import type { ProjectListItem } from '@server/project/project.dto';
import { json, request } from './admin-users-api';

export type { ProjectListItem };

export type AdminProjectSort = 'due' | 'name' | 'recent';
export type AdminProjectStatusFilter = 'all' | ProjectStatus;

export type AdminProjectFilters = {
  q: string;
  status: AdminProjectStatusFilter;
  sort: AdminProjectSort;
};

export const DEFAULT_ADMIN_PROJECT_FILTERS: AdminProjectFilters = {
  q: '',
  status: 'all',
  sort: 'recent',
};

export type AdminProjectsParams = AdminProjectFilters & { page: number; limit: number };
export type AdminProjectsResponse = {
  items: ProjectListItem[];
  total: number;
  page: number;
  limit: number;
};

/** Page size of the Admin project table; the list is always paginated (R6, CLAUDE.md §13). */
export const ADMIN_PROJECTS_LIMIT = 25;

const BASE = '/api/admin/projects';

/** React-query keys; invalidate `adminProjectKeys.all` after a manager change so the list refreshes. */
export const adminProjectKeys = {
  all: ['admin-projects'] as const,
  list: (p: AdminProjectsParams) => ['admin-projects', 'list', p] as const,
};

export function buildAdminProjectsQuery(p: Partial<AdminProjectsParams>): URLSearchParams {
  const q = new URLSearchParams();
  if (p.page) q.set('page', String(p.page));
  if (p.limit) q.set('limit', String(p.limit));
  if (p.q?.trim()) q.set('q', p.q.trim());
  if (p.status && p.status !== 'all') q.set('status', p.status);
  if (p.sort && p.sort !== 'recent') q.set('sort', p.sort);
  return q;
}

export function hasActiveAdminProjectFilters(f: AdminProjectFilters): boolean {
  return f.q.trim() !== '' || f.status !== 'all' || f.sort !== 'recent';
}

export const fetchAdminProjects = (p: AdminProjectsParams) =>
  request<AdminProjectsResponse>(`${BASE}?${buildAdminProjectsQuery(p)}`);

/** A candidate Pengelola for a project: an existing manager other than the current lead (AD-13 A). */
export type ManagerCandidate = { userId: string; name: string };
export type ProjectManagersResponse = { managers: ManagerCandidate[] };

export const fetchProjectManagers = (projectId: string) =>
  request<ProjectManagersResponse>(`${BASE}/${encodeURIComponent(projectId)}/managers`);

/**
 * Hand a project to another Pengelola (AD-13). Session only — `PM_KEY_DENY` refuses any API key —
 * so this always rides the browser session's cookie.
 */
export const setProjectManager = (projectId: string, userId: string) =>
  request<{ ok: true }>(
    `${BASE}/${encodeURIComponent(projectId)}/manager`,
    json('PUT', { userId }),
  );
