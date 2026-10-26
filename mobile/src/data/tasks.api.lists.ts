/**
 * The task lists, as one thing a screen has on hand.
 *
 * A list on screen is not one request. The server filters and pages server-side, so My tasks is one
 * request per schedule group (the web does the same), the board one per column, and "All active" is
 * three statuses spelled out. A screen must not know that: `get*()` reads one store (the user's
 * decision, 26 Oct), so one resource stands for one list *as shown* and its `load` fans the
 * requests out in parallel.
 *
 * Paging is per group inside that resource. `more(key)` fetches the next page of one group and
 * leaves the others exactly as they are — refetching eight groups to extend one would be a burst of
 * requests for nothing. `ensure()`/`reload()`/`invalidate()` start every group again from its first
 * page, which is also what a write wants: after a status change a task belongs in another group.
 *
 * A cursor the server will not take (`BAD_CURSOR`, which it answers after a sort or filter change)
 * is not an error to show. Its own message is "load the list from the start", so that is what
 * happens, once, without the screen hearing about it.
 */
import { apiGet } from '@/api/client';
import { isApiError } from '@/api/errors';

import { type Resource, resource } from './resource';
import type { WireCap, WireTaskListItem, WireTaskPage } from './tasks.api.types';
import type {
  WirePriority,
  WireScheduleGroup,
  WireTaskStatus,
} from './tasks.api.types';

/** What `GET /api/app/tasks` is asked for; anything left out is left out of the request. */
export type TaskListParams = {
  scope: 'mine' | 'all' | 'project';
  /** The server requires it when `scope` is `project` (422 otherwise); allowed in any scope. */
  projectId?: string;
  status?: readonly WireTaskStatus[];
  assigneeId?: string;
  priority?: readonly WirePriority[];
  /** Free text; the server matches the title or an exact number (A15). */
  q?: string;
  /** One schedule group. Only an open task belongs to one. */
  due?: WireScheduleGroup;
  sort?: string;
  limit?: number;
};

/** One titled part of a list: the lists' groups, the board's columns. `title: null` = one flat list. */
export type TaskGroupSpec = { key: string; title: string | null; params: TaskListParams };

/** What a group holds now, and whether the server has more of it. */
export type TaskGroupData = {
  key: string;
  title: string | null;
  items: WireTaskListItem[];
  /** null = the last page; anything else is what `more(key)` continues from. */
  nextCursor: string | null;
};

/** A whole list as shown: its groups, and the response-level capabilities that came with them. */
export type TaskListData = {
  groups: TaskGroupData[];
  /** `createTask` absent = no New task button anywhere on this list (B5). */
  caps: { createTask?: WireCap };
};

export type TaskListView = Resource<TaskListData> & {
  /** Fetch the next page of one group and append it; a no-op on its last page. */
  more: (key: string) => Promise<void>;
  /** Whether that group has a next page. */
  hasMore: (key: string) => boolean;
};

/** The query string of one group's request, in a fixed field order so one request is one key. */
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

const pageUrl = (query: string, cursor: string | null) =>
  `/api/app/tasks?${query}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;

/** What to do with one group on the next load. */
type GroupOp = 'reset' | 'more' | 'keep';

/** One group's pages on hand, with the response-level caps they arrived with. */
type Held = { items: WireTaskListItem[]; nextCursor: string | null; caps: TaskListData['caps'] };

function buildView(specs: readonly TaskGroupSpec[], name: string): TaskListView {
  /** The pages already on hand, per group key. */
  const held = new Map<string, Held>();
  /** What the next load does with each group; empty means every group starts again. */
  const ops = new Map<string, GroupOp>();

  const fetchGroup = async (spec: TaskGroupSpec, op: GroupOp): Promise<Held> => {
    const have = held.get(spec.key);
    if (op === 'keep' && have) return have;
    const query = taskListQuery(spec.params);
    const cursor = op === 'more' ? (have?.nextCursor ?? null) : null;
    let page: WireTaskPage;
    try {
      page = await apiGet<WireTaskPage>(pageUrl(query, cursor));
    } catch (cause) {
      if (!cursor || !isApiError(cause) || cause.code !== 'BAD_CURSOR') throw cause;
      page = await apiGet<WireTaskPage>(pageUrl(query, null));
      return { items: page.items, nextCursor: page.nextCursor, caps: page.caps };
    }
    const items = cursor && have ? [...have.items, ...page.items] : page.items;
    return { items, nextCursor: page.nextCursor, caps: page.caps };
  };

  const self: TaskListView = {
    ...resource<TaskListData>(name, async () => {
      const plan = specs.map((spec) => ({ spec, op: ops.get(spec.key) ?? 'reset' }) as const);
      ops.clear();
      const pages = await Promise.all(plan.map(({ spec, op }) => fetchGroup(spec, op)));
      const groups = specs.map((spec, i) => {
        const page = pages[i];
        held.set(spec.key, page);
        return {
          key: spec.key,
          title: spec.title,
          items: page.items,
          nextCursor: page.nextCursor,
        };
      });
      // Every group's response carries the same response-level caps, so the first one speaks for
      // the list. A list with no groups at all (nothing to ask for) has no caps either.
      return { groups, caps: pages[0]?.caps ?? {} };
    }),
    more: async (key) => {
      if (!self.hasMore(key)) return;
      for (const spec of specs) ops.set(spec.key, spec.key === key ? 'more' : 'keep');
      await self.reload();
    },
    hasMore: (key) => Boolean(self.current()?.groups.find((g) => g.key === key)?.nextCursor),
  };
  return self;
}

// One resource per distinct list, so two screens showing the same thing share one request and a
// write can be told which ones it made stale.
const views = new Map<string, TaskListView>();

/** The list these groups make up; the same groups always give the same resource. */
export function taskListView(specs: readonly TaskGroupSpec[]): TaskListView {
  const name = `tasks[${specs.map((s) => `${s.key}:${taskListQuery(s.params)}`).join('|')}]`;
  const found = views.get(name);
  if (found) return found;
  const made = buildView(specs, name);
  views.set(name, made);
  return made;
}

/** Every list asked for so far, for a write to invalidate (§2: name everything that may change). */
export const taskLists = (): TaskListView[] => [...views.values()];

/** Drop the family, so the next `ensure()` builds it again. test-only */
export function forgetTaskLists(): void {
  for (const v of taskLists()) v.forget();
  views.clear();
}
