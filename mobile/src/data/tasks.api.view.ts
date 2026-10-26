/**
 * The task lists as the screens show them: which requests one list is made of, and that list read
 * back as cards.
 *
 * `getTaskListView()` is synchronous and reads the store, like every `get*()` in Fase 1 (the user's
 * decision, 26 Oct); `ensureTaskListView()` is the one call that fills it. What the screen gets is
 * the shape it already rendered — groups of cards, or the board's four columns — so the screens
 * changed far less than the data layer did.
 *
 * What is deliberately *not* here: any rule about what a viewer may do. The New task button follows
 * `caps.createTask` and each card its own `can{}` (`tasks.api.map.ts`); nothing in this file asks
 * about a role.
 *
 * Two filters the sheet offers are not sent, and the sheet hides them for exactly that reason:
 * Project, because the project list is still the sample one and its ids are not the server's, so
 * `projectId=` would mean a list that is silently empty; and "Title (A–Z)", which the server has no
 * sort for. Both are listed in `docs/phase2-gap-disembunyikan.md`.
 */
import type { ApiError } from '@/api/errors';

import type { ResourcePhase } from './resource';
import { type TaskGroupSpec, type TaskListParams, taskCounts, taskList } from './tasks.api';
import type { TaskListData } from './tasks.api.lists';
import { type CapState, cardOf, type TaskCard } from './tasks.api.map';
import type { WireCap, WireScheduleGroup, WireTaskCounts } from './tasks.api.types';
import {
  CLOSED_GROUPS,
  priorityWire,
  SCHEDULE_GROUPS,
  sortWire,
  statusesOf,
  statusWire,
} from './tasks.api.values';
import { type BoardColumn, COLUMNS } from './tasks.columns';
import {
  PRIORITIES,
  projectOfScope,
  SORT_DUE,
  SORTS,
  type TaskQuery,
  type TaskScope,
} from './tasks.query';
import type { TaskPriority } from './tasks.shared';
import { type Viewer, viewer } from './viewer';

/** Which list to show, and how it is narrowed. */
export type TaskListOptions = {
  scope: TaskScope;
  view: 'list' | 'board';
  query: TaskQuery;
  /** The search box; sent as `q=`, which the server matches on the title or an exact number (A15). */
  search?: string;
  /** Who is signed in, for the "Me" assignee filter. Defaults to the session's viewer. */
  me?: Viewer;
};

/** One titled part of a list on screen. */
export type TaskListGroupView = {
  key: string;
  title: string | null;
  cards: TaskCard[];
  /** The server has another page of this group. */
  hasMore: boolean;
  /** How many the server says are in this group, when it says — not how many are loaded. */
  count: number | null;
};

export type TaskBoardColumnView = BoardColumn & {
  key: string;
  cards: TaskCard[];
  hasMore: boolean;
};

/** none = there is nothing to show at all (New task); noMatch = the filters or search leave nothing. */
export type TasksEmpty = 'none' | 'noMatch' | null;

/** What every list view carries, whichever way it is shown. */
type TasksViewBase = {
  scope: TaskScope;
  query: TaskQuery;
  /** The dot on the filter icon; only the filters that are actually sent count. */
  filtered: boolean;
  phase: ResourcePhase;
  error: ApiError | null;
  empty: TasksEmpty;
  /** How the New task button must be drawn, from `caps.createTask` (B5). */
  createTask: CapState;
};

/** My tasks / All tasks / a project's tab as rows. */
export type TasksRowsView = TasksViewBase & { view: 'list'; groups: TaskListGroupView[] };

/** The same list as the board's four columns. */
export type TasksBoardView = TasksViewBase & { view: 'board'; columns: TaskBoardColumnView[] };

/** The priority a filter index asks for, or none for "All". */
const priorityFilter = (index: number) => {
  const word = PRIORITIES[index];
  return index && word ? [priorityWire(word as TaskPriority)] : undefined;
};

/** Everything a group's request carries except what makes it that group. */
function baseParams(o: TaskListOptions): TaskListParams {
  const projectId = projectOfScope(o.scope) ?? undefined;
  const search = o.search?.trim();
  return {
    scope: projectId ? 'project' : (o.scope as 'mine' | 'all'),
    projectId,
    priority: priorityFilter(o.query.priority),
    assigneeId: o.query.who ? (o.me ?? viewer()).userId : undefined,
    q: search || undefined,
    sort: sortWire(o.query.sort),
  };
}

/** Whether the list is narrowed by something that is actually sent (so the dot does not lie). */
export const isApiFiltered = (q: TaskQuery) => !!(q.status || q.priority || q.who);

/** The four board columns are asked for by status, one request each. */
function boardSpecs(o: TaskListOptions): TaskGroupSpec[] {
  const base = baseParams(o);
  const asked = o.query.status ? statusesOf(o.query.status) : null;
  return COLUMNS.map((c) => ({ column: c, wire: statusWire(c.status) }))
    .filter(({ wire }) => !asked || asked.includes(wire))
    .map(({ column, wire }) => ({
      key: column.status,
      title: column.status,
      params: { ...base, status: [wire] },
    }));
}

/**
 * The requests one list is made of.
 *
 * My tasks sorted by due date is one request per schedule group, as the web does it. Sorted any
 * other way it is one flat list titled by the sort, because the groups are urgency and the order
 * would contradict them. Filtered to Done or Canceled it is also one list: a closed task belongs to
 * no schedule group, so asking `due=` for one would answer nothing at all.
 */
