/**
 * The Tasks tab's lists from the server: My tasks grouped by when they are due, All tasks as one
 * list, or the board's four columns (map `phase2-map-tasks.md` §1).
 *
 * My tasks is **one** paged request, not one per group: the server sorts by due date with no date
 * last, so the groups come in order and a page boundary only ever splits the last one. The group of
 * a row is worked out here with the server's own boundaries (`server/metrics/schedule.ts`: "This
 * week" ends on Sunday, never before tomorrow). The board asks each column for its own status, so a
 * long Done column cannot push To do off the first page (T-13: four requests).
 *
 * Counts never run ahead of what is known (K6): a heading shows the server's count when the list is
 * my unfiltered tasks, the number of rows when every page is in, and "25+" while more are left.
 */
import { useEffect } from 'react';

import type { ApiError } from '@/api/errors';

import { today } from './clock';
import { daysBetween, daysToSunday } from './dates';
import type { ResourcePhase, ResourceState } from './resource';
import { taskListResource, tasksCountsResource } from './tasks.api';
import { apiCard, type TaskCard } from './tasks.card';
import { type BoardColumn, COLUMNS } from './tasks.columns';
import {
  isFiltered,
  listParams,
  queryStatuses,
  type ServerScope,
  SORT_DUE,
  SORTS,
  STATUSES,
  type TaskQuery,
} from './tasks.query';
import {
  type ScheduleGroupWire,
  STATUS_WIRE,
  type TaskCountsWire,
  type TaskListItemWire,
  type TaskListPageWire,
} from './tasks.wire';

/** none = the list has no tasks at all (New task); noMatch = the query or search leaves nothing (Reset). */
export type TasksEmpty = 'none' | 'noMatch' | null;

/** Where a list (or a column) stands: loading, failed with the server's error, more pages left. */
export type PageView = {
  params: string;
  phase: ResourcePhase;
  /** Nothing to show yet: the screen shows Loading or the failure instead of rows. */
  blank: boolean;
  error: ApiError | null;
  more: boolean;
};

export type TaskGroupView = { key: string; title: string | null; count: string; tasks: TaskCard[] };

export type BoardColumnView = BoardColumn & {
  cards: TaskCard[];
  count: string;
  /** Null for a column the status filter leaves out: nothing is asked for it. */
  page: PageView | null;
};

type ViewBase = {
  scope: ServerScope;
  query: TaskQuery;
  /** The dot on the filter icon. */
  filtered: boolean;
  empty: TasksEmpty;
  /** The server lets the viewer add a task (`caps.createTask`); false until it said so. */
  canAdd: boolean;
};

export type TasksListView = ViewBase &
  (
    | { view: 'list'; groups: TaskGroupView[]; page: PageView }
    | { view: 'board'; columns: BoardColumnView[] }
  );

export const GROUP_TITLE: Record<ScheduleGroupWire, string> = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  week: 'This week',
  later: 'Later',
  none: 'No date',
};
const GROUP_ORDER = Object.keys(GROUP_TITLE) as ScheduleGroupWire[];

/** The schedule group of an open task, with the server's boundaries (K1: the server's today). */
export function scheduleGroupOf(dueDate: string | null, day: string = today()): ScheduleGroupWire {
  if (dueDate === null) return 'none';
  const d = daysBetween(day, dueDate);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  // d ≥ 2 here, so a Saturday or Sunday (Sunday at most a day away) has no "This week".
  return d <= daysToSunday(day) ? 'week' : 'later';
}

const countOf = (n: number, more: boolean) => (more ? `${n}+` : String(n));

const pageOf = (params: string, s: ResourceState<TaskListPageWire>): PageView => ({
  params,
  phase: s.phase,
  blank: s.data === null,
  error: s.error,
  more: !!s.data?.nextCursor,
});

/** A filter or a search leaves tasks out: an empty list then says so, with Reset. */
const narrowed = (q: TaskQuery, search: string) => isFiltered(q) || !!search.trim();

/** "My tasks, nothing narrowed": the only list the server's counts describe. */
const plainMine = (scope: ServerScope, q: TaskQuery, search: string) =>
  scope === 'mine' && !narrowed(q, search);

