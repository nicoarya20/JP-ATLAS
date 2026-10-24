import { listPeople, me, ROLE_TAG } from './people';
import { getProjectByName, listProjects } from './projects.store';
import { type Project, type Role, TODAY } from './sample';
import { FORM_DESC, QUICK_WRITE } from './sample/tasks.extra';
import { TASK_PHASES } from './sample/tasks.settings';
import {
  ATLAS_ID,
  assignees,
  fullName,
  mayChange,
  type TaskItem,
  type TaskPriority,
  type TaskProof,
  type TaskStep,
  type TaskType,
} from './tasks.shared';
import { findTask, getTasksState, taskInfo } from './tasks.state';
import { addTask, editTask } from './tasks.store';

/*
 * Edit task and New task · Fill form (prototype tasks.edit.jsx, tasks.form.jsx, tasks.form.fields.jsx): the values a
 * form opens with, its pickers, and saving it through tasks.store. The form state itself lives in the screen.
 */

export type TaskForm = {
  title: string;
  /** Assignee first names, the first one is `who`. */
  who: string[];
  /** ISO date. */
  due: string;
  priority: TaskPriority;
  type: TaskType;
  tags: string[];
  phase: string;
  desc: string;
  review: boolean;
  /** Review was on when the form opened (a Member may then not turn it off). */
  wasOn: boolean;
  /** Reviewer first name. */
  reviewer: string;
  steps: TaskStep[];
  proof: TaskProof[];
  /** New task only: start date (ISO) and estimated hours. */
  start?: string;
  hours?: string;
};

export type Option = { value: string; label: string };

/** Reviewer as the detail names it: "Ayu (Admin)". */
export function reviewerName(name: string): string | undefined {
  const p = listPeople().find((x) => x.name === name);
  const tag = p && ROLE_TAG[p.role];
  return p && tag ? `${p.name} (${tag})` : undefined;
}

/** Who may review a task: the project's Managers and every Admin, never one of its assignees. */
export const reviewersOf = (project: Pick<Project, 'members'>, who: readonly string[]): Option[] =>
  listPeople()
    .filter(
      (p) =>
        !who.includes(p.name) &&
        (p.role === 'Admin' || (p.role === 'Project Manager' && project.members.includes(p.name))),
    )
    .map((p) => ({ value: p.name, label: `${p.full} · ${ROLE_TAG[p.role]}` }));

/** Reviewer the form shows: the picked one while still allowed, else the first option ('' when none). */
export const shownReviewer = (options: readonly Option[], picked: string) =>
  options.some((o) => o.value === picked) ? picked : (options[0]?.value ?? '');

/** Phase options of a project ("No phase" first), or null for a project without phases. */
export function phasesOf(projectId: string): Option[] | null {
  const p = TASK_PHASES[projectId];
  return p
    ? [{ value: '', label: 'No phase' }, ...p.phases.map((x) => ({ value: x, label: x }))]
    : null;
}

/** Tags after typing `text` + Enter: lowercase, no duplicates, blank ignored. */
export function addTag(tags: readonly string[], text: string): string[] {
  const tag = text.trim().toLowerCase();
  return tag && !tags.includes(tag) ? [...tags, tag] : [...tags];
}

/** Save is allowed once there is a title and at least one assignee. */
export const canSave = (f: Pick<TaskForm, 'title' | 'who'>) => !!f.title.trim() && f.who.length > 0;

export type TaskEditView =
  | { allowed: false; title: string; text: string }
  | {
      allowed: true;
      task: TaskItem;
      /** "#17 · Atlas Project · In review". */
      meta: string;
      initial: TaskForm;
      people: Option[];
      members: string[];
      phases: Option[] | null;
      /** Needs review stays on while the task is in review. */
      reviewLocked: boolean;
      member: boolean;
    };

/** Edit task for task #no as `role`; null when there is no such task. */
export function getTaskEdit(role: Role, no: number): TaskEditView | null {
  const s = getTasksState();
  const t = findTask(s, no);
  if (!t) return null;
  const viewer = me(role);
  if (!mayChange(viewer, t)) {
    const text = `Only ${t.who}, the project Manager or an Admin can edit #${t.no}.`;
    return { allowed: false, title: "You can't edit this task", text };
  }
  const x = taskInfo(s, no);
  const project = getProjectByName(t.project);
  const members = project?.members ?? [];
  const names = [...new Set([...members, ...assignees(t)])];
  return {
    allowed: true,
    task: t,
    meta: `#${t.no} · ${t.project} · ${t.status}`,
    initial: {
      title: t.title,
      who: assignees(t),
      due: t.due,
      priority: t.priority,
      type: t.type,
      tags: [...t.tags],
      phase: x.phase ?? '',
      desc: x.desc,
      review: !!x.reviewer,
      wasOn: !!x.reviewer,
      reviewer: x.reviewer?.split(' ')[0] ?? '',
      steps: x.steps.map((st) => ({ ...st })),
      proof: x.proof.map((p) => ({ ...p })),
    },
    people: names.map((n) => ({ value: n, label: fullName(n) })),
    members,
    phases: project ? phasesOf(project.id) : null,
    reviewLocked: t.status === 'In review',
    member: viewer.role === 'Member',
  };
}

