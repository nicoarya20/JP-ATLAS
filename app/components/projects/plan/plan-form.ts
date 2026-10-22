/**
 * Pure side of the phase and milestone forms: values, client checks and the request bodies. Limits are
 * the server's (`project.limits.ts`); the server stays the judge (calendar dates, phase in this project).
 */
import type { PhaseStatus } from '@server/pm/enums';
import {
  MILESTONE_TITLE_MAX,
  PHASE_DESCRIPTION_MAX,
  PHASE_NAME_MAX,
} from '@server/project/project.limits';
import type { MilestoneDto, PhaseDto } from '@server/project/project-plan.dto';
import type { MilestoneInput, PhaseInput, PhasePatch } from '~/lib/project-plan-api';
import { MILESTONE_FORM_COPY, PHASE_FORM_COPY } from './plan.copy';

export type PhaseFormValues = {
  name: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  status: PhaseStatus;
};

export type MilestoneFormValues = {
  title: string;
  dueDate: string | null;
  phaseId: string | null;
};

export const emptyPhaseValues = (): PhaseFormValues => ({
  name: '',
  description: '',
  startDate: null,
  endDate: null,
  status: 'not_started',
});

export const phaseValues = (p: PhaseDto): PhaseFormValues => ({
  name: p.name,
  description: p.description ?? '',
  startDate: p.startDate,
  endDate: p.endDate,
  status: p.status,
});

export const emptyMilestoneValues = (): MilestoneFormValues => ({
  title: '',
  dueDate: null,
  phaseId: null,
});

export const milestoneValues = (m: MilestoneDto): MilestoneFormValues => ({
  title: m.title,
  dueDate: m.dueDate,
  phaseId: m.phaseId,
});

/** Field messages of the phase form; empty when it may be sent. */
export function validatePhase(v: PhaseFormValues): Partial<Record<keyof PhaseFormValues, string>> {
  const errors: Partial<Record<keyof PhaseFormValues, string>> = {};
  const name = v.name.trim();
  if (!name) errors.name = PHASE_FORM_COPY.nameRequired;
  else if (name.length > PHASE_NAME_MAX) errors.name = PHASE_FORM_COPY.nameTooLong(PHASE_NAME_MAX);
  if (v.description.trim().length > PHASE_DESCRIPTION_MAX)
    errors.description = PHASE_FORM_COPY.descriptionTooLong(PHASE_DESCRIPTION_MAX);
  // ISO dates compare correctly as strings.
  if (v.startDate && v.endDate && v.endDate < v.startDate)
    errors.endDate = PHASE_FORM_COPY.endBeforeStart;
  return errors;
}

/** Field messages of the milestone form; empty when it may be sent. */
export function validateMilestone(
  v: MilestoneFormValues,
): Partial<Record<keyof MilestoneFormValues, string>> {
  const errors: Partial<Record<keyof MilestoneFormValues, string>> = {};
  const title = v.title.trim();
  if (!title) errors.title = MILESTONE_FORM_COPY.titleRequired;
  else if (title.length > MILESTONE_TITLE_MAX)
    errors.title = MILESTONE_FORM_COPY.titleTooLong(MILESTONE_TITLE_MAX);
  if (!v.dueDate) errors.dueDate = MILESTONE_FORM_COPY.dueDateRequired;
  return errors;
}

/** POST body: blank description and dates are left out so the server stores nothing for them. */
export function toPhaseInput(v: PhaseFormValues): PhaseInput {
  const description = v.description.trim();
  return {
    name: v.name.trim(),
    ...(description ? { description } : {}),
    ...(v.startDate ? { startDate: v.startDate } : {}),
    ...(v.endDate ? { endDate: v.endDate } : {}),
  };
}

/** PATCH body with only what changed; a cleared date or description is sent as null. */
export function toPhasePatch(initial: PhaseFormValues, v: PhaseFormValues): PhasePatch {
  const patch: PhasePatch = {};
  const name = v.name.trim();
  if (name !== initial.name.trim()) patch.name = name;
  const description = v.description.trim();
  if (description !== initial.description.trim()) patch.description = description || null;
  if (v.startDate !== initial.startDate) patch.startDate = v.startDate;
  if (v.endDate !== initial.endDate) patch.endDate = v.endDate;
  if (v.status !== initial.status) patch.status = v.status;
  return patch;
}

/** Body of both POST and PATCH for a milestone; the form is only submitted once the due date is set. */
export function toMilestoneInput(v: MilestoneFormValues): MilestoneInput {
  return { title: v.title.trim(), dueDate: v.dueDate ?? '', phaseId: v.phaseId };
}
