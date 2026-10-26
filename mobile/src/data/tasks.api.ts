/**
 * Everything the Tasks module reads from `/api/app/tasks*`: one `resource` per thing asked for,
 * and the rule from `docs/phase2-pola-data.md` §1 that a second asker joins the request in flight.
 *
 * Why there is a resource *family* and not a single store per screen: the server pages by keyset
 * and filters server-side, so "My tasks" is not one list but one request per schedule group, and
 * the board is one request per column. Each distinct query is its own thing to have on hand, so
 * each gets its own resource, keyed by the query string. `taskLists()` hands the live ones to a
 * write so it can say what it made stale (§2) — a write must never guess which pages exist.
 *
 * Paging is inside the resource rather than in a screen: `more()` asks for the next cursor and
 * appends, while `ensure()`/`reload()` start again from the first page. A cursor the server will
 * not take (`BAD_CURSOR`, after a sort or filter change) is not an error to show — the server's own
 * answer is "load the list from the start", so that is what happens, once, automatically.
 */
import { apiGet } from '@/api/client';
import { isApiError } from '@/api/errors';

import { type Resource, resource } from './resource';
import type {
  WireFormOptions,
  WirePriority,
  WireScheduleGroup,
  WireTaskCounts,
  WireTaskDetail,
  WireTaskPage,
  WireTaskStatus,
  WireTimelinePage,
} from './tasks.api.types';

/** What `GET /api/app/tasks` is asked for. Everything optional is left out of the request entirely. */
export type TaskListParams = {
  scope: 'mine' | 'all' | 'project';
  /** Required by the server when `scope` is `project` (422 otherwise); allowed in any scope. */
  projectId?: string;
  status?: readonly WireTaskStatus[];
  assigneeId?: string;
  priority?: readonly WirePriority[];
  /** Free text; the server matches the title or an exact number (A15). */
  q?: string;
  /** One schedule group. Only open tasks are in one. */
  due?: WireScheduleGroup;
  sort?: string;
  limit?: number;
};

/** A paged resource: the pages fetched so far as one list, plus a way to ask for the next. */
export type Paged<T> = Resource<T> & {
  /** Fetch the next page and append it; a no-op on the last page. */
  more: () => Promise<void>;
};

/**
 * The query string of a list request, in a fixed field order so the same request is the same key.
 * Repeated `status`/`priority` is how the server takes a list (`asList`).
 */
export function taskListQuery(p: TaskListParams): string {
  const q = new URLSearchParams();
  q.set('scope', p.scope);
  if (p.projectId) q.set('projectId', p.projectId);
  for (const s of p.status ?? []) q.append('status', s);
  for (const x of p.priority ?? []) q.append('priority', x);
  if (p.assigneeId) q.set('assigneeId', p.assigneeId);
  if (p.q) q.set('q', p.q);
  if (p.due) q.set('due', p.due);
  if (p.sort) q.set('sort', p.sort);
  if (p.limit) q.set('limit', String(p.limit));
  return q.toString();
}

/**
 * A resource over a keyset-paged endpoint. `fetchPage(cursor)` does one request; the resource keeps
 * the pages it has as one `items` list.
 */
function paged<P extends { items: unknown[]; nextCursor: string | null }>(
  name: string,
  fetchPage: (cursor: string | null) => Promise<P>,
): Paged<P> {
  let items: P['items'] = [];
  /** The cursor the next load should continue from; null = start again from the first page. */
  let from: string | null = null;

  const self: Paged<P> = {
    ...resource<P>(name, async () => {
      const cursor = from;
      from = null;
      let page: P;
      try {
        page = await fetchPage(cursor);
      } catch (cause) {
        // "Halaman daftar tidak dikenali. Muat ulang daftar dari awal." — so do exactly that,
        // rather than showing the user a page number they never chose.
        if (!cursor || !isApiError(cause) || cause.code !== 'BAD_CURSOR') throw cause;
        items = [];
        page = await fetchPage(null);
      }
      items = cursor ? [...items, ...page.items] : page.items;
      return { ...page, items };
    }),
    more: async () => {
      const next = self.current()?.nextCursor;
      if (!next) return;
      from = next;
      await self.reload();
    },
  };
  return self;
}

