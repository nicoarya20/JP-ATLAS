/**
 * Strict reading of what the model returned for "Ceritakan proyeknya". The answer is untrusted
 * input: only the known keys are copied, enums that do not match become null, strings are cleaned
 * and cut to their limits, and an answer of the wrong shape (or with more phases/tasks than allowed)
 * is rejected as a whole — same discipline as `task-draft.schema.ts`.
 */
import { PROJECT_PRIORITIES, type ProjectPriority } from '../pm/enums';
import {
  PHASE_DESCRIPTION_MAX,
  PHASE_NAME_MAX,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_NAME_MAX,
} from '../project/project.limits';
import { TASK_DESCRIPTION_MAX, TASK_TITLE_MAX } from '../task/task.limits';
import {
  PROJECT_DRAFT_PHASES_MAX,
  PROJECT_DRAFT_QUESTION_MAX,
  PROJECT_DRAFT_TASKS_MAX,
} from './project-draft.limits';
import type { DueToken } from './task-draft.dates';
import { TASK_DRAFT_NAME_MAX } from './task-draft.limits';
import { cleanText, parseDue } from './task-draft.schema';

/** A task as the model wrote it, before the kind name is matched to an id and the due token to a date. */
export type RawProjectTask = {
  title: string;
  description: string | null;
  priority: ProjectPriority | null;
  /** A task-kind name from the offered list; matched to an id by code at instantiate time. */
  kindName: string | null;
  due: DueToken | null;
};

/** A phase as the model wrote it; `tasks` are the ones the story places inside this phase. */
export type RawProjectPhase = {
  name: string;
  description: string | null;
  startDate: DueToken | null;
  endDate: DueToken | null;
  tasks: RawProjectTask[];
};

export type ModelOutput = {
  /** Null only together with a non-null `question`: the story was too unclear to name a project. */
  name: string | null;
  description: string | null;
  startDate: DueToken | null;
  dueDate: DueToken | null;
  priority: ProjectPriority | null;
  phases: RawProjectPhase[];
  /** Tasks the story mentions without a clear phase. */
  looseTasks: RawProjectTask[];
  question: string | null;
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function parseTask(v: unknown): RawProjectTask | null {
  if (!isObj(v)) return null;
  const title = cleanText(
    typeof v.title === 'string' ? v.title.replace(/\s+/g, ' ') : v.title,
    TASK_TITLE_MAX,
  );
  if (!title) return null;
  const priority = PROJECT_PRIORITIES.find((p) => p === v.priority) ?? null;
  return {
    title,
    description: cleanText(v.description, TASK_DESCRIPTION_MAX),
    priority,
    kindName: cleanText(v.kindName, TASK_DRAFT_NAME_MAX),
    due: parseDue(v.due),
  };
}

/** `v.tasks` as a validated task list, or null when the array itself is malformed (not an array). */
function parseTaskList(v: unknown): RawProjectTask[] | null {
  if (!Array.isArray(v)) return null;
  const tasks: RawProjectTask[] = [];
  for (const item of v) {
    const t = parseTask(item);
    if (!t) return null;
    tasks.push(t);
  }
  return tasks;
}

function parsePhase(v: unknown): RawProjectPhase | null {
  if (!isObj(v)) return null;
  const name = cleanText(
    typeof v.name === 'string' ? v.name.replace(/\s+/g, ' ') : v.name,
    PHASE_NAME_MAX,
  );
  if (!name) return null;
  const tasks = parseTaskList(v.tasks);
  if (tasks === null) return null;
  return {
    name,
    description: cleanText(v.description, PHASE_DESCRIPTION_MAX),
    startDate: parseDue(v.startDate),
    endDate: parseDue(v.endDate),
    tasks,
  };
}

/**
 * The validated answer, or null when it must not be used: wrong shape, more phases/tasks than the
 * limits allow, or neither a usable name nor a question to show instead.
 */
export function parseModelOutput(raw: unknown): ModelOutput | null {
  if (!isObj(raw) || !Array.isArray(raw.phases) || raw.phases.length > PROJECT_DRAFT_PHASES_MAX) {
    return null;
  }
  const phases: RawProjectPhase[] = [];
  for (const item of raw.phases) {
    const p = parsePhase(item);
    if (!p) return null;
    phases.push(p);
  }
  const looseTasks = parseTaskList(raw.looseTasks);
  if (looseTasks === null) return null;
  const totalTasks = phases.reduce((n, p) => n + p.tasks.length, 0) + looseTasks.length;
  if (totalTasks > PROJECT_DRAFT_TASKS_MAX) return null;

  const name = cleanText(
    typeof raw.name === 'string' ? raw.name.replace(/\s+/g, ' ') : raw.name,
    PROJECT_NAME_MAX,
  );
  const question = cleanText(raw.question, PROJECT_DRAFT_QUESTION_MAX);
  // Neither a name to build a draft from nor a question to show instead: nothing to give the user.
  if (!name && !question) return null;
  const priority = PROJECT_PRIORITIES.find((p) => p === raw.priority) ?? null;
  return {
    name,
    description: cleanText(raw.description, PROJECT_DESCRIPTION_MAX),
    startDate: parseDue(raw.startDate),
    dueDate: parseDue(raw.dueDate),
    priority,
    phases,
    looseTasks,
    question,
  };
}
