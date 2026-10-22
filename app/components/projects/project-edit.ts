/**
 * "Ubah proyek" turns the form into at most three calls, each only when its part changed:
 * PATCH /:id (info and dates), POST /:id/status and PUT /:id/lead (P3 S1-13, KB-3, KB-12).
 */

import type { ProjectStatus } from '@server/pm/enums';
import type { ProjectDetail } from '@server/project/project.dto';
import {
  type ProjectPatch,
  type ProjectSaved,
  setProjectLead,
  setProjectStatus,
  updateProject,
} from '~/lib/projects-api';
import type { ProjectFormValues } from './ProjectForm';

/** The parts of "Ubah proyek" that changed; null parts are not sent. */
export type ProjectEditPlan = {
  patch: ProjectPatch | null;
  status: ProjectStatus | null;
  leadId: string | null;
};

/**
 * Saves "Ubah proyek" as up to three calls: info, then status, then Lead. Stops at the first
 * refusal, so earlier parts may already be saved; the caller refreshes either way.
 */
export async function saveProjectEdit(
  id: string,
  changes: ProjectEditPlan,
): Promise<ProjectSaved | null> {
  let saved: ProjectSaved | null = null;
  if (changes.patch) saved = await updateProject(id, changes.patch);
  if (changes.status) saved = await setProjectStatus(id, changes.status);
  if (changes.leadId) saved = await setProjectLead(id, changes.leadId);
  return saved;
}

/** The saved project as form values; blank texts and missing dates become '' and null. */
export function toFormValues(p: ProjectDetail): ProjectFormValues {
  return {
    name: p.name,
    description: p.description ?? '',
    status: p.status,
    priority: p.priority,
    leadId: p.lead?.id ?? '',
    startDate: p.startDate,
    dueDate: p.dueDate,
  };
}

/** Only the fields that differ from `before`; an emptied description or date is sent as null to clear it. */
export function toEditPlan(before: ProjectFormValues, after: ProjectFormValues): ProjectEditPlan {
  const patch: ProjectPatch = {};
  const name = after.name.trim();
  if (name !== before.name) patch.name = name;
  const description = after.description.trim();
  if (description !== before.description.trim()) patch.description = description || null;
  if (after.priority !== before.priority) patch.priority = after.priority;
  if (after.startDate !== before.startDate) patch.startDate = after.startDate;
  if (after.dueDate !== before.dueDate) patch.dueDate = after.dueDate;
  return {
    patch: Object.keys(patch).length > 0 ? patch : null,
    status: after.status !== before.status ? after.status : null,
    leadId: after.leadId && after.leadId !== before.leadId ? after.leadId : null,
  };
}

export const isEmptyPlan = (plan: ProjectEditPlan) => !plan.patch && !plan.status && !plan.leadId;
