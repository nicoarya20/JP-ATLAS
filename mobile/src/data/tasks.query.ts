import { findProject } from './projects.state';
import { assigned, dueIn, isOpen, type TaskItem, type TaskPriority } from './tasks.shared';
import {
  OPEN_STATUSES,
  PRIORITY_WIRE,
  STATUS_WIRE,
  type TaskSortWire,
  type TaskStatusWire,
} from './tasks.wire';

/*
 * Filter & sort of the task lists (prototype tasks.query.js): the options, the default query per scope, the request a
 * query makes to /api/app/tasks (Tasks tab), and applying a query to the sample tasks (a project's Tasks tab, until
 * Projects is wired). The query itself is kept per scope in tasks.query-state.
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

/** The scopes the Tasks tab reads from the server; a project's tab still reads the sample. */
export type ServerScope = 'mine' | 'all';

/**
 * Statuses a query asks the server for. "All active" names the three open ones: an empty `status`
 * means every status, Done and Canceled included (map §0).
 */
export const queryStatuses = (q: TaskQuery): readonly TaskStatusWire[] =>
  q.status
    ? [STATUS_WIRE[STATUSES[q.status] as Exclude<(typeof STATUSES)[number], 'All active'>]]
    : OPEN_STATUSES;

/**
 * The query string of `GET /api/app/tasks` for a scope's query and search, without paging. `status`
 * overrides the query's statuses (a board column asks for its own). Parameters keep one order, so
 * the same list is always the same request and the same cached resource.
 */
export function listParams(
  scope: ServerScope,
  q: TaskQuery,
  search: string,
  status: readonly TaskStatusWire[] = queryStatuses(q),
): string {
  const sort = SORT_WIRE[q.sort];
  if (!sort) throw new Error(`Cannot list tasks: no sort #${q.sort}`);
  const priority = PRIORITIES[q.priority];
  const text = search.trim();
  const pairs: [string, string][] = [
    ['scope', scope],
    ...(q.project ? [['projectId', q.project] as [string, string]] : []),
    ...status.map((s) => ['status', s] as [string, string]),
    ...(q.priority && priority !== 'All'
      ? [['priority', PRIORITY_WIRE[priority]] as [string, string]]
      : []),
    ...(text ? [['q', text] as [string, string]] : []),
    ['sort', sort],
  ];
  return pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

/** True when the query narrows the list (the dot on the filter icon); the sort order alone does not count. */
export const isFiltered = (q: TaskQuery) => !!(q.status || q.project || q.priority || q.who);

/** Priority order of the Priority sort; Critical (not offered by the filter) ranks above High. */
const RANK: Record<TaskPriority, number> = { Critical: -1, High: 0, Medium: 1, Low: 2 };

type Compare = (a: TaskItem, b: TaskItem) => number;
const byDue: Compare = (a, b) => dueIn(a) - dueIn(b);
const COMPARE: Compare[] = [
  byDue,
  (a, b) => RANK[a.priority] - RANK[b.priority] || byDue(a, b),
  (a, b) => b.updated.localeCompare(a.updated),
];

/**
 * Filter and sort tasks by a query. All active hides Done and Canceled on the lists; the board keeps every column
 * (board = true). `me` = first name of the signed-in person, for the Assignee filter.
 */
export function applyQuery(
  tasks: readonly TaskItem[],
  q: TaskQuery,
  { board = false, me }: { board?: boolean; me: string },
): TaskItem[] {
  // By id in the projects store, so a renamed project still filters to its tasks.
  const name = q.project && findProject(q.project)?.name;
  const status = STATUSES[q.status];
  const priority = PRIORITIES[q.priority];
  const compare = COMPARE[q.sort];
  if (!compare) throw new Error(`Cannot sort tasks: no sort #${q.sort}`);
  return tasks
    .filter((t) => (q.status ? t.status === status : board || isOpen(t)))
    .filter((t) => !name || t.project === name)
    .filter((t) => !q.priority || t.priority === priority)
    .filter((t) => !q.who || assigned(t, me))
    .sort(compare);
}

/**
 * Tasks matching the search text by title, "#number" or tag, case-insensitive; blank text keeps them all.
 * "12" and "#12" both find task #12 ("#1" finds every number starting with 1).
 */
export function searchTasks(tasks: readonly TaskItem[], text: string): TaskItem[] {
  const q = text.trim().toLowerCase();
  if (!q) return [...tasks];
  const no = q.startsWith('#') ? q.slice(1) : q;
  return tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      (/^\d+$/.test(no) && String(t.no).startsWith(no)) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q)),
  );
}
