// Project changes, ported from the prototype's projects.store.js: the detail ⋯ › Edit project form writes its fields
// (a rename carries over to the project's tasks), Move to Archive takes the project and its tasks out of every list
// into Archive until Undo, and the Members tab changes roles or removes a member. Screens read through projects.ts;
// other modules (Tasks, Home) read projects through the getters here, so a renamed or archived project shows as such.
import { addEntry, findEntry, removeEntry } from './archive.store';
import { BASE_QUERY, type ProjectsQuery } from './projects.query';
import { PROJECTS, type Project, TODAY } from './sample';
import {
  type ActivityLine,
  PROJECT_DETAIL,
  PROJECT_EXTRA,
  PROJECT_ROLES,
  type ProjectExtra,
  type ProjectRole,
} from './sample/projects.extra';
import { createStore, useStore } from './store';
import type { TaskPriority } from './tasks.shared';
import {
  getTasksState,
  putTasksBack,
  renameProjectTasks,
  type TakenTasks,
  takeProjectTasks,
} from './tasks.store';

/** A project as the module keeps it: the shared sample row, its health, description, priority and member roles. */
export type ProjectItem = Project &
  ProjectExtra & {
    desc: string;
    priority: TaskPriority;
    /** Role of every member, by first name. */
    roles: Readonly<Record<string, ProjectRole>>;
  };

/** What the Edit project form saves; `due` and `started` are ISO dates. */
export type ProjectFields = Pick<
  ProjectItem,
  'name' | 'desc' | 'lead' | 'status' | 'priority' | 'due'
> &
  Partial<Pick<ProjectItem, 'started'>>;

/** An archived project Undo can take back: its Archive entry, list place and the tasks it took along. */
type Held = { key: string; id: string; at: number; taken: TakenTasks };

export type ProjectsState = {
  /** Listed projects, in the sample's order. */
  list: readonly ProjectItem[];
  /** Projects in Archive: out of every list, still found by id. */
  archived: readonly ProjectItem[];
  held: readonly Held[];
  /** Recent activity per project id, newest first. */
  activity: Readonly<Record<string, readonly ActivityLine[]>>;
};

const DEFAULT_PRIORITY: TaskPriority = 'Medium';

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

const store = createStore<ProjectsState>(INITIAL);
/** The list's Filter & sort query (phase1-screens.md K4). */
const queryStore = createStore<ProjectsQuery>(BASE_QUERY);

/** "1 task", "8 tasks". */
export const taskCount = (n: number) => `${n} task${n === 1 ? '' : 's'}`;

/** Project id, listed or archived. */
export function findProject(id: string, s: ProjectsState = store.get()): ProjectItem | undefined {
  return s.list.find((p) => p.id === id) ?? s.archived.find((p) => p.id === id);
}

/** Project by its current name, listed or archived (a task names its project). */
export function getProjectByName(name: string): ProjectItem | undefined {
  const s = store.get();
  return s.list.find((p) => p.name === name) ?? s.archived.find((p) => p.name === name);
}

/** Listed projects, in the sample's order; archived ones are left out. */
export const listProjects = () => store.get().list;

/** Projects in Archive. */
export const listArchivedProjects = () => store.get().archived;

/** True while project id waits in Archive. */
export const isArchivedProject = (id: string) => store.get().archived.some((p) => p.id === id);

/** Listed project id, or throw saying what could not be done to it. */
function listed(id: string, action: string): ProjectItem {
  const p = store.get().list.find((x) => x.id === id);
  if (!p) throw new Error(`Cannot ${action} project "${id}": not in the project list`);
  return p;
}

const swap = (list: readonly ProjectItem[], next: ProjectItem) =>
  list.map((p) => (p.id === next.id ? next : p));

/** Write p (already listed) and, when given, an activity line for it. */
function save(p: ProjectItem, log?: string) {
  store.set((s) => ({
    ...s,
    list: swap(s.list, p),
    activity: log
      ? { ...s.activity, [p.id]: [{ text: log, on: TODAY }, ...(s.activity[p.id] ?? [])] }
      : s.activity,
  }));
}

/** Listed tasks of project id, counted for the Move to Archive sheet. */
export function taskCountOf(id: string): number {
  const p = findProject(id);
  if (!p) throw new Error(`Cannot count the tasks of project "${id}": no such project`);
  return getTasksState().tasks.filter((t) => t.project === p.name).length;
}

