/**
 * Local editing of a story draft before it is saved (plan §4.8): the user may rename or drop any
 * phase or task. Pure: no fetch, no React, so it is tested without rendering. Each phase/task gets a
 * local `key` for list rendering and removal; the server never sees it.
 */
import type {
  ProjectDraft,
  ProjectDraftPhase,
  ProjectDraftTask,
} from '@server/ai/project-draft.types';
import type { ProjectPriority } from '@server/pm/enums';
import type {
  ProjectCreateInput,
  ProjectCreatePhaseInput,
  ProjectCreateTaskInput,
} from '~/lib/projects-api';

export type EditableTask = ProjectDraftTask & { key: string };
export type EditablePhase = Omit<ProjectDraftPhase, 'tasks'> & {
  key: string;
  tasks: EditableTask[];
};
export type EditableDraft = {
  name: string;
  description: string;
  startDate: string | null;
  dueDate: string | null;
  priority: ProjectPriority | null;
  phases: EditablePhase[];
  looseTasks: EditableTask[];
};

let seq = 0;
/** A local-only id, never sent to the server: list keys and removal only need to be unique here. */
const nextKey = () => `d${++seq}`;

/** `draft` as editable local state; call once when the draft first arrives. */
export function editableDraftOf(draft: ProjectDraft): EditableDraft {
  return {
    name: draft.name,
    description: draft.description ?? '',
    startDate: draft.startDate,
    dueDate: draft.dueDate,
    priority: draft.priority,
    phases: draft.phases.map((phase) => ({
      ...phase,
      key: nextKey(),
      tasks: phase.tasks.map((t) => ({ ...t, key: nextKey() })),
    })),
    looseTasks: draft.looseTasks.map((t) => ({ ...t, key: nextKey() })),
  };
}

/** Removes the phase `key`; its tasks go with it (shown to the user as one row, same as the server treats it). */
export function removePhase(d: EditableDraft, key: string): EditableDraft {
  return { ...d, phases: d.phases.filter((p) => p.key !== key) };
}

/** Removes the task `key`, wherever it is — inside a phase or loose. */
export function removeTask(d: EditableDraft, key: string): EditableDraft {
  return {
    ...d,
    phases: d.phases.map((p) => ({ ...p, tasks: p.tasks.filter((t) => t.key !== key) })),
    looseTasks: d.looseTasks.filter((t) => t.key !== key),
  };
}

/** Renames the phase `key` (the inline edit the review screen offers). */
export function renamePhase(d: EditableDraft, key: string, name: string): EditableDraft {
  return { ...d, phases: d.phases.map((p) => (p.key === key ? { ...p, name } : p)) };
}

/** Renames the task `key`'s title, wherever it is. */
export function renameTask(d: EditableDraft, key: string, title: string): EditableDraft {
  const apply = (t: EditableTask) => (t.key === key ? { ...t, title } : t);
  return {
    ...d,
    phases: d.phases.map((p) => ({ ...p, tasks: p.tasks.map(apply) })),
    looseTasks: d.looseTasks.map(apply),
  };
}

const taskInputOf = (t: EditableTask): ProjectCreateTaskInput => ({
  title: t.title,
  description: t.description,
  priority: t.priority ?? undefined,
  kindName: t.kindName,
  dueDate: t.dueDate,
});

const phaseInputOf = (p: EditablePhase): ProjectCreatePhaseInput => ({
  name: p.name,
  description: p.description,
  startDate: p.startDate,
  endDate: p.endDate,
  tasks: p.tasks.map(taskInputOf),
});

/** `d` turned into the `POST /api/app/projects` body (plan §4.9): blanks left out so the server
 * applies its own defaults, same convention as `ProjectForm`'s `toCreateInput`. */
export function toCreateProjectInput(d: EditableDraft): ProjectCreateInput {
  const description = d.description.trim();
  return {
    name: d.name.trim(),
    ...(description ? { description } : {}),
    ...(d.priority ? { priority: d.priority } : {}),
    ...(d.startDate ? { startDate: d.startDate } : {}),
    ...(d.dueDate ? { dueDate: d.dueDate } : {}),
    phases: d.phases.map(phaseInputOf),
    looseTasks: d.looseTasks.map(taskInputOf),
  };
}
