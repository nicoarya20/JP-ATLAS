/**
 * Everything the Projects module reads from `/api/app/projects*`: one `resource` per thing asked
 * for, and nothing about how it is shown.
 *
 * Shapes follow `docs/phase2-pola-data.md` §6. The detail, the plan, the members, the activity and
 * the deadline history are each "one per project id", so each is a keyed **family**: two screens
 * asking for the same project share one request, and a write can be handed the live ones so it
 * names exactly what it made stale (§2) instead of guessing which ids are loaded.
 *
 * The list is one resource per query, which is how the Tasks module does it too. The families grow
 * for as long as the app runs; `invalidate()` skips anything never loaded, so a write only refetches
 * what somebody actually looked at. It is still unbounded, and still worth an LRU before a sixth
 * module adds a family of its own — written down in the handover rather than fixed here, because
 * the shared foundation is frozen this wave.
 *
 * `whoami` is the odd one out: it is app-wide, not a project read. It lives here because this wave
 * may only touch `projects*` files, and it is the module that needs it — `caps.createProject` is
 * what decides whether New project is offered (GAP A-17, closed by `server/api/app-whoami.ts`).
 * It belongs in a shared data module as soon as a second module wants it.
 */
import { apiGet } from '@/api/client';
import { isApiError } from '@/api/errors';

import { cursorPaged, offsetPaged, type Paged } from './projects.api.paging';
import type {
  WireActivityItem,
  WireActivityPage,
  WireExtensionList,
  WireMemberList,
  WirePickerList,
  WireProjectDetail,
  WireProjectListItem,
  WireProjectPage,
  WireProjectPlan,
  WireWhoami,
} from './projects.api.types';
import { type Resource, resource } from './resource';

/** How the list narrows itself; every field is a parameter the server actually has. */
export type ProjectListParams = {
  scope: 'mine' | 'all';
  status?: string;
  /** The search box, matched by the server against the project **name** only (GAP A-6). */
  q?: string;
  sort?: string;
  /** `perhatian=1`: active projects that are at risk or late, as one bucket (GAP A-3). */
  attention?: boolean;
};

/** The query string of a list request, with the parameters in a fixed order so the key is stable. */
export function projectListQuery(p: ProjectListParams, page: number): string {
  const search = new URLSearchParams({ scope: p.scope });
  if (p.status) search.set('status', p.status);
  if (p.q) search.set('q', p.q);
  if (p.sort) search.set('sort', p.sort);
  if (p.attention) search.set('perhatian', '1');
  if (page > 1) search.set('page', String(page));
  return search.toString();
}

const lists = new Map<string, Paged<WireProjectPage>>();

/** One list as the server pages it: `more()` asks for the next page and appends it. */
export function projectList(params: ProjectListParams): Paged<WireProjectPage> {
  const key = projectListQuery(params, 1);
  const found = lists.get(key);
  if (found) return found;
  const made = offsetPaged<WireProjectListItem, WireProjectPage>(`projects?${key}`, (page) =>
    apiGet<WireProjectPage>(`/api/app/projects?${projectListQuery(params, page)}`),
  );
  lists.set(key, made);
  return made;
}

/** Every list asked for so far, for a write to mark stale. */
export const projectLists = (): Paged<WireProjectPage>[] => [...lists.values()];

/** One keyed family: a resource per project id, built on first ask. */
function family<T>(
  store: Map<string, Resource<T>>,
  name: (id: string) => string,
  load: (id: string) => Promise<T>,
) {
  return (id: string): Resource<T> => {
    const found = store.get(id);
    if (found) return found;
    const made = resource<T>(name(id), () => load(id));
    store.set(id, made);
    return made;
  };
}

const path = (id: string, rest = '') => `/api/app/projects/${encodeURIComponent(id)}${rest}`;

const details = new Map<string, Resource<WireProjectDetail>>();
const plans = new Map<string, Resource<WireProjectPlan>>();
const members = new Map<string, Resource<WireMemberList>>();
const extensions = new Map<string, Resource<WireExtensionList>>();
const activities = new Map<string, Paged<WireActivityPage>>();

/** One project with its `can{}`. A missing, trashed or hidden id all answer the same 404. */
export const projectDetail = family(
  details,
  (id) => `projects/${id}`,
  (id) => apiGet<WireProjectDetail>(path(id)),
);

/** Phases with their task counts, milestones, the next milestone and the running phase, in one call. */
export const projectPlan = family(
  plans,
  (id) => `projects/${id}/plan`,
  (id) => apiGet<WireProjectPlan>(path(id, '/plan')),
);

/** Members of a project, managers first then by name. Not paged: the list is capped by its own rules. */
export const projectMembers = family(
  members,
  (id) => `projects/${id}/members`,
  (id) => apiGet<WireMemberList>(path(id, '/members')),
);

/** Deadline history, newest first, with the full `total` beside the page. */
export const projectExtensions = family(
  extensions,
  (id) => `projects/${id}/extensions`,
  (id) => apiGet<WireExtensionList>(path(id, '/extensions')),
);

/** A forged or stale activity cursor is answered with `422 VALIDATION`; the list just starts over. */
const isRefusedActivityCursor = (cause: unknown): boolean =>
  isApiError(cause) && cause.code === 'VALIDATION';

/** Latest changes of one project, newest first, a page at a time. */
export function projectActivity(id: string): Paged<WireActivityPage> {
  const found = activities.get(id);
  if (found) return found;
  const made = cursorPaged<WireActivityItem, WireActivityPage>(
    `projects/${id}/activity`,
    (cursor) =>
      apiGet<WireActivityPage>(
        path(id, `/activity${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
      ),
    isRefusedActivityCursor,
  );
  activities.set(id, made);
  return made;
}

const pickers = new Map<string, Resource<WirePickerList>>();

/**
 * The people a project may pick from: `?projectId=` for one project's "+ Member" (which leaves out
 * those already in it), and without it the candidates a new project may start with. Keyed because
 * the two answers are different lists.
 */
export function projectPicker(projectId?: string): Resource<WirePickerList> {
  const key = projectId ?? '';
  const found = pickers.get(key);
  if (found) return found;
  const made = resource<WirePickerList>(`team.picker${key && `?${key}`}`, () =>
    apiGet<WirePickerList>(
      `/api/app/team/picker${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`,
    ),
  );
  pickers.set(key, made);
  return made;
}

/**
 * What the app as a whole lets the caller do. Asked once per session, as the endpoint's own comment
 * says it is meant to be: whether somebody may start a project does not change from one page of the
 * list to the next.
 */
export const appWhoami = resource<WireWhoami>('whoami', () =>
  apiGet<WireWhoami>('/api/app/whoami'),
);

/** Every project read asked for so far, by kind, so a write can name what it touched. */
export const projectReads = {
  details: () => [...details.values()],
  plans: () => [...plans.values()],
  members: () => [...members.values()],
  extensions: () => [...extensions.values()],
  activities: () => [...activities.values()],
  pickers: () => [...pickers.values()],
};

/**
 * Drop the families, so the next `ensure()` builds them again. For tests: the app itself only ever
 * needs `forgetAllResources()` on sign out, which empties these without removing them.
 */
export function forgetProjectResources(): void {
  for (const r of [
    ...projectLists(),
    ...projectReads.details(),
    ...projectReads.plans(),
    ...projectReads.members(),
    ...projectReads.extensions(),
    ...projectReads.activities(),
    ...projectReads.pickers(),
    appWhoami,
  ]) {
    r.forget();
  }
  lists.clear();
  details.clear();
  plans.clear();
  members.clear();
  extensions.clear();
  activities.clear();
  pickers.clear();
}
