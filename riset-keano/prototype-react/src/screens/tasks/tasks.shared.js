// Tasks module shared logic: due-date maths against the sample "today", review notes, which detail screen opens a task, task extras.
import { D } from '../../data/sample';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEAR = +D.today.date.slice(-4);
/** Date of a short "Oct 5" label in the sample year. */
const date = s => { const [m, d] = s.split(' '); return new Date(YEAR, MON.indexOf(m), +d); };
export const TODAY = date(D.today.short.slice(5));
/** Days from today to a short due label (negative = overdue). */
export const days = s => Math.round((date(s) - TODAY) / 864e5);
const pad = n => String(n).padStart(2, '0');
/** "Oct 5" → "2026-10-05" (a date input's value). */
export const isoOf = s => { const d = date(s); return `${YEAR}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
/** "2026-10-05" → "Oct 5". */
export const labelOf = iso => { const [, m, d] = iso.split('-'); return `${MON[+m - 1]} ${+d}`; };

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
// "Improvement" is a sample type with no tasks yet.
export const TYPES = [['Task', 'Task (task)'], ['Bug', 'Issue (issue)'], ['Improvement', 'Idea (idea)']];

/** Everyone assigned to a task: who is the first, also holds the rest (tasks saved with more than one assignee). */
export const assignees = t => [t.who, ...(t.also || [])];
/** True when name is one of the task's assignees. */
export const assigned = (t, name) => assignees(t).includes(name);
/** First assignee's full name, plus "+N" for the others. */
export const whoLabel = t => `${D.person(t.who).full}${t.also?.length ? ` +${t.also.length}` : ''}`;

/** Reviewer of the sample review task #17; D.tasks notes are written from their side. */
export const reviewer = () => D.taskDetail[17].reviewer.split(' ')[0];
export const atlas = () => D.project('atlas');
export const atlasTasks = () => D.tasks.filter(t => t.project === atlas().name);

/** First name of task t's reviewer; a task without one (moved to In review on the board) falls back to #17's. */
const reviewerOf = t => info(t.no).reviewer?.split(' ')[0] || reviewer();
/** True when name (a first name, or "Admin" for any Admin) is the signed-in person. */
const isMe = name => name === D.me().name || (name === 'Admin' && D.me().role === 'Admin');

/** Due note for the active role: an In review note names the reviewer unless that is me. */
export const note = t => {
  if (t.status !== 'In review') return t.when;
  const r = reviewerOf(t);
  return isMe(r) ? 'Waiting for my review' : `Awaiting review by ${r}`;
};

/** Done and Canceled tasks are closed: lists hide them unless a status filter picks them, and they count as no one's work. */
export const isOpen = t => t.status !== 'Done' && t.status !== 'Canceled';

/** Detail screen per status; Canceled opens on the To do screen, which shows the real status. Done shares the In progress screen, which shows the real status. */
export const detailOf = t => (t.status === 'In review' ? 'tasks.detail-review'
  : t.status === 'In progress' || t.status === 'Done' ? 'tasks.detail-progress' : 'tasks.detail-todo');

/** Task number to show on detail screen id: params.task if that task's status fits the screen, else the screen's sample task. */
export function pick(params, id, fallback) {
  const t = params?.task != null && D.task(+params.task);
  return t && detailOf(t) === id ? t.no : fallback;
}

/** Extras of a task; one without D.taskDetail only gets who created it (its project lead), nothing invented. */
export function info(no) {
  if (D.taskDetail[no]) return { proof: [], ...D.taskDetail[no] };
  const lead = [...D.projects, ...D.archivedProjects].find(p => p.name === D.task(no).project).lead;
  return { desc: '', by: lead, steps: [], proof: [], history: [[`${lead} created this task`, '']] };
}