export function taskListSpecs(o: TaskListOptions): TaskGroupSpec[] {
  const base = baseParams(o);
  const status = statusesOf(o.query.status);
  if (o.view === 'board') return boardSpecs(o);
  if (o.scope !== 'mine') return [{ key: 'all', title: null, params: { ...base, status } }];
  if (o.query.sort !== SORT_DUE)
    return [{ key: 'flat', title: SORTS[o.query.sort] ?? null, params: { ...base, status } }];
  const closed = CLOSED_GROUPS.filter((g) => status.includes(g.status));
  if (closed.length === status.length && closed[0])
    return [{ key: status.join('+'), title: closed[0].title, params: { ...base, status } }];
  return SCHEDULE_GROUPS.map((g) => ({
    key: g.group,
    title: g.title,
    params: { ...base, status, due: g.group },
  }));
}

/** The counts of a schedule group, when the group is one and the counts have arrived. */
const countOf = (key: string, counts: WireTaskCounts | null): number | null =>
  counts && key in counts.mine ? counts.mine[key as WireScheduleGroup] : null;

const capStateOf = (cap: WireCap | undefined): CapState =>
  cap === undefined ? 'hidden' : cap === true ? 'on' : 'off';

/** The resources one list reads, so a screen can `use()` them with a hook count that never changes. */
export const taskListOf = (o: TaskListOptions) => taskList(taskListSpecs(o));

/** Fetch what the list needs, unless it is already fresh (§1); safe from every mount. */
export async function ensureTaskListView(o: TaskListOptions): Promise<void> {
  await Promise.all([taskListOf(o).ensure(), taskCounts.ensure()]);
}

/** Fetch it again whatever is there: pull to refresh, and "Try again" after a failure. */
export async function reloadTaskListView(o: TaskListOptions): Promise<void> {
  await Promise.all([taskListOf(o).reload(), taskCounts.reload()]);
}

/** One more page of one group; the rest of the list is refetched from its first page. */
export const moreTaskListGroup = (o: TaskListOptions, key: string): Promise<void> =>
  taskListOf(o).more(key);

/** Whether that group has another page the server will give. */
export const taskListHasMore = (o: TaskListOptions, key: string): boolean =>
  taskListOf(o).hasMore(key);

function groupViews(data: TaskListData | null, counts: WireTaskCounts | null): TaskListGroupView[] {
  return (
    (data?.groups ?? [])
      .map((g) => ({
        key: g.key,
        title: g.title,
        cards: g.items.map(cardOf),
        hasMore: g.nextCursor !== null,
        count: countOf(g.key, counts),
      }))
      // An empty schedule group is left out, as it always has been; the board keeps its columns.
      .filter((g) => g.cards.length > 0)
  );
}

/** Everything both ways of showing a list share; `empty` is filled in by each. */
function viewBase(o: TaskListOptions): Omit<TasksViewBase, 'empty'> & { narrowed: boolean } {
  const list = taskListOf(o).peek();
  const filtered = isApiFiltered(o.query);
  return {
    scope: o.scope,
    query: o.query,
    filtered,
    phase: list.phase,
    error: list.error,
    createTask: capStateOf(list.data?.caps.createTask),
    narrowed: filtered || !!o.search?.trim(),
  };
}

/**
 * The list as rows. Synchronous: it reads the stores and nothing else, so a screen that has data
 * keeps showing it while the next request is out.
 *
 * `empty` stays null until a list has actually arrived — before that there is nothing to be empty
 * about, and saying "no tasks" while the request is still out would be a lie the screen then has to
 * take back.
 */
export function getTaskRowsView(o: TaskListOptions): TasksRowsView {
  const { narrowed, ...base } = viewBase(o);
  const list = taskListOf(o).peek();
  const groups = groupViews(list.data, taskCounts.peek().data);
  const empty: TasksEmpty = groups.length > 0 || !list.data ? null : narrowed ? 'noMatch' : 'none';
  return { ...base, view: 'list', groups, empty };
}

/** The same list as the board's columns; a column the server has nothing for is kept, and empty. */
export function getTaskBoardView(o: TaskListOptions): TasksBoardView {
  const { narrowed, ...base } = viewBase(o);
  const data = taskListOf(o).peek().data;
  const byKey = new Map((data?.groups ?? []).map((g) => [g.key, g]));
  const columns = COLUMNS.map((c) => {
    const group = byKey.get(c.status);
    return {
      ...c,
      key: c.status,
      cards: (group?.items ?? []).map(cardOf),
      hasMore: group?.nextCursor != null,
    };
  });
  const any = columns.some((c) => c.cards.length > 0);
  // An unfiltered board keeps its empty columns, as the prototype did; a narrowed one says so.
  const empty: TasksEmpty = any || !data ? null : narrowed ? 'noMatch' : 'none';
  return { ...base, view: 'board', columns, empty };
}

/** Subscribe to everything a list view reads; one hook count, whatever the filter is. */
function subscribe(o: TaskListOptions): void {
  taskListOf(o).use();
  taskCounts.use();
}

/** The rows in a component, re-rendering when its store or the counts change. */
export function useTaskRowsView(o: TaskListOptions): TasksRowsView {
  subscribe(o);
  return getTaskRowsView(o);
}

/** The board in a component, re-rendering when its store changes. */
export function useTaskBoardView(o: TaskListOptions): TasksBoardView {
  subscribe(o);
  return getTaskBoardView(o);
}
