/**
 * The project list's Filter & sort, as the server can answer it (map `phase2-map-projects.md` §2b and the
 * decisions of 28 Oct 2026): a status, one "Needs attention" toggle (`perhatian=1`, at risk and off track
 * together — the server has no per-level filter, P-3), the server's three sorts (P-4: "Recently updated"
 * replaces "Lowest progress") and a search on the **name** only (P-5).
 */
import type { ProjectSortWire, ProjectStatusWire } from './projects.wire';

/** The lifecycle words the app shows; "Done" is the server's `completed`. */
export const STATUS_LABEL: Record<ProjectStatusWire, string> = {
  draft: 'Draft',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Done',
  canceled: 'Canceled',
};

/** Statuses that close a project: it can't be extended, and moving to one is confirmed first. */
export const CLOSING: readonly ProjectStatusWire[] = ['completed', 'canceled'];

/** Status chips in the order the prototype had them; null (All) = no status filter. */
export const STATUSES: readonly (ProjectStatusWire | null)[] = [
  null,
  'active',
  'on_hold',
  'completed',
  'draft',
  'canceled',
];

export const SORTS: readonly { wire: ProjectSortWire; label: string }[] = [
  { wire: 'due', label: 'Nearest deadline' },
  { wire: 'recent', label: 'Recently updated' },
  { wire: 'name', label: 'Name (A–Z)' },
];

/** The server refuses a longer search (`SEARCH_MAX_LENGTH` in `server/api/app-projects.ts`). */
export const PROJECT_SEARCH_MAX = 100;

export type ProjectsQuery = {
  status: ProjectStatusWire | null;
  /** Only active projects at risk or off track. */
  attention: boolean;
  sort: ProjectSortWire;
  q: string;
};

/** Every project the viewer may see, nearest deadline first. */
export const BASE_QUERY: ProjectsQuery = { status: null, attention: false, sort: 'due', q: '' };

/** True when the query narrows the list (the dot on the filter icon); the sort and the search do not count. */
export const isFiltered = (q: ProjectsQuery) => q.status !== null || q.attention;

/**
 * The list request for one page. `scope=all`: an Admin or a Project Manager sees every project, as in the
 * prototype, and the server narrows a Member to their own (`clampListScope`).
 */
export function listPath(q: ProjectsQuery, page: number, limit: number): string {
  const params = ['scope=all', `sort=${q.sort}`, `page=${page}`, `limit=${limit}`];
  if (q.status) params.push(`status=${q.status}`);
  if (q.attention) params.push('perhatian=1');
  const text = q.q.trim().slice(0, PROJECT_SEARCH_MAX);
  if (text) params.push(`q=${encodeURIComponent(text)}`);
  return `/api/app/projects?${params.join('&')}`;
}
