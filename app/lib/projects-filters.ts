/**
 * Project list filters in the URL (Indonesian keys and values) and their API query.
 * `lingkup=semua` is parsed for everyone; the server clamps a Member back to "mine" (M11).
 */
import type { ProjectStatus } from '@server/pm/enums';
import { PAGE_LIMIT_MAX } from '@server/pm/limits';
import type { ProjectSort } from '@server/project/project.query';
import { type FilterPatch, PAGE_PARAM, readEnum, readInt, readString } from './use-url-filters';

export const PROJECT_FILTER_PARAMS = {
  scope: 'lingkup',
  status: 'status',
  sort: 'urut',
  q: 'q',
  view: 'tampilan',
  attention: 'perhatian',
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

/** How the list is drawn: table, cards or timeline; it never changes which projects match. */
export const VIEW_SLUGS = ['list', 'grid', 'gantt'] as const;

export type ViewSlug = (typeof VIEW_SLUGS)[number];
export type ScopeSlug = keyof typeof SCOPE_SLUGS;
export type StatusSlug = keyof typeof STATUS_SLUGS;
export type SortSlug = keyof typeof SORT_SLUGS;

export type ProjectFilters = {
  lingkup: ScopeSlug;
  /** null = every status ("Semua" chip). */
  status: StatusSlug | null;
  urut: SortSlug;
  q: string;
  tampilan: ViewSlug;
  /** "Perlu perhatian": only running projects that are at risk or late. It replaces the status filter. */
  perhatian: boolean;
  hal: number;
};

/** Must match the server's search cap (`app-projects.ts`), so a long query is cut here, not rejected. */
export const PROJECT_SEARCH_MAX = 100;
export const PROJECT_PAGE_SIZE = 20;
/** The timeline needs many projects at once to span a useful range; the server's page maximum is the cap. */
export const PROJECT_GANTT_PAGE_SIZE = PAGE_LIMIT_MAX;
const ALL_STATUS = '';
/** The only value of `?perhatian=`; anything else leaves the filter off. */
const ATTENTION_ON = '1';

export const DEFAULT_PROJECT_FILTERS: ProjectFilters = {
  lingkup: 'saya',
  status: null,
  urut: 'tenggat',
  q: '',
  tampilan: 'list',
  perhatian: false,
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
  const perhatian = sp.get(P.attention) === ATTENTION_ON;
  return {
    lingkup: readEnum(sp, P.scope, keysOf(SCOPE_SLUGS), DEFAULT_PROJECT_FILTERS.lingkup),
    // Attention already means "running", so a status in the same link is dropped.
    status: status === ALL_STATUS || perhatian ? null : status,
    urut: readEnum(sp, P.sort, keysOf(SORT_SLUGS), DEFAULT_PROJECT_FILTERS.urut),
    q: readString(sp, P.q).slice(0, PROJECT_SEARCH_MAX),
    tampilan: readEnum(sp, P.view, VIEW_SLUGS, DEFAULT_PROJECT_FILTERS.tampilan),
    perhatian,
    hal: readInt(sp, P.page, { fallback: 1, min: 1 }),
  };
}

/** Filters → URL, leaving defaults out so a clean list has a clean address. */
export function projectFiltersToParams(f: ProjectFilters): URLSearchParams {
  const P = PROJECT_FILTER_PARAMS;
  const D = DEFAULT_PROJECT_FILTERS;
  const sp = new URLSearchParams();
  if (f.lingkup !== D.lingkup) sp.set(P.scope, f.lingkup);
  if (f.status && !f.perhatian) sp.set(P.status, f.status);
  if (f.urut !== D.urut) sp.set(P.sort, f.urut);
  if (f.q.trim()) sp.set(P.q, f.q.trim());
  if (f.tampilan !== D.tampilan) sp.set(P.view, f.tampilan);
  if (f.perhatian) sp.set(P.attention, ATTENTION_ON);
  if (f.hal > 1) sp.set(P.page, String(f.hal));
  return sp;
}

/** Query for `GET /api/app/projects`; the server pages with `page` + `limit` and answers `total`. */
export type ProjectListQuery = {
  scope: 'mine' | 'all';
  status?: ProjectStatus;
  sort: ProjectSort;
  q?: string;
  /** `'1'` keeps only running projects that need attention (the API takes the literal flag). */
  perhatian?: typeof ATTENTION_ON;
  /** `'1'` adds each project's phases and milestones; only the timeline draws them. */
  rencana?: typeof ATTENTION_ON;
  page: number;
  limit: number;
};

/** Rows per request: the timeline asks for the biggest page the server allows. */
export const pageSizeFor = (view: ViewSlug): number =>
  view === 'gantt' ? PROJECT_GANTT_PAGE_SIZE : PROJECT_PAGE_SIZE;

export function toProjectQuery(
  f: ProjectFilters,
  limit: number = pageSizeFor(f.tampilan),
): ProjectListQuery {
  return {
    scope: SCOPE_SLUGS[f.lingkup],
    ...(f.status && !f.perhatian ? { status: STATUS_SLUGS[f.status] } : {}),
    sort: SORT_SLUGS[f.urut],
    ...(f.q.trim() ? { q: f.q.trim() } : {}),
    ...(f.perhatian ? { perhatian: ATTENTION_ON } : {}),
    ...(f.tampilan === 'gantt' ? { rencana: ATTENTION_ON } : {}),
    page: f.hal,
    limit,
  };
}

/** True when a status, "Perlu perhatian" or a search narrows the list, so an empty result offers "Hapus saringan". */
export function hasProjectFilters(f: ProjectFilters): boolean {
  return f.status !== null || f.perhatian || f.q.trim() !== '';
}

/** URL change for the "Perlu perhatian" chip: turning it on clears the status, which it replaces. */
export const attentionPatch = (on: boolean): FilterPatch => ({
  [PROJECT_FILTER_PARAMS.attention]: on ? ATTENTION_ON : null,
  [PROJECT_FILTER_PARAMS.status]: null,
});

/** URL change for a status chip (`''` = "Semua"): choosing any status ends "Perlu perhatian". */
export const statusPatch = (slug: string): FilterPatch => ({
  [PROJECT_FILTER_PARAMS.status]: slug,
  [PROJECT_FILTER_PARAMS.attention]: null,
});
