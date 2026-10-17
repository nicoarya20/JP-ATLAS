/**
 * Pure Team visibility policy (S6 M01, rule D10 in `rencana/P7-s6-tim.md` §5): which of a person's
 * projects the viewer may count tasks in, and whether the viewer may sort the Team list by load.
 *
 * The scope this returns is what the load query puts in its WHERE clause, not a filter applied
 * afterwards: a viewer who may not see someone's numbers must never have them in the response at
 * all. Logic only — no storage, no clock, no runtime globals — so the API and the UI agree.
 */

import { isAdminRole } from '../permissions';
import type { Principal, ProjectRole } from './types';

/**
 * Projects a person's task counts may be summed over: everything (`all`), the listed projects only,
 * or nothing at all. `none` and an empty `projectIds` are deliberately different shapes so a caller
 * cannot pass "no projects" to SQL by accident and get an unfiltered count back.
 */
export type LoadScope = { all: true } | { projectIds: ReadonlySet<string> } | { none: true };

/** The one project role that earns sight of other people's numbers (K1: a Member may hold it). */
const MANAGER: ProjectRole = 'manager';

/** Shared and frozen: returned as-is, so a caller cannot mutate the next decision. */
const ALL: LoadScope = Object.freeze({ all: true });
const NONE: LoadScope = Object.freeze({ none: true });

/**
 * Which of `targetId`'s projects `viewer` may count tasks in (D10):
 *
 * - Admin and Super-admin: every project, for anyone.
 * - Anyone looking at themselves: all of their own tasks, whatever their roles are.
 * - A manager of a project the target is also in: those projects, and only those. The caller
 *   reports "also works on other projects" from the projects left out, never their counts.
 * - Everyone else — Member, Observer, and a Project Manager who manages none of the target's
 *   projects (a non-member PM included): nothing.
 *
 * Account role never widens this on its own: `project_manager` is an account role, while D10 reads
 * project roles, so a PM earns a scope only through a `manager` membership. Impersonation is not
 * checked either: it limits what a super-admin may *do*, and Team is read-only (Q9).
 */
export function loadScopeFor(
  viewer: Principal,
  targetId: string,
  viewerMembership: ReadonlyMap<string, ProjectRole>,
  targetProjectIds: readonly string[],
): LoadScope {
  if (isAdminRole(viewer.appRole)) return ALL;
  if (viewer.id === targetId) return ALL;
  const shared = new Set(targetProjectIds.filter((id) => viewerMembership.get(id) === MANAGER));
  return shared.size > 0 ? { projectIds: shared } : NONE;
}

/**
 * Whether `viewer` may sort the Team list by overdue count: Admin, Super-admin, or a manager of at
 * least one project. Anyone else is offered no such control, and the endpoint answers
 * `SORT_NOT_ALLOWED` rather than quietly sorting by name instead (P7 §5).
 */
export function canSortByLoad(
  viewer: Principal,
  viewerMembership: ReadonlyMap<string, ProjectRole>,
): boolean {
  if (isAdminRole(viewer.appRole)) return true;
  for (const role of viewerMembership.values()) if (role === MANAGER) return true;
  return false;
}
