import { daysBetween, monthDay } from './dates';
import { type PersonInfo, person } from './people';
import type { Task, TaskStatus } from './sample';
import { TODAY } from './sample';

/*
 * Tasks module shared types and logic, ported from the prototype (tasks.shared.js): the wide task the module keeps,
 * due-date maths against the sample "today", review notes and which detail variant opens a task.
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

export type DetailVariant = 'todo' | 'progress' | 'review';

/** The prototype's clock, so a change counts as "recently updated" today. */
export const CLOCK = '09:41';
export const NOW = `${TODAY}T${CLOCK}`;
/** "Oct 7", for history lines and notes. */
export const TODAY_LABEL = monthDay(TODAY);
/** Id of the sample project All tasks starts on. */
export const ATLAS_ID = 'atlas';

/** Edit / form priority chips (the filter has its own list in tasks.query). */
export const PRIORITIES: readonly TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];
/** [type, base category label]. */
export const TYPES: readonly (readonly [TaskType, string])[] = [
  ['Task', 'Task (task)'],
  ['Bug', 'Issue (issue)'],
  ['Improvement', 'Idea (idea)'],
];

/** Days from today to the due date (negative = overdue). */
export const dueIn = (t: Pick<TaskItem, 'due'>) => daysBetween(TODAY, t.due);

/** Everyone assigned to a task: `who` first, then `also`. */
export const assignees = (t: Pick<TaskItem, 'who' | 'also'>) => [t.who, ...(t.also ?? [])];

/** True when `name` is one of the task's assignees. */
export const assigned = (t: Pick<TaskItem, 'who' | 'also'>, name: string) =>
  assignees(t).includes(name);

/** Full name of a first name, or the name itself for someone outside the sample people. */
export const fullName = (name: string) => person(name)?.full ?? name;

/** First assignee's full name, plus "+N" for the others. */
export const whoLabel = (t: Pick<TaskItem, 'who' | 'also'>) =>
  `${fullName(t.who)}${t.also?.length ? ` +${t.also.length}` : ''}`;

/** A Member changes (moves, edits, cancels) only tasks assigned to them; Managers and Admins change any task. */
export const mayChange = (me: PersonInfo, t: Pick<TaskItem, 'who' | 'also'>) =>
  me.role !== 'Member' || assigned(t, me.name);

/** Move to Archive: Managers and Admins for any task, a Member only for tasks they created. */
export const mayArchive = (me: PersonInfo, x: Pick<TaskInfo, 'by'>) =>
  me.role !== 'Member' || x.by === me.name;

/** Notice when a Member may not change a task: "Only Nico or Rina can change this task". */
export const deniedNotice = (t: Pick<TaskItem, 'who' | 'also'>) =>
  `Only ${assignees(t).join(' or ')} can change this task`;

/** Done and Canceled tasks are closed: lists hide them unless a status filter picks them. */
export const isOpen = (t: Pick<TaskItem, 'status'>) =>
  t.status !== 'Done' && t.status !== 'Canceled';

/** Detail variant per status: Canceled opens on To do, Done on In progress; each shows the real status. */
export const detailVariant = (t: Pick<TaskItem, 'status'>): DetailVariant =>
  t.status === 'In review'
    ? 'review'
    : t.status === 'In progress' || t.status === 'Done'
      ? 'progress'
      : 'todo';

/** Due line of the detail: the sample note for closed tasks, else "Overdue N days" / "Today" / "Tomorrow" / "Due X". */
export function dueLabel(t: Pick<TaskItem, 'status' | 'due' | 'when'>): string {
  if (!isOpen(t)) return t.when;
  const d = dueIn(t);
  if (d < 0) return `Overdue ${-d} days`;
  if (d === 0) return 'Today';
  return d === 1 ? 'Tomorrow' : `Due ${monthDay(t.due)}`;
}

/** "1 day late", "3 days late": the facts' due note, and the text a late card shows beside its red date. */
export const daysLate = (n: number) => `${n} ${n === 1 ? 'day' : 'days'} late`;

/** Note after the due date in the facts: "(2 days late)", "(today)", "(tomorrow)" or none. */
export function dueNote(t: Pick<TaskItem, 'status' | 'due'>): string {
  if (!isOpen(t)) return '';
  const d = dueIn(t);
  if (d < 0) return `(${daysLate(-d)})`;
  if (d === 0) return '(today)';
  return d === 1 ? '(tomorrow)' : '';
}

/** Reviewer first name of a task, falling back to `fallback` (#17's, as the prototype does) when it has none. */
const reviewerOf = (x: TaskInfo | undefined, fallback: string) =>
  x?.reviewer?.split(' ')[0] || fallback;

/** True when `name` (a first name, or "Admin" for any Admin) is the signed-in person. */
const isMe = (name: string, me: PersonInfo) =>
  name === me.name || (name === 'Admin' && me.role === 'Admin');

/**
 * Card note for the signed-in person `me`: an In review note names the reviewer unless that is them; any other status
 * shows the task's own note. `fallback` = reviewer of a task without one (#17's in the sample).
 */
export function note(
  t: Pick<TaskItem, 'status' | 'when'>,
  x: TaskInfo | undefined,
  me: PersonInfo,
  fallback: string,
): string {
  if (t.status !== 'In review') return t.when;
  const r = reviewerOf(x, fallback);
  return isMe(r, me) ? 'Waiting for my review' : `Awaiting review by ${r}`;
}

/** Steps progress "2/3", or null when the task has no steps. */
export const stepsDone = (steps: readonly TaskStep[]) =>
  steps.length ? `${steps.filter((s) => s.done).length}/${steps.length}` : null;

/** Step checklist title: "Steps 2/3", or "Steps" when there are none. */
export const stepsTitle = (steps: readonly TaskStep[]) => {
  const n = stepsDone(steps);
  return n ? `Steps ${n}` : 'Steps';
};

/** Due note from a due date: "N days overdue", "Today", "Tomorrow" (when `tomorrow`) or "Due X". */
export function whenFromDue(due: string, tomorrow: boolean): string {
  const d = daysBetween(TODAY, due);
  if (d < 0) return `${-d} days overdue`;
  if (d === 0) return 'Today';
  return d === 1 && tomorrow ? 'Tomorrow' : `Due ${monthDay(due)}`;
}