function myGroups(
  items: readonly TaskListItemWire[],
  q: TaskQuery,
  more: boolean,
  counts: TaskCountsWire | null,
): TaskGroupView[] {
  const cards = (rows: readonly TaskListItemWire[]) => rows.map(apiCard);
  if (q.sort !== SORT_DUE)
    return [
      {
        key: 'sorted',
        title: SORTS[q.sort],
        count: countOf(items.length, more),
        tasks: cards(items),
      },
    ];
  const closed = STATUSES[q.status];
  if (closed === 'Done' || closed === 'Canceled') {
    return [
      { key: closed, title: closed, count: countOf(items.length, more), tasks: cards(items) },
    ];
  }
  const day = today();
  const groups = GROUP_ORDER.map((g) => ({
    g,
    rows: items.filter((t) => scheduleGroupOf(t.dueDate, day) === g),
  })).filter((x) => x.rows.length);
  return groups.map(({ g, rows }, i) => {
    // Only the last group can still continue on the next page: the rows come sorted by due date.
    const open = more && i === groups.length - 1;
    return {
      key: g,
      title: GROUP_TITLE[g],
      count: counts ? String(counts.mine[g]) : countOf(rows.length, open),
      tasks: cards(rows),
    };
  });
}

/** The statuses a board column asks for, or null when the status filter leaves it out. */
const columnStatus = (q: TaskQuery, c: BoardColumn) => {
  const wire = STATUS_WIRE[c.status];
  return q.status && !queryStatuses(q).includes(wire) ? null : [wire];
};

type ListOptions = { scope: ServerScope; query: TaskQuery; search: string };

/** My tasks or All tasks as a list, kept up to date: fetches what is missing. */
export function useTasksList({
  scope,
  query,
  search,
}: ListOptions): TasksListView & { view: 'list' } {
  const params = listParams(scope, query, search);
  const res = taskListResource(params);
  const state = res.use();
  const plain = plainMine(scope, query, search);
  const counts = tasksCountsResource.use().data;
  useEffect(() => {
    void res.ensure();
  }, [res]);
  useEffect(() => {
    if (plain) void tasksCountsResource.ensure();
  }, [plain]);
  const page = pageOf(params, state);
  const items = state.data?.items ?? [];
  const groups =
    scope === 'mine'
      ? myGroups(items, query, page.more, plain && query.sort === SORT_DUE ? counts : null)
      : items.length
        ? [
            {
              key: 'all',
              title: null,
              count: countOf(items.length, page.more),
              tasks: items.map(apiCard),
            },
          ]
        : [];
  const ready = state.phase === 'ready' || (state.phase === 'loading' && !page.blank);
  return {
    view: 'list',
    scope,
    query,
    filtered: isFiltered(query),
    empty: ready && !items.length ? (narrowed(query, search) ? 'noMatch' : 'none') : null,
    canAdd: state.data?.caps.createTask === true,
    groups,
    page,
  };
}

/** My tasks or All tasks as a board: one request per column the status filter keeps. */
export function useTasksBoard({
  scope,
  query,
  search,
}: ListOptions): TasksListView & { view: 'board' } {
  const asked = COLUMNS.map((c) => {
    const status = columnStatus(query, c);
    const params = listParams(scope, query, search, status ?? [STATUS_WIRE[c.status]]);
    return { c, status, params, res: taskListResource(params) };
  });
  // Always four, in column order: a fixed number of hooks.
  const states = [asked[0].res.use(), asked[1].res.use(), asked[2].res.use(), asked[3].res.use()];
  const plain = plainMine(scope, query, search);
  const counts = tasksCountsResource.use().data;
  // The columns' requests, as one value an effect can depend on ('' = a column not asked).
  const keys = asked.map((a) => (a.status ? a.params : '')).join('\n');
  useEffect(() => {
    for (const params of keys.split('\n')) if (params) void taskListResource(params).ensure();
  }, [keys]);
  useEffect(() => {
    if (plain) void tasksCountsResource.ensure();
  }, [plain]);
  const columns = asked.map(({ c, status, params }, i): BoardColumnView => {
    if (!status) return { ...c, cards: [], count: '0', page: null };
    const page = pageOf(params, states[i]);
    const items = states[i].data?.items ?? [];
    const wire = STATUS_WIRE[c.status];
    return {
      ...c,
      cards: items.map(apiCard),
      count: plain && counts ? String(counts.byStatus[wire]) : countOf(items.length, page.more),
      page,
    };
  });
  const pages = columns.flatMap((c) => (c.page ? [c.page] : []));
  const settled = pages.every((p) => !p.blank);
  const total = columns.reduce((n, c) => n + c.cards.length, 0);
  return {
    view: 'board',
    scope,
    query,
    filtered: isFiltered(query),
    // An empty board without filters keeps its empty columns; a narrowed one says so, with Reset (UX §4).
    empty: settled && !total && narrowed(query, search) ? 'noMatch' : null,
    canAdd: states.some((s) => s.data?.caps.createTask === true),
    columns,
  };
}
