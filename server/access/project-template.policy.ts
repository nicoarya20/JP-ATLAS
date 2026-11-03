/**
 * Pure policy for project templates (plan §7): who may create one, and who may see/change/delete/use
 * one. Templates are private (plan §1.5): only the creator ever sees a template row, so there is no
 * "member of" concept here, unlike `project.policy.ts`. Logic only: no storage or runtime globals.
 */

import type { Decision } from './decision';
import {
  canCreateProject,
  canViewProject,
  NOT_VISIBLE,
  type ProjectDecision,
} from './project.policy';
import { ACCESS_RULES, type AccessRules } from './rules';
import type { Membership, Principal, ProjectSubject } from './types';

/** Who may create a template: the same role gate as creating a project (PM/Admin/super-admin). */
export function canCreateTemplate(p: Principal): Decision {
  return canCreateProject(p);
}

/** A refused `canUseTemplate`; the only code it ever carries, so there is nothing to discriminate. */
export type TemplateNotFound = { ok: false; code: 'NOT_FOUND' };
export type TemplateDecision = { ok: true } | TemplateNotFound;

/**
 * Who may see, change, delete or use one template: only its creator. A non-owner (or a missing
 * template) answers `NOT_FOUND`, never a 403 — a private template must look exactly like a missing
 * one to anyone else (plan §6, same reasoning as D8 for a hidden project).
 */
export function canUseTemplate(p: Principal, t: { createdBy: string | null }): TemplateDecision {
  return t.createdBy === p.id ? { ok: true } : { ok: false, code: 'NOT_FOUND' };
}

/**
 * Who may save `project` as a template: someone who may see it and may create templates at all. A
 * hidden or trashed project answers `NOT_VISIBLE` (404) before the role is looked at, so the answer
 * never reveals that it exists (D8); a trashed project is frozen like for every other write.
 */
export function canSaveProjectAsTemplate(
  p: Principal,
  project: ProjectSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): ProjectDecision {
  const viewable = canViewProject(p, project, m, rules);
  if (!viewable.ok) return viewable;
  if (project.deletedAt) return NOT_VISIBLE;
  return canCreateTemplate(p);
}
