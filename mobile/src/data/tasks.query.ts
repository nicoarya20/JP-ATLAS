import { findProject } from './projects.store';
import {
  ATLAS_ID,
  assigned,
  dueIn,
  isOpen,
  type TaskItem,
  type TaskPriority,
} from './tasks.shared';

/*
 * Filter & sort of the task lists (prototype tasks.query.js): the options, the default query per scope, and applying a
 * query to a task list. The query itself is kept per scope in tasks.query-state.
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
export const SORTS = ['Due date', 'Priority', 'Recently updated', 'Title (A–Z)'] as const;
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

/** Query a list starts with: My tasks and a project's tab span every project, All tasks starts on Atlas. */
export const baseQuery = (scope: TaskScope): TaskQuery => ({
  status: 0,
  project: scope === 'all' ? ATLAS_ID : '',
  priority: 0,
  sort: SORT_DUE,
  who: 0,
});

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
  (a, b) => a.title.localeCompare(b.title),
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
