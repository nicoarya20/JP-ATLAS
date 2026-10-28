/**
 * `/api/app/projects` reads (map `phase2-map-projects.md` §0, pattern `phase2-pola-data.md`): the list, and
 * per project its detail, members, plan, activity and deadline history.
 *
 * The list pages like Inbox and Team (`inbox.api.ts`, `team.api.ts`) without changing `resource.ts`: the
 * resource holds every page loaded so far; `load()` either appends the next one (`more`) or reloads page one
 * at the size on screen (25 to 100). The server pages by `page` + `limit`, so the next page is asked at an
 * offset equal to what is shown, and rows are de-duplicated by id in case the list moved in between.
 */
import { apiGet } from '@/api/client';
import { sessionStore } from '@/session/session.state';

import { BASE_QUERY, listPath, type ProjectsQuery } from './projects.query';
import type {
  ExtensionsWire,
  ProjectActivityWire,
  ProjectDetailWire,
  ProjectListItemWire,
  ProjectMembersWire,
  ProjectPlanWire,
  ProjectsPageWire,
} from './projects.wire';
import { type Resource, type ResourceState, resource } from './resource';

export const PROJECTS_PAGE = 25;
/** The server clamps `limit` to 100 (`PAGE_LIMIT_MAX`). */
export const PROJECTS_PAGE_MAX = 100;
/** The Overview shows the latest few changes; the rest is the web's activity page. */
export const ACTIVITY_LIMIT = 5;
/** The Phases tab shows the latest extensions; `count` still says how many there were. */
export const EXTENSIONS_LIMIT = 5;

export type ProjectsListData = {
  items: ProjectListItemWire[];
  total: number;
  query: ProjectsQuery;
};

let query: ProjectsQuery = BASE_QUERY;
let more = false;

const page = (q: ProjectsQuery, n: number, limit: number) =>
  apiGet<ProjectsPageWire>(listPath(q, n, limit));

/** Page one, at the size on screen for the same query, asked again while the query keeps changing. */
async function firstPage(had: ProjectsListData | null): Promise<ProjectsListData> {
  for (;;) {
    const asOf = query;
    const shown = had?.query === asOf ? had.items.length : 0;
    const limit = Math.min(PROJECTS_PAGE_MAX, Math.max(PROJECTS_PAGE, shown));
    const answer = await page(asOf, 1, limit);
    if (asOf === query) return { items: answer.items, total: answer.total, query: asOf };
  }
}

/** The page that starts right after the `shown` rows: page n of 25, or page 2 of `shown` after a resized refresh. */
const nextAt = (shown: number) =>
  shown % PROJECTS_PAGE === 0
    ? { n: shown / PROJECTS_PAGE + 1, limit: PROJECTS_PAGE }
    : { n: 2, limit: shown };

async function loadProjects(): Promise<ProjectsListData> {
  const asked = more;
  more = false;
  const had = projectsResource.current();
  const asOf = query;
  const shown = had?.items.length ?? 0;
  if (asked && had?.query === asOf && shown < had.total && shown <= PROJECTS_PAGE_MAX) {
    const at = nextAt(shown);
    const next = await page(asOf, at.n, at.limit);
    if (asOf === query) {
      const seen = new Set(had.items.map((p) => p.id));
      const fresh = next.items.filter((p) => !seen.has(p.id));
      return { ...had, items: [...had.items, ...fresh], total: next.total };
    }
  }
  return firstPage(had);
}

export const projectsResource: Resource<ProjectsListData> = resource<ProjectsListData>(
  'projects',
  loadProjects,
);

/** What the list is asking for now. */
export const getProjectsQuery = (): ProjectsQuery => query;

/** Change the filter, sort or search and reload from page one. */
export function setProjectsQuery(
  next: Partial<ProjectsQuery>,
): Promise<ResourceState<ProjectsListData>> {
  query = { ...query, ...next };
  return projectsResource.reload();
}

/** The next page, appended; nothing while a request is out or when every project is on screen. */
export function loadMoreProjects(): Promise<ResourceState<ProjectsListData>> {
  const state = projectsResource.peek();
  const data = state.data;
  if (state.phase === 'loading' || !data || data.items.length >= data.total)
    return Promise.resolve(state);
  more = true;
  return projectsResource.reload();
}

/** Back to the default filter, sort and search. test-only */
export function resetProjectsQuery(): void {
  query = BASE_QUERY;
  more = false;
}

// The next account starts with the default list, like it starts with no data (`forgetAllResources`).
sessionStore.subscribe(() => {
  if (sessionStore.get().status === 'signed-out') resetProjectsQuery();
});

/**
 * One resource per project and read, kept for the session. Each is in resource()'s registry, so sign out
 * forgets its data; the Map entries stay (a few objects per project opened).
 */
function perProject<T>(kind: string, path: (id: string) => string) {
  const made = new Map<string, Resource<T>>();
  return (id: string): Resource<T> => {
    const known = made.get(id);
    if (known) return known;
    const r = resource<T>(`project:${id}:${kind}`, () => apiGet<T>(path(encodeURIComponent(id))));
    made.set(id, r);
    return r;
  };
}

/** `GET /projects/:id`: the project with its `can{}`; a missing, trashed or hidden id is the same 404. */
export const projectResource = perProject<ProjectDetailWire>(
  'detail',
  (id) => `/api/app/projects/${id}`,
);

/** `GET /projects/:id/members`, managers first. */
export const projectMembersResource = perProject<ProjectMembersWire>(
  'members',
  (id) => `/api/app/projects/${id}/members`,
);

/** `GET /projects/:id/plan`: phases, milestones, the current phase and the next milestone. */
export const projectPlanResource = perProject<ProjectPlanWire>(
  'plan',
  (id) => `/api/app/projects/${id}/plan`,
);

/** `GET /projects/:id/activity`, newest first. */
export const projectActivityResource = perProject<ProjectActivityWire>(
  'activity',
  (id) => `/api/app/projects/${id}/activity?limit=${ACTIVITY_LIMIT}`,
);

/** `GET /projects/:id/extensions`: the latest deadline extensions and how many there were. */
export const projectExtensionsResource = perProject<ExtensionsWire>(
  'extensions',
  (id) => `/api/app/projects/${id}/extensions?limit=${EXTENSIONS_LIMIT}`,
);
