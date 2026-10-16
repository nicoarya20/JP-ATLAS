/**
 * Task list filters in the URL (Indonesian keys and values) and their API query (S2-08, M16).
 * `lingkup=semua` is parsed for everyone; the server decides what a Member may see. `orang=saya`
 * stays a word in the URL so a shared link means "the reader", and becomes an id only in the query.
 */
import type { ScheduleGroup } from '@server/metrics/schedule';
import type { ProjectPriority, TaskStatus } from '@server/pm/enums';
import { TASK_SEARCH_MAX, type TaskListScope, type TaskSort } from '@server/task/task.limits';
import { readEnum, readList, readString } from './use-url-filters';

export const TASK_FILTER_PARAMS = {
  scope: 'lingkup',
  project: 'proyek',
  person: 'orang',
  priority: 'prioritas',
  status: 'status',
  sort: 'urut',
  q: 'q',
} as const;

const SCOPE_SLUGS = { saya: 'mine', semua: 'all' } as const satisfies Record<string, TaskListScope>;
// "Aktif" covers every open status, including review rows that may exist before S4 (P3 §2 Tugas ⑩).
const STATUS_SLUGS = {
  aktif: ['todo', 'in_progress', 'in_review'],
  selesai: ['done'],
  dibatalkan: ['canceled'],
} as const satisfies Record<string, readonly TaskStatus[]>;
export const PRIORITY_SLUGS = {
  rendah: 'low',
  sedang: 'medium',
  tinggi: 'high',
  kritis: 'critical',
} as const satisfies Record<string, ProjectPriority>;
const SORT_SLUGS = {
  tenggat: 'due',
  prioritas: 'priority',
  terbaru: 'updated',
  dibuat: 'created',
} as const satisfies Record<string, TaskSort>;

export type TaskScopeSlug = keyof typeof SCOPE_SLUGS;
export type TaskStatusSlug = keyof typeof STATUS_SLUGS;
export type PrioritySlug = keyof typeof PRIORITY_SLUGS;
export type TaskSortSlug = keyof typeof SORT_SLUGS;

/** `orang=saya`: the signed-in reader, resolved to an id by `toTaskQuery`. */
export const PERSON_ME = 'saya';

export type TaskFilters = {
  lingkup: TaskScopeSlug;
  /** Project id, or null for every project. */
  proyek: string | null;
  /** User id, `PERSON_ME`, or null for anyone. */
  orang: string | null;
  /** Empty = every priority. */
  prioritas: PrioritySlug[];
  status: TaskStatusSlug;
  urut: TaskSortSlug;
  q: string;
};

export const DEFAULT_TASK_FILTERS: TaskFilters = {
  lingkup: 'saya',
  proyek: null,
  orang: null,
  prioritas: [],
  status: 'aktif',
  urut: 'tenggat',
  q: '',
};

/** Page size of one keyset page; the server clamps it to `MAX_PAGE_SIZE` anyway. */
export const TASK_PAGE_SIZE = 30;

const keysOf = <T extends object>(o: T) => Object.keys(o) as (keyof T & string)[];
const isSlug = <T extends object>(o: T, v: string): v is keyof T & string => Object.hasOwn(o, v);

/** URL → filters; unknown values (typos, old links) fall back to the defaults. */
export function parseTaskFilters(sp: URLSearchParams): TaskFilters {
  const P = TASK_FILTER_PARAMS;
  const D = DEFAULT_TASK_FILTERS;
  return {
    lingkup: readEnum(sp, P.scope, keysOf(SCOPE_SLUGS), D.lingkup),
    proyek: readString(sp, P.project) || null,
    orang: readString(sp, P.person) || null,
    prioritas: readList(sp, P.priority).filter((v) => isSlug(PRIORITY_SLUGS, v)),
    status: readEnum(sp, P.status, keysOf(STATUS_SLUGS), D.status),
    urut: readEnum(sp, P.sort, keysOf(SORT_SLUGS), D.urut),
    q: readString(sp, P.q).slice(0, TASK_SEARCH_MAX),
  };
}

/** Filters → URL, leaving defaults out so a clean list has a clean address. */
export function taskFiltersToParams(f: TaskFilters): URLSearchParams {
  const P = TASK_FILTER_PARAMS;
  const D = DEFAULT_TASK_FILTERS;
  const sp = new URLSearchParams();
  if (f.lingkup !== D.lingkup) sp.set(P.scope, f.lingkup);
  if (f.proyek) sp.set(P.project, f.proyek);
  if (f.orang) sp.set(P.person, f.orang);
  if (f.prioritas.length > 0) sp.set(P.priority, f.prioritas.join(','));
  if (f.status !== D.status) sp.set(P.status, f.status);
  if (f.urut !== D.urut) sp.set(P.sort, f.urut);
  if (f.q.trim()) sp.set(P.q, f.q.trim());
  return sp;
}

/** Query for `GET /api/app/tasks` (names from `server/api/app-tasks.schema.ts`); the cursor is added per page. */
export type TaskListQuery = {
  scope: TaskListScope;
  projectId?: string;
  assigneeId?: string;
  status: TaskStatus[];
  priority?: ProjectPriority[];
  q?: string;
  due?: ScheduleGroup;
  sort: TaskSort;
  limit: number;
};

export type TaskQueryContext = {
  /** The signed-in user, for `orang=saya`. */
  viewerId: string;
  /** Project tab (S2-14): the list is pinned to this project and the scope/project filters are ignored. */
  lockedProjectId?: string;
  limit?: number;
};

export function toTaskQuery(f: TaskFilters, ctx: TaskQueryContext): TaskListQuery {
  const projectId = ctx.lockedProjectId ?? f.proyek ?? undefined;
  const assigneeId = f.orang === PERSON_ME ? ctx.viewerId : (f.orang ?? undefined);
  const q = f.q.trim();
  return {
    scope: ctx.lockedProjectId ? 'project' : SCOPE_SLUGS[f.lingkup],
    ...(projectId ? { projectId } : {}),
    ...(assigneeId ? { assigneeId } : {}),
    status: [...STATUS_SLUGS[f.status]],
    ...(f.prioritas.length > 0 ? { priority: f.prioritas.map((p) => PRIORITY_SLUGS[p]) } : {}),
    ...(q ? { q } : {}),
    sort: SORT_SLUGS[f.urut],
    limit: ctx.limit ?? TASK_PAGE_SIZE,
  };
}

/** URL keys that narrow the list; "Hapus saringan" clears exactly these (scope and sort stay). */
export const TASK_NARROWING_PARAMS = [
  TASK_FILTER_PARAMS.status,
  TASK_FILTER_PARAMS.project,
  TASK_FILTER_PARAMS.person,
  TASK_FILTER_PARAMS.priority,
  TASK_FILTER_PARAMS.q,
] as const;

/**
 * True when a status chip other than "Aktif", a project, person, priority or search narrows the
 * list, so an empty result says "no match" and offers "Hapus saringan" instead of the first-use text.
 */
export function hasTaskFilters(f: TaskFilters, opts: { lockedProjectId?: string } = {}): boolean {
  return (
    f.status !== DEFAULT_TASK_FILTERS.status ||
    (!opts.lockedProjectId && f.proyek !== null) ||
    f.orang !== null ||
    f.prioritas.length > 0 ||
    f.q.trim() !== ''
  );
}

/** "Tugas saya" is shown in schedule groups; only open tasks belong to one, and a project tab is a plain list. */
export function isGroupedView(f: TaskFilters, opts: { lockedProjectId?: string } = {}): boolean {
  return !opts.lockedProjectId && f.lingkup === 'saya' && f.status === 'aktif';
}
