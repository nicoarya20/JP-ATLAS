// Projects Filter & sort: the options the sheet offers, and nothing else. Filtering and sorting are
// the server's now (`GET /api/app/projects`), so the in-memory `applyQuery`/`searchProjects` of
// Phase 1 are gone — narrowing the page this app happens to hold is not narrowing the list, and the
// difference only shows on the second page, where nobody is looking. The query itself still lives
// in the projects query store (phase1-screens.md K4).
//
// Two of the prototype's controls are not here, and both are listed in
// `docs/phase2-gap-disembunyikan.md`:
//   * Health per level (On track / At risk / Off track apart). The server has one flag,
//     `perhatian=1`, which merges at risk and late (GAP A-3), so one real option is offered under
//     that name instead of three that would have to be faked.
//   * Sort by "Lowest progress" (GAP A-4) — progress is computed from tasks, not stored, so there
//     is no sort for it. `sort=recent` is real and takes its place.
import { SORTS, STATUSES } from './projects.api.values';

export { SORTS, STATUSES } from './projects.api.values';

/** Attention options; index 0 (All) is the default, index 1 sends `perhatian=1`. */
export const ATTENTION = ['All', 'Needs attention'] as const;

export type ProjectsQuery = {
  /** Index in STATUSES. */
  status: number;
  /** Index in ATTENTION. */
  attention: number;
  /** Index in SORTS. */
  sort: number;
};

/** Query the list starts with: every status, nothing singled out, nearest deadline first. */
export const BASE_QUERY: ProjectsQuery = { status: 0, attention: 0, sort: 0 };

/** True when the query narrows the list (the dot on the filter icon); the sort order alone does not. */
export const isFiltered = (q: ProjectsQuery) => !!(q.status || q.attention);

/** The option words, so a screen need not know they come from two files. */
export const OPTIONS = { statuses: STATUSES, attention: ATTENTION, sorts: SORTS } as const;
