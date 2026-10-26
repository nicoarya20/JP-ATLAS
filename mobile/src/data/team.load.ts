// Team workload from the live task list (prototype team.load.js): a person's active tasks (anything not Done or Canceled)
// and which of them are overdue.

import { dueIn, isOpen, type TaskItem } from './tasks.shared';
import { getTasksState } from './tasks.state';

export type Load = { active: number; overdue: number };

/** True when the task is past its due date. */
export const isOverdue = (t: Pick<TaskItem, 'due'>) => !!t.due && dueIn(t) < 0;

/** Active tasks of a person (by first name), in list order. */
export const activeOf = (name: string, tasks: readonly TaskItem[] = getTasksState().tasks) =>
  tasks.filter((t) => t.who === name && isOpen(t));

/** { active, overdue } task counts of a person, by first name. */
export function loadOf(name: string, tasks: readonly TaskItem[] = getTasksState().tasks): Load {
  const mine = activeOf(name, tasks);
  return { active: mine.length, overdue: mine.filter(isOverdue).length };
}

/** "3 active tasks · 1 overdue", summed over people (first names). */
export function totalOf(
  names: readonly string[],
  tasks: readonly TaskItem[] = getTasksState().tasks,
) {
  const sum = names
    .map((n) => loadOf(n, tasks))
    .reduce((a, b) => ({ active: a.active + b.active, overdue: a.overdue + b.overdue }), {
      active: 0,
      overdue: 0,
    });
  return `${sum.active} active tasks · ${sum.overdue} overdue`;
}
