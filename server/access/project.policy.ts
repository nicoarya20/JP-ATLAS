/**
 * Pure project policy: who may see, create, manage and trash a project, and which
 * projects a list may show (R03 §2.2, K1/K6, D8, 15 Oct 2026 trash decision). Logic
 * only: no storage or runtime globals, so the same functions gate the API and the UI.
 */

import { METRICS } from '../metrics/config';
import { isRestorable } from '../metrics/trash.metrics';
import type { MetricsConfig } from '../metrics/types';
import { allow, type Decision, deny } from './decision';
import { atLeast, isPmOrAbove, levelOf } from './level';
import { type NotVisible, notVisible } from './not-visible';
import { ACCESS_RULES, type AccessRules } from './rules';
import type { Membership, Principal, ProjectSubject } from './types';

// `NOT_VISIBLE` is deliberately outside `DENY_CODES`: it is reported as NOT_FOUND/404 so a
// hidden project looks the same as a missing one (D8). The shared type keeps it out of `Decision`.
/** A `Decision` that may also carry `NOT_VISIBLE` (HTTP 404, the viewer may not know the project exists). */
export type ProjectDecision = Decision | NotVisible<'NOT_VISIBLE'>;

/** Which projects a list may include, as a descriptor the repository turns into SQL (D6). */
export type ProjectListScope = { kind: 'all' } | { kind: 'memberOf'; userId: string };

/** The `scope` query value of the project list. */
export type RequestedListScope = 'mine' | 'all';

/** Shared and frozen: returned as-is so callers cannot mutate the next decision. */
export const NOT_VISIBLE: Readonly<NotVisible<'NOT_VISIBLE'>> = notVisible('NOT_VISIBLE');

/** Whether `p` may open the project read-only; anyone without a level gets 404, not 403 (D8). */
export function canViewProject(
  p: Principal,
  _project: ProjectSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): ProjectDecision {
  // The project's trash state is not checked: the Trash page must still open what it lists.
  return atLeast(levelOf(p, m, rules), 'reader') ? allow() : NOT_VISIBLE;
}

/** Whether `p` may create a project: Project Manager, Admin or Super-admin by account role (C04). */
export function canCreateProject(p: Principal): Decision {
  return isPmOrAbove(p) ? allow() : deny('NOT_APP_ROLE');
}

/**
 * Whether `p` may change the project (details, status, setup, members). Role comes first
 * so a hidden project stays hidden, then the Trash freezes everything except restore.
 */
export function canManageProject(
  p: Principal,
  project: ProjectSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): ProjectDecision {
  const level = levelOf(p, m, rules);
  if (!atLeast(level, 'reader')) return NOT_VISIBLE;
  if (!atLeast(level, 'manager')) return deny('NOT_MANAGER');
  if (project.deletedAt) return deny('PROJECT_IN_TRASH');
  return allow();
}

/**
 * Whether `p` may move the project to the Trash: managing it, and being Admin/Super-admin or
 * a Project Manager by account role. A Member who manages it needs the rule flag on.
 * Impersonation is checked first because deleting is destructive (Q9).
 */
export function canTrashProject(
  p: Principal,
  project: ProjectSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): ProjectDecision {
  if (p.impersonating) return deny('IMPERSONATING');
  const manage = canManageProject(p, project, m, rules);
  if (!manage.ok) return manage;
  return isPmOrAbove(p) || rules.MEMBER_MANAGER_CAN_TRASH_PROJECT
    ? allow()
    : deny('ROLE_CANNOT_TRASH');
}

/**
 * Whether `p` may bring a trashed project back: any manager of it (a Member-manager included, D1)
 * or Admin/Super-admin, while it is still within the retention period. Blocked while impersonating (Q9).
 */
export function canRestoreProject(
  p: Principal,
  project: ProjectSubject,
  m: Membership,
  now: Date,
  rules: AccessRules = ACCESS_RULES,
  metrics: MetricsConfig = METRICS,
): ProjectDecision {
  if (p.impersonating) return deny('IMPERSONATING');
  const level = levelOf(p, m, rules);
  if (!atLeast(level, 'reader')) return NOT_VISIBLE;
  if (!atLeast(level, 'manager')) return deny('NOT_MANAGER');
  if (!project.deletedAt) return deny('WRONG_STATE');
  return isRestorable(project.deletedAt, now, metrics) ? allow() : deny('EXPIRED');
}

/** The projects `p` may list: everything for Admin and (by P-A1) Project Manager, else only memberships. */
export function projectListScope(
  p: Principal,
  rules: AccessRules = ACCESS_RULES,
): ProjectListScope {
  // Membership is irrelevant here: `levelOf` returns 'admin'/'reader' from the account role alone.
  return atLeast(levelOf(p, null, rules), 'reader')
    ? { kind: 'all' }
    : { kind: 'memberOf', userId: p.id };
}

/** In-memory twin of the SQL list filter, used as the oracle in the parity tests (D6). */
export function matchesProjectScope(
  scope: ProjectListScope,
  projectId: string,
  memberProjectIds: readonly string[],
): boolean {
  return scope.kind === 'all' || memberProjectIds.includes(projectId);
}

/** The scope the list really uses: never wider than allowed, so a Member's `all` becomes `mine` without an error (M11). */
export function clampListScope(
  requested: RequestedListScope,
  allowed: ProjectListScope,
): RequestedListScope {
  return requested === 'all' && allowed.kind === 'all' ? 'all' : 'mine';
}
