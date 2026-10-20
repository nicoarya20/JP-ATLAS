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

/** Reviewer of the sample review task #17; D.tasks notes are written from their side. */
export const reviewer = () => D.taskDetail[17].reviewer.split(' ')[0];
export const atlas = () => D.project('atlas');
export const atlasTasks = () => D.tasks.filter(t => t.project === atlas().name);

/** Due note for the active role: an In review note names the reviewer unless that is me. */
export const note = t => (t.status !== 'In review' ? t.when
  : reviewer() === D.me().name ? 'Waiting for my review' : `Awaiting review by ${reviewer()}`);

/** Detail screen per status; Done shares the In progress screen, which shows the real status. */
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
  const lead = D.projects.find(p => p.name === D.task(no).project).lead;
  return { desc: '', by: lead, steps: [], proof: [], history: [[`${lead} created this task`, '']] };
}
