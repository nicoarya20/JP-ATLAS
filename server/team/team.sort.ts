/**
 * Ordering of the Team list by load (S6, P7 §5): `sort=active` and `sort=overdue` rank the whole
 * filtered team, not the page on screen. The counts only exist after the people are chosen, so the
 * list reads a bounded window of candidates, counts them in the same four statements as a name
 * page, ranks them here and only then cuts the page.
 */
import type { TeamPerson, TeamSort } from './team.dto';

/**
 * How many people a load sort ranks, taken in name order (self first, then A-Z). The window keeps
 * the roles and counts statements bounded for a team of any size; a team is small (P7 §5), so
 * in practice it covers everybody. Past it, the order holds among the first people by name and
 * `total` still reports the true size — the page is simply empty beyond the window.
 */
export const TEAM_SORT_SCAN_LIMIT = 200;

/** The sorts that need other people's numbers, and so the right to see them. */
export const isLoadSort = (sort: TeamSort | undefined): sort is 'active' | 'overdue' =>
  sort === 'active' || sort === 'overdue';

/**
 * Most first, then name, then id so two people never swap between requests. Someone with no
 * visible numbers scores -1: they come last instead of tying with a real zero.
 */
export function sortByLoad(people: readonly TeamPerson[], key: 'active' | 'overdue'): TeamPerson[] {
  const score = (x: TeamPerson) => x.load?.[key] ?? -1;
  return [...people].sort(
    (a, b) =>
      score(b) - score(a) ||
      a.name.localeCompare(b.name) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}
