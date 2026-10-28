import { today } from './clock';
import { daysBetween, monthDay } from './dates';
import type { Task, TaskStatus } from './sample';

/*
 * Tasks module shared types and logic, ported from the prototype (tasks.shared.js): the wide task the sample store
 * keeps (still fed by Events and Archive, gap §4.4) and its due notes against the sample "today".
 */

/** Task types of the module; the shared sample only uses Task and Bug ("Improvement" has no tasks yet). */
export type TaskType = 'Task' | 'Bug' | 'Improvement';
export type TaskPriority = Task['priority'];
export type { TaskStatus };

/** A task as the Tasks module keeps it: the shared sample row plus its next step, last update and tags. */
export type TaskItem = Omit<Task, 'type'> & {
  type: TaskType;
  /** Next step label of the prototype ("Start", "Request review"). */
  next: string;
  /** Last change, ISO local date-time ("2026-10-07T09:41"). */
  updated: string;
  tags: string[];
};

export type TaskStep = { text: string; done: boolean };
export type TaskProof = { file: string; caption: string };
/** History line; `on` = ISO date, null for a line without one (a task created outside the sample). */
export type TaskLog = { text: string; on: string | null };

/** Extras of a task shown on its detail (the prototype's taskDetail). */
export type TaskInfo = {
  phase?: string;
  desc: string;
  /** First name of whoever created the task, and when (ISO; absent when unknown). */
  by: string;
  on?: string;
  /** Reviewer as the detail names it ("Admin", "Nico (creator, Manager)"); absent = no review. */
  reviewer?: string;
  /** Review request: first name of who asked, and when (ISO); the banner wording depends on the viewer. */
  asked?: { by: string; on: string };
  steps: TaskStep[];
  proof: TaskProof[];
  history: TaskLog[];
  canceled?: { by: string; reason: string };
  /** How many times the task was returned from review. */
  returned?: number;
  /** Start date (ISO) and estimated hours from New task · Fill form. */
  start?: string;
  hours?: string;
};

/** The prototype's clock, so a change counts as "recently updated" today. */
export const CLOCK = '09:41';
/** Today at the prototype's clock, as an `updated` stamp. A function: the server's clock is not in at import time. */
export const nowStamp = () => `${today()}T${CLOCK}`;
/** "Oct 7", for history lines and notes. */
export const todayLabel = () => monthDay(today());
/** Id of the sample project All tasks starts on. */
export const ATLAS_ID = 'atlas';

/** [type, base category label]. */
export const TYPES: readonly (readonly [TaskType, string])[] = [
  ['Task', 'Task (task)'],
  ['Bug', 'Issue (issue)'],
  ['Improvement', 'Idea (idea)'],
];

/** "1 day late", "3 days late": the facts' due note, and the text a late card shows beside its red date. */
export const daysLate = (n: number) => `${n} ${n === 1 ? 'day' : 'days'} late`;

/** Due note from a due date: "N days overdue", "Today", "Tomorrow" (when `tomorrow`) or "Due X". */
export function whenFromDue(due: string, tomorrow: boolean): string {
  const d = daysBetween(today(), due);
  if (d < 0) return `${-d} days overdue`;
  if (d === 0) return 'Today';
  return d === 1 && tomorrow ? 'Tomorrow' : `Due ${monthDay(due)}`;
}
