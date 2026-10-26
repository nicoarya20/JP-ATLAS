import { PROJECTS, type Project, type Task } from './sample';
import {
  type ActivityLine,
  PROJECT_DETAIL,
  PROJECT_EXTRA,
  PROJECT_ROLES,
  type ProjectExtra,
  type ProjectRole,
} from './sample/projects.extra';
import { createStore, useStore } from './store';

/*
 * State of the Projects module and its reads, for every module (Tasks reads project names and Leads here). Changes go
 * through projects.store; only projects.store writes `projectsStore`. This file imports nothing from tasks*, so the
 * Tasks state can read projects without an import cycle (tasks.state → projects.store → tasks.store → tasks.state).
 */

/** A project as the module keeps it: the shared sample row, its health, description, priority and member roles. */
export type ProjectItem = Project &
  ProjectExtra & {
    desc: string;
    priority: Task['priority'];
    /** Role of every member, by first name. */
    roles: Readonly<Record<string, ProjectRole>>;
  };

/** An archived project Undo can take back: its Archive entry, list place and the tasks it took along (TakenTasks). */
export type HeldProject = {
  key: string;
  id: string;
  at: number;
  taken: readonly { at: number; no: number }[];
};

export type ProjectsState = {
  /** Listed projects, in the sample's order. */
  list: readonly ProjectItem[];
  /** Projects in Archive: out of every list, still found by id. */
  archived: readonly ProjectItem[];
  held: readonly HeldProject[];
  /** Recent activity per project id, newest first. */
  activity: Readonly<Record<string, readonly ActivityLine[]>>;
};

const DEFAULT_PRIORITY: Task['priority'] = 'Medium';

function fromSample(p: Project): ProjectItem {
  const extra = PROJECT_EXTRA[p.id];
  if (!extra) throw new Error(`Sample project "${p.id}" has no entry in sample/projects.extra.ts`);
  const set = PROJECT_ROLES[p.id] ?? {};
  const roles = Object.fromEntries(
    p.members.map((n) => [n, set[n] ?? (n === p.lead ? 'Manager' : 'Member')]),
  );
  return { ...p, ...extra, desc: '', priority: DEFAULT_PRIORITY, roles };
}

const INITIAL: ProjectsState = {
  list: PROJECTS.map(fromSample),
  archived: [],
  held: [],
  activity: Object.fromEntries(Object.entries(PROJECT_DETAIL).map(([id, d]) => [id, d.activity])),
};

/** The project state; written only by projects.store. */
export const projectsStore = createStore<ProjectsState>(INITIAL);

/** Project id, listed or archived. */
export function findProject(
  id: string,
  s: ProjectsState = projectsStore.get(),
): ProjectItem | undefined {
  return s.list.find((p) => p.id === id) ?? s.archived.find((p) => p.id === id);
}

/** Project by its current name, listed or archived (a task names its project). */
export function getProjectByName(name: string): ProjectItem | undefined {
  const s = projectsStore.get();
  return s.list.find((p) => p.name === name) ?? s.archived.find((p) => p.name === name);
}

/**
 * True when another project than `exceptId`, listed or archived, already has `name` (trimmed, any case). Tasks name
 * their project in Phase 1, so two projects with one name would share their tasks.
 */
export function projectNameTaken(name: string, exceptId?: string): boolean {
  const key = name.trim().toLowerCase();
  const s = projectsStore.get();
  return [...s.list, ...s.archived].some((p) => p.id !== exceptId && p.name.toLowerCase() === key);
}

/** Listed projects, in the sample's order; archived ones are left out. */
export const listProjects = () => projectsStore.get().list;

/** Projects in Archive. */
export const listArchivedProjects = () => projectsStore.get().archived;

/** True while project id waits in Archive. */
export const isArchivedProject = (id: string) =>
  projectsStore.get().archived.some((p) => p.id === id);

/** Current state (the getters in projects.ts). */
export const getProjectsState = () => projectsStore.get();

/** Project state in a component, re-rendered after every change. */
export const useProjectsState = () => useStore(projectsStore);