// One resource per distinct query, so two screens asking the same thing share one request, and a
// write can be told which ones it made stale.
const lists = new Map<string, Paged<WireTaskPage>>();

/** The list for these parameters; the same parameters always give the same resource. */
export function taskList(params: TaskListParams): Paged<WireTaskPage> {
  const query = taskListQuery(params);
  const found = lists.get(query);
  if (found) return found;
  const made = paged<WireTaskPage>(`tasks?${query}`, (cursor) =>
    apiGet<WireTaskPage>(`/api/app/tasks?${query}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`),
  );
  lists.set(query, made);
  return made;
}

/** Every list asked for so far, for a write to invalidate (§2: name everything that may change). */
export const taskLists = (): Paged<WireTaskPage>[] => [...lists.values()];

/** My tasks per schedule group and per status, so a group title or an empty state needs no full list. */
export const taskCounts = resource<WireTaskCounts>('tasks.counts', () =>
  apiGet<WireTaskCounts>('/api/app/tasks/counts'),
);

const details = new Map<string, Resource<WireTaskDetail>>();

/** One task by `ref`: all digits = its global number, anything else = its id. */
export function taskDetail(ref: string | number): Resource<WireTaskDetail> {
  const key = String(ref);
  const found = details.get(key);
  if (found) return found;
  const made = resource<WireTaskDetail>(`tasks/${key}`, () =>
    apiGet<WireTaskDetail>(`/api/app/tasks/${encodeURIComponent(key)}`),
  );
  details.set(key, made);
  return made;
}

/** Every task detail asked for so far. */
export const taskDetails = (): Resource<WireTaskDetail>[] => [...details.values()];

const timelines = new Map<string, Paged<WireTimelinePage>>();

/** Comments and activity of one task, newest first, a page at a time. */
export function taskTimeline(ref: string | number): Paged<WireTimelinePage> {
  const key = String(ref);
  const found = timelines.get(key);
  if (found) return found;
  const path = `/api/app/tasks/${encodeURIComponent(key)}/timeline`;
  const made = paged<WireTimelinePage>(`tasks/${key}/timeline`, (cursor) =>
    apiGet<WireTimelinePage>(`${path}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  );
  timelines.set(key, made);
  return made;
}

/** Every timeline asked for so far. */
export const taskTimelines = (): Paged<WireTimelinePage>[] => [...timelines.values()];

const formOptions = new Map<string, Resource<WireFormOptions>>();

/**
 * The projects a task may be added to, each with its kinds and phases (A12). Without `projectId`
 * that is every such project — what New task needs; with one, only that project, which is what Edit
 * needs and what answers 404 for a project that is gone.
 */
export function taskFormOptions(projectId?: string): Resource<WireFormOptions> {
  const key = projectId ?? '';
  const found = formOptions.get(key);
  if (found) return found;
  const made = resource<WireFormOptions>(`tasks.form-options${key && `?${key}`}`, () =>
    apiGet<WireFormOptions>(
      `/api/app/tasks/form-options${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`,
    ),
  );
  formOptions.set(key, made);
  return made;
}

/** Every form-options answer asked for so far. */
export const taskFormOptionsAll = (): Resource<WireFormOptions>[] => [...formOptions.values()];

/**
 * Drop the resource families, so the next `ensure()` builds them again. For tests: the app itself
 * only ever needs `forgetAllResources()` on sign out, which empties these without removing them.
 */
export function forgetTaskResources(): void {
  for (const r of [...taskLists(), ...taskDetails(), ...taskTimelines(), ...taskFormOptionsAll()])
    r.forget();
  taskCounts.forget();
  lists.clear();
  details.clear();
  timelines.clear();
  formOptions.clear();
}
