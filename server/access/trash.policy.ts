/**
 * Pure Trash policy (S1-18, S6/P8 §5, design 08-sampah #6/#7, D1): who sees a trashed project or
 * task on the Trash page, which controls it gets, who may send a task to the Trash and who may
 * delete for good. Restore rights for a project come from `canRestoreProject`; this file adds "you
 * may also see what you deleted yourself". Logic only, so the API and the UI share it.
 */

import { METRICS } from '../metrics/config';
import { isRestorable } from '../metrics/trash.metrics';
import type { MetricsConfig } from '../metrics/types';
import { isAdminRole } from '../permissions';
import { buildCaps, type Caps } from './capabilities';
import { allow, type Decision, deny } from './decision';
import { atLeast, levelOf } from './level';
import { notVisible } from './not-visible';
import { canRestoreProject, NOT_VISIBLE, type ProjectDecision } from './project.policy';
import { ACCESS_RULES, type AccessRules } from './rules';
import { guardTask, type TaskDecision } from './task.policy';
import type { Membership, Principal, ProjectSubject, TaskSubject } from './types';

/** Which trashed projects the Trash list may include, as a descriptor the repository turns into SQL. */
export type TrashListScope = { kind: 'all' } | { kind: 'deletedByOrManaged'; userId: string };

/** Keys of a Trash item's `can{}`. */
export type TrashItemCapKey = 'restore' | 'purge';
export type TrashItemCaps = Caps<TrashItemCapKey>;

/** A task nobody told the viewer about is reported as 404, like every other hidden task. */
const TASK_NOT_VISIBLE = notVisible('NOT_FOUND');

/**
 * Whether `p` may see the trashed project on the Trash page: Admin/Super-admin always, anyone who
 * deleted it, and anyone allowed to restore it (every manager, a Member-manager included, D1).
 * A live project is never a Trash item.
 */
export function canViewTrashItem(
  p: Principal,
  project: ProjectSubject,
  m: Membership,
  now: Date,
  rules: AccessRules = ACCESS_RULES,
  metrics: MetricsConfig = METRICS,
): ProjectDecision {
  if (!project.deletedAt) return NOT_VISIBLE;
  if (project.deletedBy === p.id) return allow();
  // Impersonation limits what a super-admin may do, not what they see (Q9); an expired item stays
  // listed so its manager learns why the button is off.
  const restore = canRestoreProject(
    { ...p, impersonating: false },
    project,
    m,
    now,
    rules,
    metrics,
  );
  return restore.ok || restore.code === 'EXPIRED' ? allow() : NOT_VISIBLE;
}

/** Capabilities of one Trash item; check `canViewTrashItem` first, a hidden item has none. */
export function trashItemCaps(
  p: Principal,
  project: ProjectSubject,
  m: Membership,
  now: Date,
  rules: AccessRules = ACCESS_RULES,
  metrics: MetricsConfig = METRICS,
): TrashItemCaps {
  return buildCaps<TrashItemCapKey>({
    restore: canRestoreProject(p, project, m, now, rules, metrics),
    purge: canPurge(p),
  });
}

/** The trashed projects `p` may list: all for Admin/Super-admin, else deleted by them or managed by them. */
export function trashListScope(p: Principal): TrashListScope {
  return isAdminRole(p.appRole) ? { kind: 'all' } : { kind: 'deletedByOrManaged', userId: p.id };
}

/**
 * Whether `p` may move the task to the Trash: its creator, any manager of the project (a
 * Member-manager included) and Admin/Super-admin; a Member who is only the assignee may not, and
 * an Observer may not either (user decision 18 Oct 2026, P8 Q1). Impersonation is refused first
 * because the delete is destructive (Q9); the task's own trash state is checked last, so deleting
 * twice reads as `WRONG_STATE` and a task inside a trashed project as `PROJECT_IN_TRASH`.
 */
export function canTrashTask(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): TaskDecision {
  if (p.impersonating) return deny('IMPERSONATING');
  return guardTask(p, task, m, 'creator', rules);
}

/**
 * Whether `p` may bring a trashed task back: any manager of its project, Admin/Super-admin, or
 * whoever deleted it — the same set the Trash list shows the task to, so a listed row and its
 * button never disagree. A task whose project is in the Trash waits for the project
 * (`PROJECT_IN_TRASH`, the project restore brings it along); past the retention window it is
 * `EXPIRED`. Blocked while impersonating (Q9).
 */
export function canRestoreTask(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  now: Date,
  rules: AccessRules = ACCESS_RULES,
  metrics: MetricsConfig = METRICS,
): TaskDecision {
  if (p.impersonating) return deny('IMPERSONATING');
  const level = levelOf(p, m, rules);
  // Checked before `deletedAt`: a live task must look missing to someone who may not see it.
  const mine = task.deletedBy !== null && task.deletedBy === p.id;
  if (!atLeast(level, 'manager') && !mine) {
    if (level === 'none') return TASK_NOT_VISIBLE;
    return deny(level === 'member' ? 'NOT_OWNER' : 'NOT_MEMBER');
  }
  if (!task.deletedAt) return deny('WRONG_STATE');
  if (task.projectDeletedAt) return deny('PROJECT_IN_TRASH');
  return isRestorable(task.deletedAt, now, metrics) ? allow() : deny('EXPIRED');
}

/**
 * Whether `p` may delete a Trash item for good: Admin and Super-admin only, never while
 * impersonating (P8 §5, T3 dialog). Account role alone decides, so a Project Manager who manages
 * the project is refused too — the control is hidden for them (`DENY_UI.ROLE_CANNOT_PURGE`).
 */
export function canPurge(p: Principal): Decision {
  if (p.impersonating) return deny('IMPERSONATING');
  return isAdminRole(p.appRole) ? allow() : deny('ROLE_CANNOT_PURGE');
}
