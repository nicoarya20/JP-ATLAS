/**
 * Team list filters in the URL (Indonesian keys and values) and their API query. The default
 * (no project, no search, order by name) leaves the URL, so a clean list has a clean address.
 */
import type { TeamSort } from '@server/team/team.dto';
import { type FilterPatch, readEnum, readString } from './use-url-filters';

export const TEAM_FILTER_PARAMS = { project: 'proyek', q: 'q', sort: 'urut' } as const;

/** URL word → API sort. `aktif` is only for those who may see other people's numbers. */
const SORT_SLUGS = { nama: 'name', aktif: 'active' } as const satisfies Record<string, TeamSort>;

export type TeamSortSlug = keyof typeof SORT_SLUGS;
export const TEAM_SORT_SLUGS = Object.keys(SORT_SLUGS) as TeamSortSlug[];

export type TeamFilters = {
  /** Project id; '' = every project the viewer can see. */
  proyek: string;
  q: string;
  urut: TeamSortSlug;
};

export const DEFAULT_TEAM_FILTERS: TeamFilters = { proyek: '', q: '', urut: 'nama' };

/** Mirror the server's search cap and default page (`team.query.ts`, which also holds the database and cannot ship to the browser). */
export const TEAM_SEARCH_MAX = 100;
export const TEAM_PAGE_SIZE = 24;

/** URL → filters; unknown values (typos, old links) fall back to the defaults. */
export function parseTeamFilters(sp: URLSearchParams): TeamFilters {
  const P = TEAM_FILTER_PARAMS;
  return {
    proyek: readString(sp, P.project),
    q: readString(sp, P.q).slice(0, TEAM_SEARCH_MAX),
    urut: readEnum(sp, P.sort, TEAM_SORT_SLUGS, DEFAULT_TEAM_FILTERS.urut),
  };
}

/** Filters → URL, leaving defaults out. */
export function teamFiltersToParams(f: TeamFilters): URLSearchParams {
  const P = TEAM_FILTER_PARAMS;
  const sp = new URLSearchParams();
  if (f.proyek) sp.set(P.project, f.proyek);
  if (f.q.trim()) sp.set(P.q, f.q.trim());
  if (f.urut !== DEFAULT_TEAM_FILTERS.urut) sp.set(P.sort, f.urut);
  return sp;
}

/** Query for `GET /api/app/team` without the offset, which belongs to the page being fetched. */
export type TeamListQuery = {
  projectId?: string;
  q?: string;
  sort: TeamSort;
  limit: number;
};

export function toTeamQuery(f: TeamFilters): TeamListQuery {
  return {
    ...(f.proyek ? { projectId: f.proyek } : {}),
    ...(f.q.trim() ? { q: f.q.trim() } : {}),
    sort: SORT_SLUGS[f.urut],
    limit: TEAM_PAGE_SIZE,
  };
}

/** True when a project or a search narrows the list, so an empty result offers "Hapus saringan". */
export function hasTeamFilters(f: TeamFilters): boolean {
  return f.proyek !== '' || f.q.trim() !== '';
}

/** Without the right to see other people's numbers `urut=aktif` is stale: it falls back to the name order. */
export function allowSort(f: TeamFilters, canSortByLoad: boolean): TeamFilters {
  return canSortByLoad || f.urut === DEFAULT_TEAM_FILTERS.urut
    ? f
    : { ...f, urut: DEFAULT_TEAM_FILTERS.urut };
}

/** Address of the list without project or search; the chosen sort stays. */
export function clearTeamFiltersHref(f: TeamFilters): string {
  const qs = teamFiltersToParams({ ...f, proyek: '', q: '' }).toString();
  return qs ? `/app/team?${qs}` : '/app/team';
}

/** URL change that drops a stale `urut` (used when the viewer may not sort by load). */
export const dropSortPatch = (): FilterPatch => ({ [TEAM_FILTER_PARAMS.sort]: null });