/** Save the Edit project form for project id; a new name carries over to its tasks; the edit is logged. */
export function editProject(id: string, fields: ProjectFields, editor: string): void {
  const p = listed(id, 'edit');
  const name = fields.name.trim();
  if (!name) throw new Error(`Cannot edit project "${id}": the name is blank`);
  if (!p.members.includes(fields.lead)) {
    throw new Error(`Cannot edit project "${id}": Lead ${fields.lead} is not a member`);
  }
  const roles = { ...p.roles, [fields.lead]: 'Manager' as const };
  save({ ...p, ...fields, name, desc: fields.desc.trim(), roles }, `${editor} edited the project`);
  if (name !== p.name) renameProjectTasks(p.name, name);
}

/** Give `name` the project role `role`; the Lead stays Manager. */
export function setMemberRole(id: string, name: string, role: ProjectRole): void {
  const p = listed(id, 'change a role in');
  if (!p.members.includes(name)) throw new Error(`Cannot change ${name}'s role: not in "${id}"`);
  if (name === p.lead && role !== 'Manager') {
    throw new Error(`Cannot change ${name}'s role: the Lead of "${id}" stays Manager`);
  }
  save({ ...p, roles: { ...p.roles, [name]: role } });
}

/** Take `name` out of the project; the Lead can't be removed. */
export function removeMember(id: string, name: string): void {
  const p = listed(id, 'remove a member from');
  if (!p.members.includes(name)) throw new Error(`Cannot remove ${name}: not in "${id}"`);
  if (name === p.lead) throw new Error(`Cannot remove ${name}: the Lead of "${id}" stays`);
  const { [name]: _, ...roles } = p.roles;
  save({ ...p, members: p.members.filter((n) => n !== name), roles });
}

/** Move project id to Archive with its listed tasks, archived by `by`. Returns the Archive entry key. */
export function archiveProject(id: string, by: string): string {
  const p = listed(id, 'archive');
  const s = store.get();
  const at = s.list.indexOf(p);
  // The entry first: if Archive refuses it, the tasks have not moved yet.
  const { key } = addEntry({
    kind: 'PROJECT',
    title: p.name,
    where: 'Project',
    by,
    date: TODAY,
    includes: taskCount(taskCountOf(id)),
    ref: id,
  });
  const taken = takeProjectTasks(p.name);
  store.set({
    ...s,
    list: s.list.filter((x) => x !== p),
    archived: [...s.archived, p],
    held: [{ key, id, at, taken }, ...s.held],
  });
  return key;
}

/** True while archive move `key` of project id can be undone; Delete forever in Archive (its entry gone) ends it. */
export const canRestoreProject = (id: string, key: string) =>
  !!findEntry(key) && store.get().held.some((h) => h.id === id && h.key === key);

/** Undo / Restore of archived project id (only if it is move `key`, when given): back in its place, tasks too. */
export function restoreProject(id: string, key?: string): void {
  const s = store.get();
  const h = s.held.find((x) => x.id === id && (key === undefined || x.key === key));
  const p = s.archived.find((x) => x.id === id);
  if (!h || !p) {
    const which = key ? ` (archive entry "${key}")` : '';
    throw new Error(`Cannot restore project "${id}"${which}: not in Archive`);
  }
  removeEntry(h.key);
  const list = [...s.list];
  list.splice(Math.min(h.at, list.length), 0, p);
  store.set({
    ...s,
    list,
    archived: s.archived.filter((x) => x !== p),
    held: s.held.filter((x) => x !== h),
  });
  putTasksBack(h.taken);
}

/**
 * Archive › Delete forever of entry `key` (call before removeEntry): the project is gone for good, findProject no
 * longer finds it and restoreProject throws "not in Archive". The tasks it took along stay out of every list. A key
 * this store does not hold (the sample entries, which no list ever had) is left alone.
 */
export function forgetArchivedProject(key: string): void {
  const s = store.get();
  const h = s.held.find((x) => x.key === key);
  // An entry that came with the Archive sample (no project of the store behind it) has nothing to forget here.
  if (!h) return;
  const { [h.id]: _, ...activity } = s.activity;
  store.set({
    ...s,
    archived: s.archived.filter((p) => p.id !== h.id),
    held: s.held.filter((x) => x !== h),
    activity,
  });
}

/** Every project back to the sample and the query to its default; Archive and Tasks have their own resets. test-only */
export function resetProjects(): void {
  store.reset();
  queryStore.reset();
}

/** Current state (the getters in projects.ts). */
export const getProjectsState = () => store.get();

/** Save the Filter & sort query (Apply / Reset filters). */
export const setProjectsQuery = (q: ProjectsQuery) => queryStore.set(q);

/** The query in a component. */
export const useProjectsQuery = () => useStore(queryStore);

/** Project state in a component, re-rendered after every change. */
export const useProjectsState = () => useStore(store);
