// Kanban moves: a task dropped on another column gets that status written into the sample task, so the board, the
// lists and the detail all show it. Readers re-render through useTaskMoves(); a page reload brings the sample back.
import { useSyncExternalStore } from 'react';
import { D } from '../../data/sample';
import { TODAY, days } from './tasks.shared';

const CLOCK = '09:41';   // the phone's status-bar time, so a move counts as "recently updated" today
const pad = n => String(n).padStart(2, '0');
const NOW = `${TODAY.getFullYear()}-${pad(TODAY.getMonth() + 1)}-${pad(TODAY.getDate())}T${CLOCK}`;
const TODAY_LABEL = D.today.short.slice(5);   // "Oct 7"

const ORIGINAL = new Map(D.tasks.map(t => [t.no, { status: t.status, when: t.when, updated: t.updated }]));
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

/** Give task #no a new status (a Kanban drop). Same status = nothing changes. */
export function moveTask(no, status) {
  const t = D.task(no);
  if (!t) throw new Error(`Cannot move task #${no}: no such task`);
  if (t.status === status) return;
  Object.assign(t, { status, when: whenOf(t, status), updated: NOW });
  notify();
}

/** Every task back to its sample status. test-only */
export function resetTasks() {
  D.tasks.forEach(t => Object.assign(t, ORIGINAL.get(t.no)));
  notify();
}

/** Re-render the caller after every move; returns a counter that changes per move. */
export const useTaskMoves = () => useSyncExternalStore(subscribe, () => version);
