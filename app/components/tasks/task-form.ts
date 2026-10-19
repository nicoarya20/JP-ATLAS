/**
 * Pure side of the task form (S2-11): values, client checks, quick due dates and the mapping of a
 * refused save back to fields. Limits and refusal texts are the server's (`task.limits.ts`).
 */
import type { IsoDate } from '@server/metrics/types';
import type { ProjectPriority } from '@server/pm/enums';
import {
  TASK_CHECKLIST_INITIAL_MAX,
  TASK_CHECKLIST_TEXT_MAX,
  TASK_DESCRIPTION_MAX,
  TASK_TITLE_MAX,
  TASK_WRITE_MESSAGES,
} from '@server/task/task.limits';
import { ApiError } from '~/lib/http';
import type { TaskCreateInput, TaskPatch } from '~/lib/tasks-api';
import { TASK_FORM_COPY as COPY } from './task-form.copy';

export type TaskFormValues = {
  projectId: string | null;
  title: string;
  assigneeId: string | null;
  priority: ProjectPriority;
  dueDate: string | null;
  description: string;
  kindId: string | null;
  /** A phase of the chosen project (H-B5); null = no phase. */
  phaseId: string | null;
  startDate: string | null;
  /** Initial checklist steps; only the create form sends them. */
  steps: string[];
};

/** Field messages keyed by form field, from the client checks or a refused save. */
export type TaskFieldErrors = Partial<Record<keyof TaskFormValues | `steps.${number}`, string>>;

/** A blank new task: priority Sedang like the server default, assigned to `assigneeId` when given. */
export const newTaskValues = (
  projectId: string | null,
  assigneeId: string | null,
): TaskFormValues => ({
  projectId,
  title: '',
  assigneeId,
  priority: 'medium',
  dueDate: null,
  description: '',
  kindId: null,
  phaseId: null,
  startDate: null,
  steps: [],
});

/** Whether the values already fill something kept behind "Tampilkan lebih banyak", so it opens on its own. */
export const hasFoldedValues = (v: TaskFormValues): boolean =>
  Boolean(v.description.trim() || v.phaseId || v.startDate || v.steps.some((s) => s.trim()));

/** Client checks mirror the route schema; the server stays the judge (assignee, kind, dates). */
export function validateTask(v: TaskFormValues): TaskFieldErrors {
  const errors: TaskFieldErrors = {};
  if (!v.projectId) errors.projectId = COPY.projectRequired;
  const title = v.title.trim();
  if (!title) errors.title = TASK_WRITE_MESSAGES.emptyTitle;
  else if (title.length > TASK_TITLE_MAX) errors.title = COPY.nameTooLong(TASK_TITLE_MAX);
  if (v.description.length > TASK_DESCRIPTION_MAX)
    errors.description = COPY.descriptionTooLong(TASK_DESCRIPTION_MAX);
  // ISO dates compare correctly as strings.
  if (v.startDate && v.dueDate && v.dueDate < v.startDate) errors.dueDate = COPY.dueBeforeStart;
  v.steps.forEach((s, i) => {
    if (s.trim().length > TASK_CHECKLIST_TEXT_MAX)
      errors[`steps.${i}`] = TASK_WRITE_MESSAGES.stepTooLong;
  });
  if (v.steps.length > TASK_CHECKLIST_INITIAL_MAX)
    errors.steps = COPY.stepsFull(TASK_CHECKLIST_INITIAL_MAX);
  return errors;
}

export type QuickDue = 'today' | 'tomorrow' | 'nextWeek';
const QUICK_DAYS: Record<QuickDue, number> = { today: 0, tomorrow: 1, nextWeek: 7 };
export const QUICK_DUES = Object.keys(QUICK_DAYS) as QuickDue[];
export const QUICK_DUE_LABELS: Record<QuickDue, string> = {
  today: COPY.quickToday,
  tomorrow: COPY.quickTomorrow,
  nextWeek: COPY.quickNextWeek,
};

const MS_PER_DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

