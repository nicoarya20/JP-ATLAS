// Team workload from the live task list: a person's active tasks (anything not Done or Canceled) and which of them are overdue.
import { D } from '../../data/sample';
import { days, isOpen } from '../tasks/tasks.shared';

/** True when task t is past its due date. */
export const isOverdue = t => !!t.due && days(t.due) < 0;
/** Active tasks of a person, by first name. */
export const activeOf = name => D.tasks.filter(t => t.who === name && isOpen(t));
/** { active, overdue } task counts of a person, by first name. */
export function loadOf(name) {
  const tasks = activeOf(name);
  return { active: tasks.length, overdue: tasks.filter(isOverdue).length };
}
/** "3 active tasks · 1 overdue" summed over people (first names). */
export function totalOf(names) {
  const sum = names.map(loadOf).reduce((a, b) => ({ active: a.active + b.active, overdue: a.overdue + b.overdue }), { active: 0, overdue: 0 });
  return `${sum.active} active tasks · ${sum.overdue} overdue`;
}
