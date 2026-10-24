import { listEntries } from './archive.store';
import { TODAY } from './sample';
import { NOW, type TaskInfo, type TaskItem, whenFromDue } from './tasks.shared';
import {
  type NewTaskExtras,
  type NewTaskFields,
  put,
  record,
  tasksStore as store,
  type TaskExtras,
  type TaskFields,
  taskOrThrow,
} from './tasks.state';

/* Edit task and New task writes of the Tasks module (prototype tasks.store.js editTask, addTask). */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Due note after the due date changed: kept for Done tasks, else counted from the new date. */
const whenOfDue = (t: TaskItem) => (t.status === 'Done' ? t.when : whenFromDue(t.due, true));

/** Save Edit task for task #no; the history logs who edited it. */
export function editTask(no: number, fields: TaskFields, extras: TaskExtras, editor: string) {
  const s = store.get();
  const t = taskOrThrow(s, no, 'edit');
  const edited = { ...t, ...fields, updated: NOW };
  const next =
    fields.due !== undefined && fields.due !== t.due
      ? { ...edited, when: whenOfDue(edited) }
      : edited;
  store.set({ ...s, ...put(s, next), info: record(s, no, `${editor} edited this task`, extras) });
}

/** Task numbers Archive already lists ("task-21"), which a new task must not take. */
const archivedNos = () =>
  listEntries().flatMap((e) => {
    const m = /^task-(\d+)$/.exec(e.key);
    return m ? [Number(m[1])] : [];
  });

/** Add a To do task (New task · Fill form, or meeting outcomes). Returns the new task number. */
export function addTask(fields: NewTaskFields, extras: NewTaskExtras, creator: string): number {
  if (!ISO_DATE.test(fields.due)) {
    throw new Error(
      `Cannot add task "${fields.title}": due must be an ISO date, got "${fields.due}"`,
    );
  }
  const s = store.get();
  const no = Math.max(...[...s.tasks, ...s.archived].map((t) => t.no), ...archivedNos()) + 1;
  const base: TaskItem = { no, status: 'To do', next: 'Start', updated: NOW, when: '', ...fields };
  const info: TaskInfo = {
    ...extras,
    by: creator,
    on: TODAY,
    steps: [],
    proof: [],
    history: [{ text: `${creator} created this task`, on: TODAY }],
  };
  store.set({
    ...s,
    tasks: [...s.tasks, { ...base, when: whenOfDue(base) }],
    info: { ...s.info, [no]: info },
  });
  return no;
}
