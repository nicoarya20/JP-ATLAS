/**
 * What the Projects screens read: the list, and the header every detail tab sits under.
 *
 * `getProjectsList()` and `getProjectHeader()` stay **synchronous** and read the stores, exactly as
 * in Phase 1 (the user's decision, 26 Oct 2026) — `ensure*` is the one call that fills them. That
 * is why the screens changed far less than this layer did. The detail tabs are in
 * `projects.detail.ts` and the three forms in `projects.forms.ts`.
 *
 * Gone from here, deliberately: `projectsFor(role)`, which hid other people's projects from a
 * Member. The server clamps `scope=all` to `mine` for a Member by itself
 * (`server/access/project.policy.ts`), so keeping a second copy of that rule in the client could
 * only ever disagree with it.
 */
import type { ApiError } from '@/api/errors';

import { appWhoami, type ProjectListParams, projectDetail, projectList } from './projects.api';
import { cardOf, headerOf, type ProjectCard, type ProjectHeader } from './projects.api.map';
import { sortWire, statusFilter } from './projects.api.values';
import { isFiltered, type ProjectsQuery } from './projects.query';
import type { ResourcePhase } from './resource';

export type { ProjectCard, ProjectHeader } from './projects.api.map';
export {
  getProjectMembers,
  getProjectOverview,
  getProjectPhases,
  getProjectTasks,
} from './projects.detail';

/** none = there are no projects at all; noMatch = the filters or search leave nothing. */
export type ProjectsEmpty = 'none' | 'noMatch' | null;

/** Which list to show, and how it is narrowed. */
export type ProjectsListOptions = { query: ProjectsQuery; search: string };

export type ProjectsList = {
  cards: ProjectCard[];
  /** "12 projects", from the server's `total` — not the number of rows loaded so far. */
  count: string | null;
  empty: ProjectsEmpty;
  /** The dot on the filter icon; only filters that are actually sent count. */
  filtered: boolean;
  phase: ResourcePhase;
  error: ApiError | null;
  /** The server has another page. */
  hasMore: boolean;
  /** `caps.createProject` of `GET /api/app/whoami`: whether New project is offered at all (A-17). */
  mayCreate: boolean;
};

/**
 * The request one list is made of.
 *
 * `scope` is always `mine`, which is the web's own default for this list
 * (`DEFAULT_PROJECT_FILTERS.lingkup = 'saya'`). The route does take `scope=all`, and offering it
 * would give an Admin or a PM the projects they are not a member of — that is GAP B-17, a control
 * this module does not have yet, and it is in `docs/phase2-gap-disembunyikan.md` rather than
 * guessed at here. Which projects a Member may see is clamped server-side either way.
 */
function listParams(o: ProjectsListOptions): ProjectListParams {
  const search = o.search.trim();
  return {
    scope: 'mine',
    status: statusFilter(o.query.status),
    q: search || undefined,
    sort: sortWire(o.query.sort),
    attention: o.query.attention === 1,
  };
}

/** The resource one list reads, so a screen can `use()` it with a hook count that never changes. */
export const projectsListOf = (o: ProjectsListOptions) => projectList(listParams(o));

/** Fetch what the list needs, unless it is already fresh (§1); safe from every mount. */
export async function ensureProjectsList(o: ProjectsListOptions): Promise<void> {
  await Promise.all([projectsListOf(o).ensure(), appWhoami.ensure()]);
}

/** Fetch it again whatever is there: pull to refresh, and "Try again" after a failure. */
export async function reloadProjectsList(o: ProjectsListOptions): Promise<void> {
  await Promise.all([projectsListOf(o).reload(), appWhoami.reload()]);
}

/** One more page of the list. */
export const moreProjects = (o: ProjectsListOptions): Promise<void> => projectsListOf(o).more();

/**
 * Projects ① as the screen shows them.
 *
 * `empty` stays null until a page has actually arrived: saying "no projects" while the request is
 * still out is a lie the screen then has to take back.
 */
export function getProjectsList(o: ProjectsListOptions): ProjectsList {
  const state = projectsListOf(o).peek();
  const narrowed = isFiltered(o.query) || !!o.search.trim();
  const items = state.data?.items ?? [];
  const total = state.data?.total ?? 0;
  return {
    cards: items.map(cardOf),
    count: state.data ? `${total} project${total === 1 ? '' : 's'}` : null,
    empty: items.length > 0 || !state.data ? null : narrowed ? 'noMatch' : 'none',
    filtered: isFiltered(o.query),
    phase: state.phase,
    error: state.error,
    hasMore: projectsListOf(o).hasMore(),
    mayCreate: appWhoami.current()?.caps.createProject ?? false,
  };
}

/** Subscribe to everything the list reads; one hook count, whatever the filter is. */
export function useProjectsList(o: ProjectsListOptions): ProjectsList {
  projectsListOf(o).use();
  appWhoami.use();
  return getProjectsList(o);
}

export type ProjectHeaderView = {
  header: ProjectHeader | null;
  phase: ResourcePhase;
  error: ApiError | null;
  /** The id is gone, in the Trash beyond reach, or not ours to see — the server answers one 404. */
  notFound: boolean;
};

/** Fetch the project behind the route, unless it is already fresh. */
export const ensureProjectHeader = (id: string): Promise<unknown> => projectDetail(id).ensure();

/** Fetch it again: "Try again" after a failure. */
export const reloadProjectHeader = (id: string): Promise<unknown> => projectDetail(id).reload();

/**
 * Header of project `id`.
 *
 * A project that does not exist, one in the Trash that the caller may not reach, and one belonging
 * to someone else all answer the same 404 by design (`server/project/project.query.ts`), so the
 * screen's "Project not found" is right for all three and does not have to tell them apart.
 */
export function getProjectHeader(id: string): ProjectHeaderView {
  const state = projectDetail(id).peek();
  return {
    header: state.data ? headerOf(state.data) : null,
    phase: state.phase,
    error: state.error,
    notFound: state.error?.status === 404,
  };
}

/** The header in a component, re-rendering when its store changes. */
export function useProjectHeader(id: string): ProjectHeaderView {
  projectDetail(id).use();
  return getProjectHeader(id);
}

/** Move to Archive ⑭: the name and what goes along ("5 tasks"), from `taskCounts.live`. */
export function getProjectArchive(id: string): { id: string; name: string; tasks: string } | null {
  const detail = projectDetail(id).current();
  if (!detail) return null;
  const n = detail.taskCounts.live;
  return { id: detail.id, name: detail.name, tasks: `${n} task${n === 1 ? '' : 's'}` };
}
