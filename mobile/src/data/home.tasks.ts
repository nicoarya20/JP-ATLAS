import { daysBetween } from './dates';
import { TASKS, type Task, TODAY } from './sample';

/*
 * Task helpers of the Home data, ported from the prototype (tasks.shared.js, tasks.store.js): open/assigned checks,
 * days to a due date, and the task list with the tasks marked done on this screen applied.
 */

export const isOpen = (t: Task) => t.status !== 'Done' && t.status !== 'Canceled';

/** True when `name` is one of the task's assignees. */
export const isAssigned = (t: Task, name: string) =>
  t.who === name || (t.also ?? []).includes(name);

/** Days from today to the due date (negative = overdue). */
export const dueIn = (t: Task) => daysBetween(TODAY, t.due);

/** Sample tasks, with `completed` task numbers moved to Done today (the prototype's Done button). */
export function tasksWith(completed: readonly number[]): Task[] {
  return TASKS.map((t) =>
    completed.includes(t.no) && isOpen(t)
      ? { ...t, status: 'Done', when: 'Done today', doneOn: TODAY }
      : t,
  );
}
