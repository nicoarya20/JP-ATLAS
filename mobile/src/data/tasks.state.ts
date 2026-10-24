import { getProjectByName } from './projects.state';
import { TASK_REVIEWERS, TASKS, TODAY } from './sample';
import { TASK_DETAIL, TASK_EXTRA } from './sample/tasks.extra';
import { createStore, useStore } from './store';
import type { TaskInfo, TaskItem } from './tasks.shared';

/*
 * State of the Tasks module (prototype D.tasks, D.archivedTasks, D.taskDetail) and its reads. Changes go through
 * tasks.store; only tasks.store* write `tasksStore`. State is immutable.
 */

export type TasksState = {
  /** Listed tasks, in the sample's order. */
  tasks: readonly TaskItem[];
  /** Tasks out of the lists: archived one by one, or taken along by an archived project. */
  archived: readonly TaskItem[];
  /** Detail extras per task number; a task without an entry gets one from taskInfo(). */
  info: Readonly<Record<number, TaskInfo>>;
  /** List index each task archived on its own had, so Undo puts it back in place. */
  at: Readonly<Record<number, number>>;
  /** Highest task number given out so far, deleted tasks included, so addTask never reuses one. */
  top: number;
};

/** Where tasks taken by takeProjectTasks sat, for putTasksBack. */
export type TakenTasks = readonly { at: number; no: number }[];

/** Edit task fields that live on the task itself. */
export type TaskFields = Partial<
  Pick<TaskItem, 'title' | 'who' | 'also' | 'due' | 'priority' | 'type' | 'tags'>
>;
/** Edit task fields that live in the detail extras. */
export type TaskExtras = Partial<
  Pick<
    TaskInfo,
    'phase' | 'desc' | 'reviewer' | 'steps' | 'proof' | 'asked' | 'canceled' | 'returned'
  >
>;
/** New task: `due` is an ISO date (YYYY-MM-DD). */
export type NewTaskFields = Pick<
  TaskItem,
  'title' | 'project' | 'who' | 'due' | 'priority' | 'type' | 'tags'
> & { also?: string[] };
export type NewTaskExtras = Pick<TaskInfo, 'desc'> &
  Partial<Pick<TaskInfo, 'phase' | 'reviewer' | 'start' | 'hours'>>;

const INITIAL: TasksState = {
  tasks: TASKS.map((t) => ({ ...t, ...TASK_EXTRA[t.no] })),
  archived: [],
  info: Object.fromEntries(
    Object.entries(TASK_DETAIL).map(([no, x]) => [no, { ...x, reviewer: TASK_REVIEWERS[+no] }]),
  ),
  at: {},
  top: Math.max(...TASKS.map((t) => t.no)),
};

/** The task state; written only by tasks.store and tasks.store.edit. */
export const tasksStore = createStore<TasksState>(INITIAL);

/** Current state (tests and the getters in tasks.ts). */
export const getTasksState = () => tasksStore.get();

/** Read the task state in a component; re-renders when the selected value changes. */
export const useTasks = <S>(select: (state: TasksState) => S) => useStore(tasksStore, select);

/** Task by number, archived ones included. */
export const findTask = (s: TasksState, no: number) =>
  s.tasks.find((t) => t.no === no) ?? s.archived.find((t) => t.no === no);

/** Task by number from the current state, archived ones included. */
export const getTask = (no: number) => findTask(tasksStore.get(), no);

export function taskOrThrow(s: TasksState, no: number, action: string): TaskItem {
  const t = findTask(s, no);
  if (!t) throw new Error(`Cannot ${action} task #${no}: no such task`);
  return t;
}

/** Extras of a task; one without any only gets who created it (its project lead), nothing invented. */
export function taskInfo(s: TasksState, no: number): TaskInfo {
  const x = s.info[no];
  if (x) return x;
  const t = taskOrThrow(s, no, 'read');
  // The project's Lead now (Edit project may have changed it), not the sample's.
  const lead = getProjectByName(t.project)?.lead ?? '';
  const history = lead ? [{ text: `${lead} created this task`, on: null }] : [];
  return { desc: '', by: lead, steps: [], proof: [], history };
}

/** Extras with a dated history line added (log may be absent). */
export function record(s: TasksState, no: number, log?: string, extras?: Partial<TaskInfo>) {
  const base = taskInfo(s, no);
  const history = log ? [...base.history, { text: log, on: TODAY }] : base.history;
  return { ...s.info, [no]: { ...base, ...extras, history } };
}

const replace = (list: readonly TaskItem[], next: TaskItem) =>
  list.map((t) => (t.no === next.no ? next : t));

/** Put `next` wherever its task sits: the lists or the archived ones. */
export const put = (s: TasksState, next: TaskItem) => ({
  tasks: replace(s.tasks, next),
  archived: replace(s.archived, next),
});