/** Due date of a quick button counted from the server's `today` (calendar days, no time zone). */
export function quickDue(today: IsoDate, pick: QuickDue): IsoDate {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  const out = new Date(Date.UTC(y, m - 1, d) + QUICK_DAYS[pick] * MS_PER_DAY);
  return `${out.getUTCFullYear()}-${pad(out.getUTCMonth() + 1)}-${pad(out.getUTCDate())}` as IsoDate;
}

/** Steps that would be sent: trimmed, blanks dropped (an empty row is just an unused input). */
const cleanSteps = (steps: string[]) => steps.map((s) => s.trim()).filter(Boolean);

/** Form values to the POST body; blanks are left out so the server applies its defaults. */
export function toCreateTaskInput(v: TaskFormValues): TaskCreateInput {
  const description = v.description.trim();
  const steps = cleanSteps(v.steps);
  return {
    projectId: v.projectId ?? '',
    title: v.title.trim(),
    priority: v.priority,
    ...(v.assigneeId ? { assigneeId: v.assigneeId } : {}),
    ...(description ? { description } : {}),
    ...(v.kindId ? { kindId: v.kindId } : {}),
    ...(v.phaseId ? { phaseId: v.phaseId } : {}),
    ...(v.dueDate ? { dueDate: v.dueDate } : {}),
    ...(v.startDate ? { startDate: v.startDate } : {}),
    ...(steps.length ? { checklist: steps } : {}),
  };
}

/** Only the fields that changed, for `PATCH /tasks/:ref`; the project and the steps never change here. */
export function toTaskPatch(initial: TaskFormValues, v: TaskFormValues): TaskPatch {
  const patch: TaskPatch = {};
  const title = v.title.trim();
  if (title !== initial.title.trim()) patch.title = title;
  const description = v.description.trim();
  if (description !== initial.description.trim()) patch.description = description || null;
  if (v.assigneeId !== initial.assigneeId) patch.assigneeId = v.assigneeId;
  if (v.priority !== initial.priority) patch.priority = v.priority;
  if (v.dueDate !== initial.dueDate) patch.dueDate = v.dueDate;
  if (v.startDate !== initial.startDate) patch.startDate = v.startDate;
  if (v.kindId && v.kindId !== initial.kindId) patch.kindId = v.kindId;
  if (v.phaseId !== initial.phaseId) patch.phaseId = v.phaseId;
  return patch;
}

/** Service refusals arrive as one sentence without a path; these sentences belong to one field. */
const MESSAGE_FIELD: Record<string, keyof TaskFormValues> = {
  [TASK_WRITE_MESSAGES.emptyTitle]: 'title',
  [TASK_WRITE_MESSAGES.assigneeNotWorker]: 'assigneeId',
  [TASK_WRITE_MESSAGES.kindNotInProject]: 'kindId',
  [TASK_WRITE_MESSAGES.phaseNotInProject]: 'phaseId',
  [TASK_WRITE_MESSAGES.startAfterDue]: 'dueDate',
  [TASK_WRITE_MESSAGES.emptyStep]: 'steps',
  [TASK_WRITE_MESSAGES.stepTooLong]: 'steps',
  [TASK_WRITE_MESSAGES.tooManySteps]: 'steps',
};

/** Body keys whose form field has another name. */
const PATH_FIELD: Record<string, keyof TaskFormValues> = { checklist: 'steps' };

/**
 * A refused save (422) to field messages: schema `issues[].path` ("/title", "/checklist/0") first, else
 * a known service sentence. Null when nothing maps to a field, so the toast stays the only message.
 */
export function taskFieldErrors(err: unknown): TaskFieldErrors | null {
  if (!(err instanceof ApiError) || err.status !== 422) return null;
  const out: Record<string, string> = {};
  for (const i of err.issues ?? []) {
    const key = i.path.replace(/^\//, '').split('/')[0] ?? '';
    const field = PATH_FIELD[key] ?? key;
    if (field && !out[field]) out[field] = i.message;
  }
  const byMessage = MESSAGE_FIELD[err.message];
  if (byMessage && !out[byMessage]) out[byMessage] = err.message;
  return Object.keys(out).length ? (out as TaskFieldErrors) : null;
}
