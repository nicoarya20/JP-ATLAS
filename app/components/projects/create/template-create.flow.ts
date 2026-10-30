/**
 * "Simpan sebagai template" (plan §4.10): turns an edited story draft's absolute dates into day
 * offsets from the project's own day 0, so the template can later be used with a different start
 * date. Pure: no fetch, no React, so it is tested without rendering.
 */
import type {
  ProjectDraft,
  ProjectDraftPhase,
  ProjectDraftTask,
} from '@server/ai/project-draft.types';
import { diffDays } from '@server/metrics/dates';
import type { ProjectPriority, ProjectTemplateSource } from '@server/pm/enums';

export type TemplateTaskInput = {
  title: string;
  description?: string | null;
  priority?: ProjectPriority | null;
  kindName?: string | null;
  dueOffsetDays?: number | null;
};
export type TemplatePhaseInput = {
  name: string;
  description?: string | null;
  startOffsetDays?: number | null;
  endOffsetDays?: number | null;
  tasks?: TemplateTaskInput[];
};
/** Body of `POST /api/app/projects/templates`. */
export type SaveTemplateInput = {
  name: string;
  description?: string | null;
  source: ProjectTemplateSource;
  phases?: TemplatePhaseInput[];
  looseTasks?: TemplateTaskInput[];
};

/** `date` as a day offset from `baseline`, or null when `date` itself is null. */
function offsetFrom(baseline: string, date: string | null): number | null {
  return date === null ? null : diffDays(baseline, date);
}

function taskInputOf(t: ProjectDraftTask, baseline: string): TemplateTaskInput {
  return {
    title: t.title,
    description: t.description,
    priority: t.priority,
    kindName: t.kindName,
    dueOffsetDays: offsetFrom(baseline, t.dueDate),
  };
}

function phaseInputOf(phase: ProjectDraftPhase, baseline: string): TemplatePhaseInput {
  return {
    name: phase.name,
    description: phase.description,
    startOffsetDays: offsetFrom(baseline, phase.startDate),
    endOffsetDays: offsetFrom(baseline, phase.endDate),
    tasks: phase.tasks.map((t) => taskInputOf(t, baseline)),
  };
}

/**
 * `draft` (as edited in the review screen) turned into `POST /projects/templates` input. The
 * baseline every offset is measured from is `draft.startDate` when given, else `today` — the same
 * rule `useTemplate()` uses in reverse on the server (`project-template.service.ts`, plan §5.4).
 */
export function templateInputFromDraft(draft: ProjectDraft, today: string): SaveTemplateInput {
  const baseline = draft.startDate ?? today;
  return {
    name: draft.name,
    description: draft.description,
    source: 'story',
    phases: draft.phases.map((phase) => phaseInputOf(phase, baseline)),
    looseTasks: draft.looseTasks.map((t) => taskInputOf(t, baseline)),
  };
}
