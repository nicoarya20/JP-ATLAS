import { daysToSunday } from './dates';
import { dueIn, isOpen } from './home.tasks';
import type { AgendaEvent, AgendaProject, FocusTask, HomeFocus } from './home.types';
import {
  EVENTS,
  PROJECTS,
  type Role,
  TASK_REVIEWERS,
  type Task,
  TODAY,
  USER_COUNTS,
} from './sample';

/* "My Focus" and "Agenda & Projects", ported from the prototype (home.focus.jsx). */

/** Project statuses that leave Agenda & Projects. */
const CLOSED_PROJECT = ['Done', 'Canceled'];

const focusTask = (t: Task): FocusTask => ({
  no: t.no,
  title: t.title,
  project: t.project,
  when: t.when,
  status: t.status,
  canMarkDone: t.status !== 'In review' && !TASK_REVIEWERS[t.no],
});

/** My open tasks by Overdue / Today / This week (to Sunday); PM also gets others' tasks in review, Admin the approvals. */
export function homeFocus(role: Role, tasks: Task[], me: string): HomeFocus {
  const open = tasks.filter((t) => t.who === me && isOpen(t));
  const weekLeft = daysToSunday(TODAY);
  const review = role === 'pm' ? tasks.filter((t) => t.status === 'In review' && t.who !== me) : [];
  const groups = [
    { key: 'overdue' as const, tasks: open.filter((t) => dueIn(t) < 0) },
    { key: 'today' as const, tasks: open.filter((t) => dueIn(t) === 0) },
    { key: 'thisWeek' as const, tasks: open.filter((t) => dueIn(t) > 0 && dueIn(t) <= weekLeft) },
  ].map((g) => ({ key: g.key, tasks: g.tasks.map(focusTask) }));
  return {
    pendingUsers: role === 'admin' ? USER_COUNTS.pending : null,
    groups,
    review: review.map(focusTask),
    openCount: open.length,
    empty: groups.every((g) => !g.tasks.length) && !review.length,
  };
}

/** My next event that is not done or canceled, then my projects that are not closed (Admin: every such project). */
export function homeAgenda(
  role: Role,
  me: string,
): { next: AgendaEvent | null; projects: AgendaProject[] } {
  const e = EVENTS.find((x) => x.attendees.includes(me) && x.status !== 'Done' && !x.canceled);
  const projects = PROJECTS.filter(
    (p) => !CLOSED_PROJECT.includes(p.status) && (role === 'admin' || p.members.includes(me)),
  );
  return {
    next: e
      ? { id: e.id, title: e.title, time: e.time, date: e.date, mode: e.mode, place: e.place }
      : null,
    projects: projects.map(({ id, name, lead, due, progress, status }) => ({
      id,
      name,
      lead,
      due,
      progress,
      status,
    })),
  };
}
