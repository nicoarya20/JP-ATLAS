/**
 * Project list filters in the URL (Indonesian keys and values) and their API query.
 * `lingkup=semua` is parsed for everyone; the server clamps a Member back to "mine" (M11).
 */
import type { ProjectStatus } from '@server/pm/enums';
import type { ProjectSort } from '@server/project/project.query';
import { PAGE_PARAM, readEnum, readInt, readString } from './use-url-filters';

export const PROJECT_FILTER_PARAMS = {
  scope: 'lingkup',
  status: 'status',
  sort: 'urut',
  q: 'q',
  page: PAGE_PARAM,
} as const;

const SCOPE_SLUGS = { saya: 'mine', semua: 'all' } as const;
const STATUS_SLUGS = {
  draf: 'draft',
  berjalan: 'active',
  ditunda: 'on_hold',
  selesai: 'completed',
  dibatalkan: 'canceled',
} as const satisfies Record<string, ProjectStatus>;
const SORT_SLUGS = {
  tenggat: 'due',
  terbaru: 'recent',
  nama: 'name',
} as const satisfies Record<string, ProjectSort>;

export type ScopeSlug = keyof typeof SCOPE_SLUGS;
export type StatusSlug = keyof typeof STATUS_SLUGS;
export type SortSlug = keyof typeof SORT_SLUGS;

export type ProjectFilters = {
  lingkup: ScopeSlug;
  /** null = every status ("Semua" chip). */
  status: StatusSlug | null;
  urut: SortSlug;
  q: string;
  hal: number;
};

/** Must match the server's search cap (`app-projects.ts`), so a long query is cut here, not rejected. */
export const PROJECT_SEARCH_MAX = 100;
export const PROJECT_PAGE_SIZE = 20;
const ALL_STATUS = '';

export const DEFAULT_PROJECT_FILTERS: ProjectFilters = {
  lingkup: 'saya',
  status: null,
  urut: 'tenggat',
  q: '',
  hal: 1,
};

const keysOf = <T extends object>(o: T) => Object.keys(o) as (keyof T & string)[];

/** URL → filters; unknown values (typos, old links) fall back to the defaults. */
export function parseProjectFilters(sp: URLSearchParams): ProjectFilters {
  const P = PROJECT_FILTER_PARAMS;
  const status = readEnum<StatusSlug | typeof ALL_STATUS>(
    sp,
    P.status,
    [ALL_STATUS, ...keysOf(STATUS_SLUGS)],
    ALL_STATUS,
  );
  return {
    lingkup: readEnum(sp, P.scope, keysOf(SCOPE_SLUGS), DEFAULT_PROJECT_FILTERS.lingkup),
    status: status === ALL_STATUS ? null : status,
    urut: readEnum(sp, P.sort, keysOf(SORT_SLUGS), DEFAULT_PROJECT_FILTERS.urut),
    q: readString(sp, P.q).slice(0, PROJECT_SEARCH_MAX),
    hal: readInt(sp, P.page, { fallback: 1, min: 1 }),
  };
}

/** Filters → URL, leaving defaults out so a clean list has a clean address. */
export function projectFiltersToParams(f: ProjectFilters): URLSearchParams {
  const P = PROJECT_FILTER_PARAMS;
  const D = DEFAULT_PROJECT_FILTERS;
  const sp = new URLSearchParams();
  if (f.lingkup !== D.lingkup) sp.set(P.scope, f.lingkup);
  if (f.status) sp.set(P.status, f.status);
  if (f.urut !== D.urut) sp.set(P.sort, f.urut);
  if (f.q.trim()) sp.set(P.q, f.q.trim());
  if (f.hal > 1) sp.set(P.page, String(f.hal));
  return sp;
}

/** Query for `GET /api/app/projects`; the server pages with `page` + `limit` and answers `total`. */
export type ProjectListQuery = {
  scope: 'mine' | 'all';
  status?: ProjectStatus;
  sort: ProjectSort;
  q?: string;
  page: number;
  limit: number;
};

export function toProjectQuery(
  f: ProjectFilters,
  limit: number = PROJECT_PAGE_SIZE,
): ProjectListQuery {
  return {
    scope: SCOPE_SLUGS[f.lingkup],
    ...(f.status ? { status: STATUS_SLUGS[f.status] } : {}),
    sort: SORT_SLUGS[f.urut],
    ...(f.q.trim() ? { q: f.q.trim() } : {}),
    page: f.hal,
    limit,
  };
}

/** True when a status or search narrows the list, so an empty result offers "Hapus saringan". */
export function hasProjectFilters(f: ProjectFilters): boolean {
  return f.status !== null || f.q.trim() !== '';
}
