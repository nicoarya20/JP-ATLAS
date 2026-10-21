// Tasks ①b: the Filter & sort query — its options, the default per list, and applying it to a task list.
// A query lives in the list screen's params ({status, project, priority, sort, who}), so Apply is a go() to the same screen.
import { D } from '../../data/sample';
import { assigned, atlas, days } from './tasks.shared';

/** Overlay options; index 0 is the default. Kept out of the .jsx so the overlay file stays Fast Refresh friendly. */
export const STATUSES = ['All active', 'To do', 'In progress', 'In review', 'Done'];
export const PRIORITIES = ['All', 'High', 'Medium', 'Low'];
export const SORTS = ['Due date', 'Priority', 'Recently updated', 'Title (A–Z)'];
export const SORT_DUE = 0;
/** Assignee filter, only offered on a project's Tasks tab (the Tasks menu has its own My / All switch). */
export const ASSIGNEES = ['Anyone', 'Me'];

const KEYS = ['status', 'project', 'priority', 'sort', 'who'];
const RANK = { High: 0, Medium: 1, Low: 2 };

/** Query a list starts with: My tasks spans every project (project ''), All tasks is scoped to Atlas.
 *  inProject = a project's Tasks tab, whose list is that project already, so it starts with no project filter either. */
export const baseQuery = (mine, inProject) => ({ status: 0, project: mine || inProject ? '' : atlas().id, priority: 0, sort: SORT_DUE, who: 0 });

/** Only the query keys of a params object (screen params also carry e.g. the board's `mine`). */
export const queryParams = params => Object.fromEntries(KEYS.filter(k => params?.[k] != null).map(k => [k, params[k]]));

/** Screen params with the query dropped, i.e. the list back at its default. */
export const withoutQuery = params => Object.fromEntries(Object.entries(params || {}).filter(([k]) => !KEYS.includes(k)));

/** Query from screen params, defaults filled in. */
export const queryOf = (params, mine, inProject) => ({ ...baseQuery(mine, inProject), ...queryParams(params) });

/** True when the query narrows the list (the dot on the filter icon); the sort order alone does not count. */
export const isFiltered = q => !!(q.status || q.project || q.priority || q.who);

const byDue = (a, b) => days(a.due) - days(b.due);
const COMPARE = [
  byDue,
  (a, b) => RANK[a.priority] - RANK[b.priority] || byDue(a, b),
  (a, b) => b.updated.localeCompare(a.updated),
  (a, b) => a.title.localeCompare(b.title),
];

/** Filter and sort tasks by a query. All active hides Done on the lists; the board keeps every column (board = true). */
export function applyQuery(tasks, q, board = false) {
  const name = q.project && D.project(q.project)?.name;
  return tasks
    .filter(t => (q.status ? t.status === STATUSES[q.status] : board || t.status !== 'Done'))
    .filter(t => !name || t.project === name)
    .filter(t => !q.priority || t.priority === PRIORITIES[q.priority])
    .filter(t => !q.who || assigned(t, D.me().name))
    .sort(COMPARE[q.sort]);
}
