/**
 * Fixed limits and list vocabularies for tasks (S2). Pure: the browser bundle and the task form
 * import it, so the form and the server validate against the same numbers.
 */

/** Longest task title and description accepted by the form and the write routes. */
export const TASK_TITLE_MAX = 200;
export const TASK_DESCRIPTION_MAX = 5000;

/** Longest search text; longer input is cut instead of rejected, a search box should not error. */
export const TASK_SEARCH_MAX = 100;

/** `scope` of the task list: assigned to me, one project, or everything I may see. */
export const TASK_LIST_SCOPES = ['mine', 'project', 'all'] as const;
export type TaskListScope = (typeof TASK_LIST_SCOPES)[number];

/** Sort keys of the task list; the order of each is fixed in `task.sql.ts`. */
export const TASK_SORTS = ['due', 'priority', 'updated', 'created'] as const;
export type TaskSort = (typeof TASK_SORTS)[number];
export const TASK_SORT_DEFAULT: TaskSort = 'due';
