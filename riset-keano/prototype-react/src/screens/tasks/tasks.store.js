// Task changes: a Kanban move or a detail action (Start working, Mark done, Request review, Approve, Return, Reopen) writes
// the new status, the ⋯ › Edit task form writes its fields into the sample task (and its D.taskDetail extras), New task ·
// Fill form adds a task and Cancel task moves it to Archive, so the board, the lists and the detail all show them.
// Readers re-render through useTaskMoves(); a page reload brings the sample back.
import { useSyncExternalStore } from 'react';
import { D } from '../../data/sample';
import { TODAY, days, info } from './tasks.shared';

const CLOCK = '09:41';   // the prototype's clock, so a move counts as "recently updated" today
const pad = n => String(n).padStart(2, '0');
const NOW = `${TODAY.getFullYear()}-${pad(TODAY.getMonth() + 1)}-${pad(TODAY.getDate())}T${CLOCK}`;
/** The sample "today" as a short label ("Oct 7"), for history lines. */
export const TODAY_LABEL = D.today.short.slice(5);

const ORIGINAL = new Map(D.tasks.map(t => [t.no, structuredClone(t)]));
const ORIGINAL_DETAIL = structuredClone(D.taskDetail);
let version = 0;
const listeners = new Set();
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const notify = () => { version += 1; listeners.forEach(fn => fn()); };

/** Due note after a move: Done today, else the sample note, or one from the due date for a task that started Done. */
function whenOf(t, status) {
  if (status === 'Done') return `Done ${TODAY_LABEL}`;
  const o = ORIGINAL.get(t.no);
  if (o.status !== 'Done') return o.when;
  const d = days(t.due);
  return d < 0 ? `${-d} days overdue` : d === 0 ? 'Today' : `Due ${t.due}`;
}

/** Merge extras into task #no's D.taskDetail and add a dated line to its history (log may be empty). */
function record(no, log, extras) {
  const base = D.taskDetail[no] || info(no);
  D.taskDetail[no] = { ...base, ...extras, history: log ? [...base.history, [log, TODAY_LABEL]] : base.history };
}

/**
 * Give task #no a new status (a Kanban move or a detail action). log = history line ("Nico started working");
 * extras = D.taskDetail keys to set (asked, returned). Same status = nothing changes.
 */
export function moveTask(no, status, { log, extras } = {}) {
  const t = D.task(no);
  if (!t) throw new Error(`Cannot move task #${no}: no such task`);
  if (t.status === status) return;
  Object.assign(t, { status, when: whenOf(t, status), updated: NOW });
  if (log || extras) record(no, log, extras);
  notify();
}

/** Cancel task #no (Tasks ⑫): it leaves every list, its history logs why, and Archive lists it as archived by `by`. */
export function cancelTask(no, reason, by) {
  const i = D.tasks.findIndex(t => t.no === no);
  if (i < 0) throw new Error(`Cannot cancel task #${no}: not in the task lists`);
  const [t] = D.tasks.splice(i, 1);
  D.archivedTasks.push(t);
  record(no, `${by} canceled this task: ${reason}`);
  D.archive.unshift({ kind: 'TASK', title: `#${no} ${t.title}`, where: t.project, by, date: TODAY_LABEL, task: no });
  notify();
}

/** Due note after the due date changed: kept for Done tasks, else counted from the new date. */
function whenOfDue(t) {
  if (t.status === 'Done') return t.when;
  const d = days(t.due);
  return d < 0 ? `${-d} days overdue` : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `Due ${t.due}`;
}

/**
 * Save the Edit task form for task #no. fields = D.tasks keys (title, who, also, due, priority, type, tags);
 * extras = D.taskDetail keys (phase, desc, reviewer, steps, proof). The task's history logs who edited it.
 */
export function editTask(no, fields, extras, editor) {
  const t = D.task(no);
  if (!t) throw new Error(`Cannot edit task #${no}: no such task`);
  const dueChanged = fields.due !== undefined && fields.due !== t.due;
  Object.assign(t, fields, { updated: NOW });
  if (dueChanged) t.when = whenOfDue(t);
  record(no, `${editor} edited this task`, extras);
  notify();
}

/**
 * Add a To do task from the Fill form. fields = D.tasks keys (title, project, who, also, due, priority, type, tags);
 * extras = D.taskDetail keys (phase, desc, reviewer, start, hours). Returns the new task number.
 */
export function addTask(fields, extras, creator) {
  const no = Math.max(...D.tasks.map(t => t.no)) + 1;
  const t = { no, status: 'To do', next: 'Start', updated: NOW, ...fields };
  t.when = whenOfDue(t);
  D.tasks.push(t);
  D.taskDetail[no] = { ...extras, by: `${creator} · ${TODAY_LABEL}`, steps: [], proof: [], history: [[`${creator} created this task`, TODAY_LABEL]] };
  notify();
  return no;
}

/** Every task and its extras back to the sample; added tasks are dropped, canceled ones come back. test-only */
export function resetTasks() {
  const all = new Map([...D.tasks, ...D.archivedTasks].map(t => [t.no, t]));
  D.tasks.splice(0, D.tasks.length, ...[...ORIGINAL.keys()].map(no => all.get(no)));
  D.archivedTasks.length = 0;
  D.archive.splice(0, D.archive.length, ...D.archive.filter(a => a.task == null));
  D.tasks.forEach(t => {
    const o = structuredClone(ORIGINAL.get(t.no));
    Object.keys(t).forEach(k => delete t[k]);
    Object.assign(t, o);
  });
  Object.keys(D.taskDetail).forEach(no => delete D.taskDetail[no]);
  Object.assign(D.taskDetail, structuredClone(ORIGINAL_DETAIL));
  notify();
}

/** Re-render the caller after every move; returns a counter that changes per move. */
export const useTaskMoves = () => useSyncExternalStore(subscribe, () => version);
