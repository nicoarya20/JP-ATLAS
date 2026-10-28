import { sessionStore } from '@/session/session.state';

import {
  OPEN_STATUSES,
  PRIORITY_WIRE,
  STATUS_WIRE,
  type TaskSortWire,
  type TaskStatusWire,
} from './tasks.wire';

/*
 * Filter & sort of the task lists (prototype tasks.query.js): the options, the default query per scope, and the request
 * a query makes to /api/app/tasks (the Tasks tab and a project's Tasks tab). The query itself is kept per scope in
 * tasks.query-state.
 */

/** Overlay options; index 0 is the default. */
export const STATUSES = [
  'All active',
  'To do',
  'In progress',
  'In review',
  'Done',
  'Canceled',
] as const;
export const PRIORITIES = ['All', 'High', 'Medium', 'Low'] as const;
/** What the server sorts by; "Title (A–Z)" is gone with it (T-4). */
export const SORTS = ['Due date', 'Priority', 'Recently updated'] as const;
export const SORT_DUE = 0;
/** Assignee filter, only offered on a project's Tasks tab (the Tasks tab has its own My / All switch). */
export const ASSIGNEES = ['Anyone', 'Me'] as const;

/** Which list a query belongs to: My tasks, All tasks, or a project's Tasks tab. */
export type TaskScope = 'mine' | 'all' | `project:${string}`;

/** Indexes into the option lists; `project` is a project id ('' = all projects). */
export type TaskQuery = {
  status: number;
  project: string;
  priority: number;
  sort: number;
  who: number;
};

/** Project id of a project scope, else null. */
export const projectOfScope = (scope: TaskScope) =>
  scope.startsWith('project:') ? scope.slice('project:'.length) : null;

/** Query a list starts with: every project, open tasks, by due date. */
export const baseQuery = (_scope: TaskScope): TaskQuery => ({
  status: 0,
  project: '',
  priority: 0,
  sort: SORT_DUE,
  who: 0,
});

/** The server's sort for each of SORTS. */
const SORT_WIRE: readonly TaskSortWire[] = ['due', 'priority', 'updated'];

/**
 * Statuses a query asks the server for. "All active" names the three open ones: an empty `status`
 * means every status, Done and Canceled included (map §0).
 */
export const queryStatuses = (q: TaskQuery): readonly TaskStatusWire[] =>
  q.status
    ? [STATUS_WIRE[STATUSES[q.status] as Exclude<(typeof STATUSES)[number], 'All active'>]]
    : OPEN_STATUSES;

/** `scope` (and `projectId`) of a list: a project's tab is `scope=project` of that project, whatever `q.project` says. */
function scopePairs(scope: TaskScope, q: TaskQuery): [string, string][] {
  const id = projectOfScope(scope);
  if (id)
    return [
      ['scope', 'project'],
      ['projectId', id],
    ];
  return [['scope', scope], ...(q.project ? [['projectId', q.project] as [string, string]] : [])];
}

/**
 * Assignee "Me" (a project's tab) as the signed-in account's id. Only a signed-in person reaches a
 * list; were there no account, the filter is left out instead of asking for nobody's tasks.
 */
function assigneePairs(q: TaskQuery): [string, string][] {
  const me = q.who ? sessionStore.get().user?.id : undefined;
  return me ? [['assigneeId', me]] : [];
}

/**
 * The query string of `GET /api/app/tasks` for a scope's query and search, without paging. `status`
 * overrides the query's statuses (a board column asks for its own). Parameters keep one order, so
 * the same list is always the same request and the same cached resource.
 */
export function listParams(
  scope: TaskScope,
  q: TaskQuery,
  search: string,
  status: readonly TaskStatusWire[] = queryStatuses(q),
): string {
  const sort = SORT_WIRE[q.sort];
  if (!sort) throw new Error(`Cannot list tasks: no sort #${q.sort}`);
  const priority = PRIORITIES[q.priority];
  const text = search.trim();
  const pairs: [string, string][] = [
    ...scopePairs(scope, q),
    ...status.map((s) => ['status', s] as [string, string]),
    ...(q.priority && priority !== 'All'
      ? [['priority', PRIORITY_WIRE[priority]] as [string, string]]
      : []),
    ...assigneePairs(q),
    ...(text ? [['q', text] as [string, string]] : []),
    ['sort', sort],
  ];
  return pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

/** True when the query narrows the list (the dot on the filter icon); the sort order alone does not count. */
export const isFiltered = (q: TaskQuery) => !!(q.status || q.project || q.priority || q.who);
