/**
 * Pure Trash policy (S1-18, design 08-sampah #6/#7, D1): who sees a trashed project on the Trash
 * page and which controls it gets. Restore rights come from `canRestoreProject`; this file only adds
 * "you may also see what you deleted yourself". Logic only, so the API and the UI share it.
 */

import { METRICS } from '../metrics/config';
import type { MetricsConfig } from '../metrics/types';
import { isAdminRole } from '../permissions';
import { buildCaps, type Caps } from './capabilities';
import { allow } from './decision';
import { canRestoreProject, NOT_VISIBLE, type ProjectDecision } from './project.policy';
import { ACCESS_RULES, type AccessRules } from './rules';
import type { Membership, Principal, ProjectSubject } from './types';

/** Which trashed projects the Trash list may include, as a descriptor the repository turns into SQL. */
export type TrashListScope = { kind: 'all' } | { kind: 'deletedByOrManaged'; userId: string };

/** Keys of a Trash item's `can{}`; S6 adds `purge` next to it. */
export type TrashItemCapKey = 'restore';
export type TrashItemCaps = Caps<TrashItemCapKey>;

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
  });
}

/** The trashed projects `p` may list: all for Admin/Super-admin, else deleted by them or managed by them. */
export function trashListScope(p: Principal): TrashListScope {
  return isAdminRole(p.appRole) ? { kind: 'all' } : { kind: 'deletedByOrManaged', userId: p.id };
}
