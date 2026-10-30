/**
 * Turns the validated model answer into the response: due-date tokens become dates (by code,
 * against `today`, reusing `resolveDue` from `task-draft.dates.ts`), and a task-kind name becomes
 * one of `DEFAULT_TASK_KINDS` or null. Pure: no database, no clock, no network.
 */
import type { IsoDate } from '../metrics/dates';
import { DEFAULT_TASK_KINDS } from '../pm/limits';
import type { ModelOutput, RawProjectPhase, RawProjectTask } from './project-draft.schema';
import type {
  ProjectDraft,
  ProjectDraftPhase,
  ProjectDraftResponse,
  ProjectDraftTask,
} from './project-draft.types';
import { resolveDue } from './task-draft.dates';
import { normalizeName } from './task-draft.members';

export type ComposeContext = { today: IsoDate };

/** The canonical `DEFAULT_TASK_KINDS` name `name` means, or null when it names none of them. */
function matchKindName(name: string | null): string | null {
  if (name === null) return null;
  const wanted = normalizeName(name);
  return DEFAULT_TASK_KINDS.find((k) => normalizeName(k.name) === wanted)?.name ?? null;
}

function composeTask(raw: RawProjectTask, today: IsoDate): ProjectDraftTask {
  return {
    title: raw.title,
    description: raw.description,
    priority: raw.priority,
    kindName: matchKindName(raw.kindName),
    dueDate: raw.due ? resolveDue(raw.due, today) : null,
  };
}

function composePhase(raw: RawProjectPhase, today: IsoDate): ProjectDraftPhase {
  return {
    name: raw.name,
    description: raw.description,
    startDate: raw.startDate ? resolveDue(raw.startDate, today) : null,
    endDate: raw.endDate ? resolveDue(raw.endDate, today) : null,
    tasks: raw.tasks.map((t) => composeTask(t, today)),
  };
}

/** Builds the response from a validated model answer; see `project-draft.types.ts` for the contract. */
export function composeProjectDraft(out: ModelOutput, ctx: ComposeContext): ProjectDraftResponse {
  if (out.name === null) return { draft: null, question: out.question };
  const draft: ProjectDraft = {
    name: out.name,
    description: out.description,
    startDate: out.startDate ? resolveDue(out.startDate, ctx.today) : null,
    dueDate: out.dueDate ? resolveDue(out.dueDate, ctx.today) : null,
    priority: out.priority,
    phases: out.phases.map((p) => composePhase(p, ctx.today)),
    looseTasks: out.looseTasks.map((t) => composeTask(t, ctx.today)),
  };
  // A draft always answers with no question: §4.2 of the plan keeps the two mutually exclusive.
  return { draft, question: null };
}
