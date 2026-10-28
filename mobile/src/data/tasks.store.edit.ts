import { listEntries } from './archive.store';
import { today } from './clock';

import { nowStamp, type TaskInfo, type TaskItem, whenFromDue } from './tasks.shared';
import { type NewTaskExtras, type NewTaskFields, tasksStore as store } from './tasks.state';

/* Adding a task to the sample store (prototype tasks.store.js addTask): what a meeting's outcomes create (Events). */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Due note after the due date changed: kept for Done tasks, else counted from the new date. */
const whenOfDue = (t: TaskItem) => (t.status === 'Done' ? t.when : whenFromDue(t.due, true));

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
  const no = Math.max(s.top, ...[...s.tasks, ...s.archived].map((t) => t.no), ...archivedNos()) + 1;
  const base: TaskItem = {
    no,
    status: 'To do',
    next: 'Start',
    updated: nowStamp(),
    when: '',
    ...fields,
  };
  const info: TaskInfo = {
    ...extras,
    by: creator,
    on: today(),
    steps: [],
    proof: [],
    history: [{ text: `${creator} created this task`, on: today() }],
  };
  store.set({
    ...s,
    tasks: [...s.tasks, { ...base, when: whenOfDue(base) }],
    info: { ...s.info, [no]: info },
    top: no,
  });
  return no;
}
