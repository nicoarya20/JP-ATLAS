// Projects ①b: the Filter & sort query — its options, applying it to the projects list.
// A query lives in the list screen's params ({status, health, sort}), so Apply is a go() to the same screen.

/** Overlay options; index 0 is the default. */
export const STATUSES = ['All', 'Active', 'On hold', 'Done', 'Draft', 'Canceled'];
export const HEALTHS = ['All', 'Needs attention', 'Overdue', 'On track'];
export const SORTS = ['Nearest deadline', 'Lowest progress', 'Name (A–Z)'];

const KEYS = ['status', 'health', 'sort'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Query the list starts with: every status and health, nearest deadline first. */
export const BASE_QUERY = { status: 0, health: 0, sort: 0 };

/** Only the query keys of a params object. */
export const queryParams = params => Object.fromEntries(KEYS.filter(k => params?.[k] != null).map(k => [k, params[k]]));

/** Screen params with the query dropped, i.e. the list back at its default. */
export const withoutQuery = params => Object.fromEntries(Object.entries(params || {}).filter(([k]) => !KEYS.includes(k)));

/** Query from screen params, defaults filled in. */
export const queryOf = params => ({ ...BASE_QUERY, ...queryParams(params) });

/** True when the query narrows the list (the dot on the filter icon); the sort order alone does not count. */
export const isFiltered = q => !!(q.status || q.health);

/** Sortable key of a short "Oct 31" due label; every sample deadline is in the same year. */
const dueKey = p => { const [m, d] = p.due.split(' '); return MON.indexOf(m) * 100 + Number(d); };
const COMPARE = [
  (a, b) => dueKey(a) - dueKey(b),
  (a, b) => a.progress - b.progress || dueKey(a) - dueKey(b),
  (a, b) => a.name.localeCompare(b.name),
];

/** Projects of the picked status and health ("! Needs attention", "✓ On track" match their plain label), in the picked order. */
export function applyQuery(projects, q) {
  return projects
    .filter(p => !q.status || p.status === STATUSES[q.status])
    .filter(p => !q.health || p.health.includes(HEALTHS[q.health]))
    .sort(COMPARE[q.sort]);
}
