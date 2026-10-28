/**
 * `/api/app/tasks` for the Tasks tab: the paged lists and board columns, the counts, the projects
 * the filter offers, and the board's moves (map `phase2-map-tasks.md` §0–§1, pattern
 * `phase2-pola-data.md`).
 *
 * One resource per request (`listParams`), so switching a filter back shows what was loaded
 * without a blank frame. Paging follows the Inbox (`inbox.api.ts`, resource.ts untouched): a list
 * holds every page loaded so far; `loadMoreTasks` appends the next one, and any other load (ensure,
 * reload, the invalidate after a write) asks for page one again, as long as what is on screen (25
 * to 100 rows). A `BAD_CURSOR` while loading more starts over from page one, as the server's own
 * message asks. Only the last LIST_CACHE lists are kept; an older one is forgotten, so a write does
 * not refetch every filter the person ever tried.
 */
import { apiGet, apiPost } from '@/api/client';
import { type ApiError, isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { homeResource } from './home.api';
import { inboxCountResource } from './inbox.api';
import { invalidateAll, type Resource, type ResourceState, resource } from './resource';
import { moveActionOf, type TaskCard } from './tasks.card';
import type { BoardStatus } from './tasks.columns';
import {
  type FilterProjectsPageWire,
  STATUS_WIRE,
  type TaskCountsWire,
  type TaskListPageWire,
  type TaskTransitionWire,
} from './tasks.wire';

export const TASKS_PAGE = 25;
/** The server's `PAGE_LIMIT_MAX`; a refresh never asks for more than this in one request. */
export const TASKS_PAGE_MAX = 100;
/** Lists kept loaded: the Tasks tab shows at most a board (four) and remembers the last few. */
export const LIST_CACHE = 12;

type Paged = { res: Resource<TaskListPageWire>; wantMore: () => void };

const pageUrl = (params: string, limit: number, cursor?: string) =>
  `/api/app/tasks?${params}&limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;

function pagedResource(params: string): Paged {
  let more = false;
  let res: Resource<TaskListPageWire>;
  const first = () => {
    const shown = res.current()?.items.length ?? 0;
    const limit = Math.min(TASKS_PAGE_MAX, Math.max(TASKS_PAGE, shown));
    return apiGet<TaskListPageWire>(pageUrl(params, limit));
  };
  const load = async (): Promise<TaskListPageWire> => {
    const asked = more;
    more = false;
    const had = res.current();
    if (!asked || !had?.nextCursor) return first();
    try {
      const next = await apiGet<TaskListPageWire>(pageUrl(params, TASKS_PAGE, had.nextCursor));
      return { ...next, items: [...had.items, ...next.items] };
    } catch (e) {
      if (isApiError(e) && e.code === 'BAD_CURSOR') return first();
      throw e;
    }
  };
  res = resource<TaskListPageWire>(`tasks:list:${params}`, load);
  return { res, wantMore: () => (more = true) };
}

// Insertion order is use order: a list read again moves to the end, the first one is the oldest.
const lists = new Map<string, Paged>();

function paged(params: string): Paged {
  const had = lists.get(params);
  if (had) {
    lists.delete(params);
    lists.set(params, had);
    return had;
  }
  const made = pagedResource(params);
  lists.set(params, made);
  if (lists.size > LIST_CACHE) {
    const [oldest, old] = lists.entries().next().value as [string, Paged];
    lists.delete(oldest);
    old.res.forget();
  }
  return made;
}

/** The list (or board column) a query string asks for (`listParams`). */
export const taskListResource = (params: string): Resource<TaskListPageWire> => paged(params).res;

/**
 * The next page of a list, appended. Does nothing while a request is out (the button is busy then)
 * or when there is no next page; a failure keeps the rows that were there.
 */
export function loadMoreTasks(params: string): Promise<ResourceState<TaskListPageWire>> {
  const { res, wantMore } = paged(params);
  const state = res.peek();
  if (state.phase === 'loading' || !state.data?.nextCursor) return Promise.resolve(state);
  wantMore();
  return res.reload();
}

/** My open tasks per schedule group, and all mine per status (headings, Home's In progress chip). */
export const tasksCountsResource = resource<TaskCountsWire>('tasks:counts', () =>
  apiGet<TaskCountsWire>('/api/app/tasks/counts'),
);

/** Projects the filter offers, by name. The server caps a page at 100 (gap §4: more are not offered). */
export const filterProjectsResource = resource<FilterProjectsPageWire>(
  'tasks:filter-projects',
  () =>
    apiGet<FilterProjectsPageWire>(`/api/app/projects?scope=all&sort=name&limit=${TASKS_PAGE_MAX}`),
);

/**
 * Everything a task write can make wrong (pattern rule 2): every list still kept, the counts, Home
 * (its chips, My Focus and agenda read the same tasks) and the Inbox count (a card that asked for
 * this task can be settled by it). One not loaded yet is skipped by `invalidate` itself.
 */
export const taskWriteTargets = (): Resource<unknown>[] => [
  ...[...lists.values()].map((p) => p.res as Resource<unknown>),
  tasksCountsResource as Resource<unknown>,
  homeResource as Resource<unknown>,
  inboxCountResource as Resource<unknown>,
];

/** A write outside a resource reports its failure to the session itself (pattern §3). */
export async function postTask<T>(path: string, body?: unknown): Promise<T> {
  try {
    return await apiPost<T>(path, body);
  } catch (e) {
    if (isApiError(e)) applyApiError(e);
    throw e;
  }
}

export type MoveResult = { moved: number; failed: ApiError[]; skipped: number };

/**
 * Moves the board's `cards` to `to`, one workflow step each (`start`, `unstart`, `complete`), all at
 * once. A card the move does not apply to (already there, or no step its `can{}` allows) is skipped,
 * not failed. Lists, counts and Home are refreshed when at least one moved.
 */
export async function moveOnServer(
  cards: readonly TaskCard[],
  to: BoardStatus,
): Promise<MoveResult> {
  const steps = cards.flatMap((c) => {
    const action = c.moves.includes(to) ? moveActionOf(STATUS_WIRE[c.status], to) : null;
    if (!action) return [];
    if (!c.id) throw new Error(`Cannot move task #${c.no} on the server: it has no id`);
    return [`/api/app/tasks/${encodeURIComponent(c.id)}/${action}`];
  });
  const done = await Promise.allSettled(steps.map((path) => postTask<TaskTransitionWire>(path)));
  const moved = done.filter((r) => r.status === 'fulfilled').length;
  if (moved) invalidateAll(taskWriteTargets());
  const failed: ApiError[] = [];
  for (const r of done) {
    if (r.status === 'fulfilled') continue;
    // Not a server answer (a bug in this app): raise it as it is rather than hide it in a count.
    if (!isApiError(r.reason)) throw r.reason;
    failed.push(r.reason);
  }
  return { moved, failed, skipped: cards.length - steps.length };
}

/** Every list dropped. test-only */
export const resetTaskLists = () => {
  for (const p of lists.values()) p.res.forget();
  lists.clear();
};