/**
 * Save Edit task. The reviewer is the one the form shows (shownReviewer); an unchanged one keeps how the detail named
 * it. Returns the notice.
 */
export function saveTaskEdit(role: Role, no: number, f: TaskForm): string {
  const view = getTaskEdit(role, no);
  if (!view?.allowed) throw new Error(`Cannot edit task #${no}: not allowed for ${role}`);
  if (!canSave(f)) throw new Error(`Cannot save task #${no}: title and assignee are required`);
  const x = taskInfo(getTasksState(), no);
  const reviewer = shownReviewer(reviewersOf({ members: view.members }, f.who), f.reviewer);
  const kept = x.reviewer && x.reviewer.split(' ')[0] === reviewer;
  const named = kept ? x.reviewer : reviewerName(reviewer);
  editTask(
    no,
    {
      title: f.title.trim(),
      who: f.who[0],
      also: f.who.slice(1),
      due: f.due,
      priority: f.priority,
      type: f.type,
      tags: f.tags,
    },
    {
      phase: f.phase,
      desc: f.desc.trim(),
      reviewer: f.review ? named : undefined,
      steps: f.steps.filter((st) => st.text.trim()),
      proof: f.proof,
    },
    me(role).name,
  );
  return 'Task updated';
}

/** Projects `role` may add tasks to: every listed one for an Admin, else those the viewer is a member of. */
export function formProjects(role: Role): Project[] {
  const name = me(role).name;
  // Listed only: a project in Archive takes no new tasks.
  return listProjects().filter((p) => role === 'admin' || p.members.includes(name));
}

/** Fill form values for `project`, from the first AI draft. */
export function initialForm(project: Project): TaskForm {
  const d = QUICK_WRITE.drafts[0];
  return {
    title: d.title,
    who: project.members.includes(d.who) ? [d.who] : [],
    due: d.due,
    priority: d.priority,
    type: d.type,
    tags: ['login'],
    phase: TASK_PHASES[project.id]?.now ?? '',
    desc: FORM_DESC,
    review: false,
    wasOn: false,
    reviewer: '',
    steps: [],
    proof: [],
    start: TODAY,
    hours: '4',
  };
}

/** Form after picking another project: only its members stay assigned, and a phase only where it has phases. */
export function pickProject(f: TaskForm, project: Project): TaskForm {
  const phase = TASK_PHASES[project.id] ? f.phase : '';
  return { ...f, who: f.who.filter((n) => project.members.includes(n)), phase };
}

/** New task · Fill form for `role`, opened on `projectId` when allowed (else Atlas, else the first allowed). */
export function getTaskForm(role: Role, projectId?: string) {
  const projects = formProjects(role);
  const project =
    projects.find((p) => p.id === projectId) ??
    projects.find((p) => p.id === ATLAS_ID) ??
    projects[0];
  if (!project) throw new Error(`Cannot open New task for ${role}: no project to add it to`);
  return { projects, project, initial: initialForm(project), member: role === 'member' };
}

/** Save New task · Fill form in `project`. Returns the new task number. */
export function saveNewTask(role: Role, project: Project, f: TaskForm): number {
  if (!formProjects(role).some((p) => p.id === project.id)) {
    throw new Error(`Cannot add a task to ${project.name}: not allowed for ${role}`);
  }
  if (!canSave(f)) throw new Error('Cannot add the task: title and assignee are required');
  return addTask(
    {
      title: f.title.trim(),
      project: project.name,
      who: f.who[0],
      also: f.who.slice(1),
      due: f.due,
      priority: f.priority,
      type: f.type,
      tags: f.tags,
    },
    {
      phase: f.phase,
      desc: f.desc.trim(),
      reviewer: f.review
        ? reviewerName(shownReviewer(reviewersOf(project, f.who), f.reviewer))
        : undefined,
      start: f.start,
      hours: f.hours,
    },
    me(role).name,
  );
}
