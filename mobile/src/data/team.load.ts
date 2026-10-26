// Team workload from the live task list (prototype team.load.js): a person's active tasks (anything not Done or Canceled)
// and which of them are overdue.

import { dueIn, isOpen, type TaskItem } from './tasks.shared';
import { getTasksState } from './tasks.state';
import { identityRef, type PersonRef, samePerson } from './viewer';

export type Load = { active: number; overdue: number };

/** True when the task is past its due date. */
export const isOverdue = (t: Pick<TaskItem, 'due'>) => !!t.due && dueIn(t) < 0;

/**
 * Active tasks of a person, in list order. The reference is resolved to one person first and the
 * rows are matched on identity (K4): two people sharing a first name would otherwise share tasks.
 */
export const activeOf = (ref: PersonRef, tasks: readonly TaskItem[] = getTasksState().tasks) => {
  const who = identityRef(ref);
  return who ? tasks.filter((t) => samePerson(t.who, who) && isOpen(t)) : [];
};

/** { active, overdue } task counts of a person. */
export function loadOf(ref: PersonRef, tasks: readonly TaskItem[] = getTasksState().tasks): Load {
  const mine = activeOf(ref, tasks);
  return { active: mine.length, overdue: mine.filter(isOverdue).length };
}

/** "3 active tasks · 1 overdue", summed over people. */
export function totalOf(
  names: readonly PersonRef[],
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
