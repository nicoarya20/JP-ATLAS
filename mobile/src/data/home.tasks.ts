import { today } from './clock';
import { monthDay } from './dates';
import type { TaskItem } from './tasks.shared';

/*
 * Task helpers of the Home data, ported from the prototype (home.stats.js doneOn): when a Done task was completed.
 */

/** The sample's own Done dates, and "Done Oct 7" as the task store writes it when a task is moved to Done today. */
const doneToday = () => `Done ${monthDay(today())}`;

/** Completion date (ISO) of a Done task; undefined when it is not done or the date is unknown. */
export function doneOn(t: Pick<TaskItem, 'status' | 'when' | 'doneOn'>): string | undefined {
  if (t.status !== 'Done') return undefined;
  return t.doneOn ?? (t.when === doneToday() ? today() : undefined);
}
