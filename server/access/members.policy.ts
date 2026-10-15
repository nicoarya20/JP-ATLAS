/**
 * Pure membership policy: who may change a project's member set and its Lead, and the
 * "last manager" / "Lead stays a manager" guards (R03 §3.4, K4, X3 M10). Logic only.
 */
import { allow, deny } from './decision';
import { canManageProject, type ProjectDecision } from './project.policy';
import { ACCESS_RULES, type AccessRules } from './rules';
import type { Membership, Principal, ProjectRole, ProjectSubject } from './types';

/** One member change: `targetRole` is null for an add, `nextRole` is null for a removal. */
export type ManagerSetChange = {
  targetId: string;
  targetRole: ProjectRole | null;
  nextRole: ProjectRole | null;
  /** Ids of all current managers of the project, including the target when they are one. */
  managerIds: readonly string[];
};

// `LEAD_MUST_BE_MANAGER` lives in the API catalog (`PM_API_CODES`, R04 spelling), not in
// `DENY_CODES`, so it cannot go through `deny()`; this type keeps it out of the shared `Decision`.
/** Denial for a Lead who is not one of the project's managers. */
export type LeadMustBeManager = { ok: false; code: 'LEAD_MUST_BE_MANAGER' };

/** A `ProjectDecision` that may also carry `LEAD_MUST_BE_MANAGER`. */
export type LeadDecision = ProjectDecision | LeadMustBeManager;

const LEAD_MUST_BE_MANAGER: Readonly<LeadMustBeManager> = Object.freeze({
  ok: false,
  code: 'LEAD_MUST_BE_MANAGER',
});

/**
 * Whether `p` may add, re-role or remove a member. The actor must be able to manage the
 * project (M10); then a change that removes a manager may not leave the project without one,
 * and may not take the Lead's manager role. "Last manager" is checked first because
 * "add another manager" is a more useful hint than "move the Lead" (this binds Admin too, R03 note b).
 */
export function canChangeManagerSet(
  p: Principal,
  project: ProjectSubject,
  m: Membership,
  i: ManagerSetChange,
  rules: AccessRules = ACCESS_RULES,
): ProjectDecision {
  const manage = canManageProject(p, project, m, rules);
  if (!manage.ok) return manage;
  const losesManager = i.targetRole === 'manager' && i.nextRole !== 'manager';
  if (!losesManager) return allow();
  if (!i.managerIds.some((id) => id !== i.targetId)) return deny('LAST_MANAGER');
  return project.leadId === i.targetId ? deny('IS_LEAD') : allow();
}

/** Whether `p` may make `nextLeadId` the Lead: the actor manages the project and the new Lead is a manager. */
export function canSetLead(
  p: Principal,
  project: ProjectSubject,
  m: Membership,
  nextLeadId: string,
  managerIds: readonly string[],
  rules: AccessRules = ACCESS_RULES,
): LeadDecision {
  const manage = canManageProject(p, project, m, rules);
  if (!manage.ok) return manage;
  return managerIds.includes(nextLeadId) ? allow() : LEAD_MUST_BE_MANAGER;
}
