/**
 * The task lists, as one thing a screen has on hand.
 *
 * A list on screen is not one request. The server filters and pages server-side, so My tasks is one
 * request per schedule group (the web does the same), the board one per column, and "All active" is
 * three statuses spelled out. A screen must not have to know that: `get*()` reads one store (the
 * user's decision, 26 Oct), so one resource stands for one list *as shown*, its `load` fans the
 * requests out in parallel, and a screen reads one `phase` and one `error`.
 *
 * Paging is per group inside that resource, and the intent to page can only ever *add* work. A
 * `more(key)` records that one group should continue from its cursor; every group not named starts
 * again from its first page. So an intent that is left behind — `reload()` joins a request already
 * in flight, so one can be — makes a later load page one extra group forward, never makes it keep
 * rows it was supposed to refetch. That asymmetry is the whole point: a group quietly frozen on
 * stale rows is the failure `docs/phase2-pola-data.md` §2 is about, and no saving in requests is
 * worth it. The cost is that extending one group refetches the first page of the others — at most
 * eight requests, in the rarest interaction either list has.
 */
import { apiGet } from '@/api/client';

import { type Resource, resource } from './resource';
import { isBadCursor, settled } from './tasks.api.paging';
import type {
  WireCap,
  WirePriority,
  WireScheduleGroup,
  WireTaskListItem,
  WireTaskPage,
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

/** One titled part of a list: a schedule group, a board column, or `title: null` for a flat list. */
export type TaskGroupSpec = { key: string; title: string | null; params: TaskListParams };

/** What one group holds now, and whether the server has more of it. */
export type TaskGroupPage = {
  key: string;
  title: string | null;
  items: WireTaskListItem[];
  /** null = the last page; anything else is what `more(key)` continues from. */
  nextCursor: string | null;
};

/** A whole list as shown: its groups, and the response-level capabilities they came with. */
export type TaskListData = {
  groups: TaskGroupPage[];
  /** `createTask` absent = no New task button anywhere on this list (B5). */
  caps: { createTask?: WireCap };
};

export type TaskListResource = Resource<TaskListData> & {
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

/** One group's pages on hand, with the response-level caps they arrived with. */
type Held = { items: WireTaskListItem[]; nextCursor: string | null; caps: TaskListData['caps'] };

function build(specs: readonly TaskGroupSpec[], name: string): TaskListResource {
  /** The pages already on hand, per group key. */
  const held = new Map<string, Held>();
  /** The groups a `more()` asked to continue; everything else starts from its first page. */
  const paging = new Set<string>();

  const fetchGroup = async (spec: TaskGroupSpec, pageOn: boolean): Promise<Held> => {
    const have = held.get(spec.key);
    const query = taskListQuery(spec.params);
    const cursor = pageOn ? (have?.nextCursor ?? null) : null;
    let page: WireTaskPage;
    try {
      page = await apiGet<WireTaskPage>(pageUrl(query, cursor));
    } catch (cause) {
      if (!cursor || !isBadCursor(cause)) throw cause;
      page = await apiGet<WireTaskPage>(pageUrl(query, null));
      return { items: page.items, nextCursor: page.nextCursor, caps: page.caps };
    }
    const items = cursor && have ? [...have.items, ...page.items] : page.items;
    return { items, nextCursor: page.nextCursor, caps: page.caps };
  };

  const self: TaskListResource = {
    ...resource<TaskListData>(name, async () => {
      // A `forget()` empties the store without reaching these pages, so they go with it.
      if (self.peek().data === null) held.clear();
      const pageOn = new Set(paging);
      paging.clear();
      const pages = await Promise.all(specs.map((s) => fetchGroup(s, pageOn.has(s.key))));
      const groups = specs.map((spec, i) => {
        const page = pages[i] as Held;
        held.set(spec.key, page);
        return {
          key: spec.key,
          title: spec.title,
          items: page.items,
          nextCursor: page.nextCursor,
        };
      });
      // Every group's response carries the same response-level caps, so the first one speaks for
      // the list. A list with no groups at all has no caps either.
      return { groups, caps: pages[0]?.caps ?? {} };
    }),
    more: async (key) => {
      await settled(self);
      if (!self.hasMore(key)) return;
      paging.add(key);
      await self.reload();
    },
    hasMore: (key) => Boolean(self.current()?.groups.find((g) => g.key === key)?.nextCursor),
  };
  return self;
}

// One resource per distinct list, so two screens showing the same thing share one request and a
// write can be told which ones it made stale.
const views = new Map<string, TaskListResource>();

/** The list these groups make up; the same groups always give the same resource. */
export function taskList(specs: readonly TaskGroupSpec[]): TaskListResource {
  const name = `tasks[${specs.map((s) => `${s.key}:${taskListQuery(s.params)}`).join('|')}]`;
  const found = views.get(name);
  if (found) return found;
  const made = build(specs, name);
  views.set(name, made);
  return made;
}

/** Every list asked for so far, for a write to invalidate (§2: name everything that may change). */
export const taskLists = (): TaskListResource[] => [...views.values()];

/** Drop the family, so the next `ensure()` builds it again. test-only */
export function forgetTaskLists(): void {
  for (const v of taskLists()) v.forget();
  views.clear();
}
