// Projects Filter & sort: its options, applying a query to the projects, and the search field. Ported from the
// prototype's projects.query.js; the query itself lives in the projects query store (phase1-screens.md K4).
import type { ProjectItem } from './projects.store';

/** Filter options; index 0 (All) is the default. */
export const STATUSES = ['All', 'Active', 'On hold', 'Done', 'Draft', 'Canceled'] as const;
export const HEALTHS = ['All', 'Needs attention', 'Overdue', 'On track'] as const;
/** Sort options; index 0 (Nearest deadline) is the default. */
export const SORTS = ['Nearest deadline', 'Lowest progress', 'Name (A–Z)'] as const;

export type ProjectsQuery = {
  /** Index in STATUSES. */
  status: number;
  /** Index in HEALTHS. */
  health: number;
  /** Index in SORTS. */
  sort: number;
};

/** Query the list starts with: every status and health, nearest deadline first. */
export const BASE_QUERY: ProjectsQuery = { status: 0, health: 0, sort: 0 };

/** True when the query narrows the list (the dot on the filter icon); the sort order alone does not count. */
export const isFiltered = (q: ProjectsQuery) => !!(q.status || q.health);

type Compare = (a: ProjectItem, b: ProjectItem) => number;

const byDue: Compare = (a, b) => a.due.localeCompare(b.due);
const COMPARE: readonly Compare[] = [
  byDue,
  (a, b) => a.progress - b.progress || byDue(a, b),
  (a, b) => a.name.localeCompare(b.name),
];

/** Projects of the picked status and health ("! Needs attention" matches its plain label), in the picked order. */
export function applyQuery(projects: readonly ProjectItem[], q: ProjectsQuery): ProjectItem[] {
  const health = q.health ? HEALTHS[q.health] : undefined;
  return projects
    .filter((p) => !q.status || p.status === STATUSES[q.status])
    .filter((p) => !health || p.health.includes(health))
    .sort(COMPARE[q.sort] ?? byDue);
}

/** Projects whose name or description holds the search text (case-insensitive); blank text keeps them all. */
export function searchProjects(projects: readonly ProjectItem[], text: string): ProjectItem[] {
  const needle = text.trim().toLowerCase();
  if (!needle) return [...projects];
  return projects.filter((p) => `${p.name}\n${p.desc}`.toLowerCase().includes(needle));
}
