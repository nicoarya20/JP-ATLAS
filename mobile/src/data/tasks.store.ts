import { addEntry, entryKey, findEntry, removeEntry } from './archive.store';
import type { PersonInfo } from './people';
import { TASKS, type TaskStatus, TODAY } from './sample';
import { movedNotice } from './tasks.columns';
import { mayChange, NOW, type TaskItem, TODAY_LABEL, whenFromDue } from './tasks.shared';
import {
  put,
  record,
  tasksStore as store,
  type TakenTasks,
  type TaskExtras,
  taskOrThrow,
} from './tasks.state';

/*
 * Task changes (prototype tasks.store.js): a Kanban move or a detail action writes the new status, Edit task writes its
 * fields (tasks.store.edit), New task adds one, Cancel task is a move to Canceled (the task stays listed) and Move to
 * Archive takes it out of every list into Archive (archive.store). Screens read the state through useTasks().
 */

export {
  findTask,
  getTask,
  getTasksState,
  type NewTaskExtras,
  type NewTaskFields,
  type TakenTasks,
  type TaskExtras,
  type TaskFields,
  type TasksState,
  taskInfo,
  useTasks,
} from './tasks.state';
export { addTask, editTask } from './tasks.store.edit';

const ORIGINAL = new Map(TASKS.map((t) => [t.no, t]));

/** Due note after a move: Done or Canceled today, else the sample note, or one from the due date. */
function whenOf(t: TaskItem, status: TaskStatus): string {
  if (status === 'Done') return `Done ${TODAY_LABEL}`;
  if (status === 'Canceled') return `Canceled ${TODAY_LABEL}`;
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
  const next = { ...t, status, when: whenOf(t, status), updated: NOW };
  store.set({ ...s, ...put(s, next), info: log || extras ? record(s, no, log, extras) : s.info });
}

/**
 * Move several tasks to `status` at once (a Kanban group move); only those in another status change.
 * Returns the numbers that moved.
 */
export function moveTasks(nos: readonly number[], status: TaskStatus): number[] {
  const s = store.get();
  const moving = nos.filter((no) => taskOrThrow(s, no, 'move').status !== status);
  for (const no of moving) moveTask(no, status);
  return moving;
}

/**
 * Kanban move by `viewer` of the held card (nos = [no]) or a group (held card first) to `status`, also the "Move to …"
 * accessibility action. A Member moves only tasks assigned to them; the board checks mayChange() before opening the
 * menu, so a refused task here is a bug and throws. Returns the numbers that moved and the notice to show (null when
 * one card was let go on its own status).
 */
export function moveOnBoard(
  viewer: PersonInfo,
  nos: readonly number[],
  status: TaskStatus,
): { moved: number[]; notice: string | null } {
  const s = store.get();
  const refused = nos.find((no) => !mayChange(viewer, taskOrThrow(s, no, 'move')));
  if (refused != null) {
    throw new Error(`Cannot move task #${refused}: ${viewer.name} may not change it`);
  }
  const moved = moveTasks(nos, status);
  const group = nos.length > 1;
  return { moved, notice: group || moved.length ? movedNotice(group, moved.length, status) : null };
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
    date: TODAY,
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

/**
 * Archive › Delete forever of entry `key` (call before removeEntry): a task archived on its own is gone for good, so
 * getTask() no longer finds it and unarchiveTask() throws "not in Archive". Its number is not given out again. A key
 * this store does not hold (the sample entries, a task taken along by its project) is left alone.
 */
export function forgetArchivedTask(key: string): void {
  const s = store.get();
  const t = s.archived.find((x) => s.at[x.no] != null && entryKey('TASK', x.no) === key);
  if (!t) return;
  const { [t.no]: _at, ...at } = s.at;
  const { [t.no]: _info, ...info } = s.info;
  store.set({ ...s, archived: s.archived.filter((x) => x !== t), info, at });
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
