import { addEntry, entryKey, findEntry, removeEntry } from './archive.store';
import { today } from './clock';
import { TASKS, type TaskStatus } from './sample';
import { nowStamp, type TaskItem, todayLabel, whenFromDue } from './tasks.shared';
import {
  put,
  record,
  tasksStore as store,
  type TakenTasks,
  type TaskExtras,
  taskOrThrow,
} from './tasks.state';

/*
 * Task changes of the sample store (prototype tasks.store.js), kept while Events and Archive still read it (gap §4.4):
 * a status move, a meeting outcome adding a task (tasks.store.edit) and Move to Archive, which takes a task out of every
 * list into Archive (archive.store). The Tasks screens themselves write to the server.
 */

export {
  findTask,
  getTask,
  getTasksState,
  type NewTaskExtras,
  type NewTaskFields,
  type TakenTasks,
  type TaskExtras,
  type TasksState,
  taskInfo,
  useTasks,
} from './tasks.state';
export { addTask } from './tasks.store.edit';

const ORIGINAL = new Map(TASKS.map((t) => [t.no, t]));

/** Due note after a move: Done or Canceled today, else the sample note, or one from the due date. */
function whenOf(t: TaskItem, status: TaskStatus): string {
  if (status === 'Done') return `Done ${todayLabel()}`;
  if (status === 'Canceled') return `Canceled ${todayLabel()}`;
  const o = ORIGINAL.get(t.no);
  return o && o.status !== 'Done' ? o.when : whenFromDue(t.due, false);
}

/**
 * Give task #no a new status (a Kanban move or a detail action). log = history line ("Nico started working"),
 * extras = detail keys to set (asked, returned, canceled). Same status = nothing changes.
 */
export function moveTask(
  no: number,
  status: TaskStatus,
  { log, extras }: { log?: string; extras?: TaskExtras } = {},
) {
  const s = store.get();
  const t = taskOrThrow(s, no, 'move');
  if (t.status === status) return;
  const next = { ...t, status, when: whenOf(t, status), updated: nowStamp() };
  store.set({ ...s, ...put(s, next), info: log || extras ? record(s, no, log, extras) : s.info });
}

/** Move task #no to Archive: it leaves every list and Archive lists it as archived by `by`, until Undo. */
export function archiveTask(no: number, by: string) {
  const s = store.get();
  const i = s.tasks.findIndex((t) => t.no === no);
  if (i < 0) throw new Error(`Cannot archive task #${no}: not in the task lists`);
  const t = s.tasks[i];
  addEntry({
    kind: 'TASK',
    title: `#${no} ${t.title}`,
    where: t.project,
    by,
    date: today(),
    ref: no,
  });
  store.set({
    ...s,
    tasks: s.tasks.filter((x) => x.no !== no),
    archived: [...s.archived, t],
    info: record(s, no, `${by} moved this task to Archive`),
    at: { ...s.at, [no]: i },
  });
}

/** Undo of archived task #no: back in the lists where it was, and out of Archive. */
export function unarchiveTask(no: number) {
  const s = store.get();
  const key = entryKey('TASK', no);
  const t = s.archived.find((x) => x.no === no);
  if (!t || !findEntry(key) || s.at[no] == null) {
    throw new Error(`Cannot restore task #${no}: not in Archive`);
  }
  removeEntry(key);
  const tasks = [...s.tasks];
  tasks.splice(Math.min(s.at[no], tasks.length), 0, t);
  const { [no]: _, ...at } = s.at;
  store.set({ ...s, tasks, archived: s.archived.filter((x) => x !== t), at });
}

/** Archived tasks: one by one or with their project. */
export const listArchivedTasks = () => store.get().archived;

/**
 * Take every listed task of project `name` out of the lists (the project moves to Archive). Returns where they sat,
 * which putTasksBack needs to put them back.
 */
export function takeProjectTasks(name: string): TakenTasks {
  const s = store.get();
  const taken = s.tasks.flatMap((t, at) => (t.project === name ? [{ at, no: t.no }] : []));
  const nos = new Set(taken.map((x) => x.no));
  store.set({
    ...s,
    tasks: s.tasks.filter((t) => !nos.has(t.no)),
    archived: [...s.archived, ...s.tasks.filter((t) => nos.has(t.no))],
  });
  return taken;
}

/** Put tasks taken by takeProjectTasks back at their places (the project came back from Archive). */
export function putTasksBack(taken: TakenTasks) {
  const s = store.get();
  const tasks = [...s.tasks];
  const nos = new Set(taken.map((x) => x.no));
  for (const { at, no } of taken) {
    const t = s.archived.find((x) => x.no === no);
    if (!t) throw new Error(`Cannot put task #${no} back: it is not out of the lists`);
    tasks.splice(Math.min(at, tasks.length), 0, t);
  }
  store.set({ ...s, tasks, archived: s.archived.filter((t) => !nos.has(t.no)) });
}

/** A project was renamed: its tasks, listed and archived, follow the new name. */
export function renameProjectTasks(from: string, to: string) {
  const rename = (list: readonly TaskItem[]) =>
    list.map((t) => (t.project === from ? { ...t, project: to } : t));
  store.set((s) => ({ ...s, tasks: rename(s.tasks), archived: rename(s.archived) }));
}

/** Every task and its extras back to the sample. test-only (Archive has its own resetArchive). */
export const resetTasks = () => store.reset();
