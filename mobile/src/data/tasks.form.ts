/*
 * The values of New task · Fill form and Edit task, on the server's terms (map `phase2-map-tasks.md` §2d): a project
 * from form-options, one assignee (decision T-2) among the project's Managers and Members (a Viewer only reads,
 * `TASK_WORKER_ROLES`), a kind and a phase of that project, and the dates as plain days. What the server does not
 * take yet has no field: tags (T-8), estimated hours (T-10) and Needs review (T-1, S4). A new task's steps and an
 * edited task's steps live on the detail (checklist routes), not in this form.
 *
 * The form state itself lives in the screen; this module turns it into the body the server takes, checks what the
 * server would refuse anyway (a blank title, a start after the due date), and for Edit sends only what changed.
 */

import type { ProjectMemberWire } from './projects.wire';
import type { TaskDetailWire } from './tasks.detail.wire';
import type { FormProjectWire } from './tasks.form.api';
import { PRIORITY_LABEL, type TaskPriorityWire } from './tasks.wire';

export type TaskForm = {
  title: string;
  /** null: nobody yet (the server allows it). */
  assigneeId: string | null;
  priority: TaskPriorityWire;
  /** ISO days, or null when unset. */
  dueDate: string | null;
  startDate: string | null;
  /** '' only for a project without kinds, which the server then refuses in its own words. */
  kindId: string;
  phaseId: string | null;
  description: string;
};

export type Option = { value: string; label: string };

/** The longest title and description the server takes (`TASK_TITLE_MAX`, `TASK_DESCRIPTION_MAX`). */
export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 5000;
/** The select value of "Unassigned" and "No phase" (a select cannot hold null). */
export const NONE = '';
const WORKERS: readonly ProjectMemberWire['role'][] = ['manager', 'member'];
export const PRIORITY_OPTIONS: readonly TaskPriorityWire[] = ['low', 'medium', 'high', 'critical'];
export const priorityLabel = (p: TaskPriorityWire) => PRIORITY_LABEL[p];

/** The kind a task gets when none is picked: the server's own default, the first of base kind "task". */
export const defaultKind = (p: FormProjectWire): string =>
  (p.kinds.find((k) => k.baseKind === 'task') ?? p.kinds[0])?.id ?? NONE;

/** The project's active kinds; an edited task keeps its own kind as a choice even when that one was retired. */
export function kindOptions(p: FormProjectWire, current?: { id: string; name: string }): Option[] {
  const kinds = p.kinds.map((k) => ({ value: k.id, label: k.name }));
  return current && !kinds.some((k) => k.value === current.id)
    ? [{ value: current.id, label: current.name }, ...kinds]
    : kinds;
}

/** "No phase" then the project's phases; null for a project without phases (the field is hidden). */
export const phaseOptions = (p: FormProjectWire, noPhase: string): Option[] | null =>
  p.phases.length
    ? [{ value: NONE, label: noPhase }, ...p.phases.map((ph) => ({ value: ph.id, label: ph.name }))]
    : null;

/**
 * "Unassigned" then who may work on the project's tasks, in the server's order. An edited task keeps its assignee
 * as a choice even when they no longer are one, so the form shows who it is.
 */
export function assigneeOptions(
  members: readonly ProjectMemberWire[],
  unassigned: string,
  current?: { id: string; name: string } | null,
): Option[] {
  const workers = members
    .filter((m) => WORKERS.includes(m.role))
    .map((m) => ({ value: m.userId, label: m.name }));
  const kept =
    current && !workers.some((w) => w.value === current.id)
      ? [{ value: current.id, label: current.name }]
      : [];
  return [{ value: NONE, label: unassigned }, ...kept, ...workers];
}

/** A blank New task in `project`, starting `today` (the server's day, K1). */
export const newTaskForm = (project: FormProjectWire, today: string): TaskForm => ({
  title: '',
  assigneeId: null,
  priority: 'medium',
  dueDate: null,
  startDate: today,
  kindId: defaultKind(project),
  phaseId: null,
  description: '',
});

/** The form after picking another project: its default kind, no phase and nobody assigned, as its people differ. */
export const pickFormProject = (f: TaskForm, project: FormProjectWire): TaskForm => ({
  ...f,
  assigneeId: null,
  kindId: project.kinds.some((k) => k.id === f.kindId) ? f.kindId : defaultKind(project),
  phaseId: null,
});

/** What keeps Save off: a blank title, or a start after the due date (both refused by the server too). */
export type FormProblem = 'title' | 'dates';
export function formProblem(
  f: Pick<TaskForm, 'title' | 'startDate' | 'dueDate'>,
): FormProblem | null {
  if (!f.title.trim()) return 'title';
  if (f.startDate && f.dueDate && f.startDate > f.dueDate) return 'dates';
  return null;
}

/** The body of `POST /tasks`: trimmed, with what is unset left out so the server's defaults apply. */
export type CreateTaskBody = {
  projectId: string;
  title: string;
  priority: TaskPriorityWire;
  assigneeId?: string;
  dueDate?: string;
  startDate?: string;
  kindId?: string;
  phaseId?: string;
  description?: string;
};

export function createBody(projectId: string, f: TaskForm): CreateTaskBody {
  const description = f.description.trim();
  return {
    projectId,
    title: f.title.trim(),
    priority: f.priority,
    ...(f.assigneeId ? { assigneeId: f.assigneeId } : {}),
    ...(f.dueDate ? { dueDate: f.dueDate } : {}),
    ...(f.startDate ? { startDate: f.startDate } : {}),
    ...(f.kindId ? { kindId: f.kindId } : {}),
    ...(f.phaseId ? { phaseId: f.phaseId } : {}),
    ...(description ? { description } : {}),
  };
}

/** Edit task opens on the task as the server sent it. */
export const editFormOf = (t: TaskDetailWire): TaskForm => ({
  title: t.title,
  assigneeId: t.assignee?.id ?? null,
  priority: t.priority,
  dueDate: t.dueDate,
  startDate: t.startDate,
  kindId: t.kind.id,
  phaseId: t.phase?.id ?? null,
  description: t.description ?? '',
});

/** The body of `PATCH /tasks/:ref`: the fields that changed, as the server stores them. */
export type TaskChanges = Partial<{
  title: string;
  assigneeId: string | null;
  priority: TaskPriorityWire;
  dueDate: string | null;
  startDate: string | null;
  kindId: string;
  phaseId: string | null;
  description: string | null;
}>;

/** Only what differs from `before` (the server answers an empty PATCH with 422); null when nothing does. */
export function editChanges(before: TaskForm, after: TaskForm): TaskChanges | null {
  const a = { ...after, title: after.title.trim(), description: after.description.trim() };
  const b = { ...before, description: before.description.trim() };
  const changes: TaskChanges = {};
  if (a.title !== b.title) changes.title = a.title;
  if (a.assigneeId !== b.assigneeId) changes.assigneeId = a.assigneeId;
  if (a.priority !== b.priority) changes.priority = a.priority;
  if (a.dueDate !== b.dueDate) changes.dueDate = a.dueDate;
  if (a.startDate !== b.startDate) changes.startDate = a.startDate;
  if (a.kindId !== b.kindId && a.kindId) changes.kindId = a.kindId;
  if (a.phaseId !== b.phaseId) changes.phaseId = a.phaseId;
  if (a.description !== b.description) changes.description = a.description || null;
  return Object.keys(changes).length ? changes : null;
}
