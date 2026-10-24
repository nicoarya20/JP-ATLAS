import { daysToSunday } from './dates';
import { type EventItem, eventHref } from './events.shared';
import type { AgendaEvent, AgendaProject, FocusTask, HomeFocus } from './home.types';
import { PROJECTS, type Role, TODAY } from './sample';
import { dueIn, isOpen, type TaskItem } from './tasks.shared';
import type { TasksState } from './tasks.state';

/* "My Focus" and "Agenda & Projects", ported from the prototype (home.focus.jsx) on the live tasks and events. */

/** Project statuses that leave Agenda & Projects. */
const CLOSED_PROJECT = ['Done', 'Canceled'];

/** Done is offered only for a task that is not in review and needs none (prototype: no reviewer in its detail). */
export const canMarkDone = (s: TasksState, t: TaskItem) =>
  t.status !== 'In review' && !s.info[t.no]?.reviewer;

/** A focus row. */
const focusTask = (s: TasksState, t: TaskItem): FocusTask => ({
  no: t.no,
  title: t.title,
  project: t.project,
  when: t.when,
  status: t.status,
  canMarkDone: canMarkDone(s, t),
});

/** My open tasks by Overdue / Today / This week (to Sunday); PM also gets others' tasks in review, Admin the approvals. */
export function homeFocus(role: Role, s: TasksState, me: string, waiting: number): HomeFocus {
  const open = s.tasks.filter((t) => t.who === me && isOpen(t));
  const weekLeft = daysToSunday(TODAY);
  const review =
    role === 'pm' ? s.tasks.filter((t) => t.status === 'In review' && t.who !== me) : [];
  const row = (t: TaskItem) => focusTask(s, t);
  const groups = [
    { key: 'overdue' as const, tasks: open.filter((t) => dueIn(t) < 0) },
    { key: 'today' as const, tasks: open.filter((t) => dueIn(t) === 0) },
    { key: 'thisWeek' as const, tasks: open.filter((t) => dueIn(t) > 0 && dueIn(t) <= weekLeft) },
  ].map((g) => ({ key: g.key, tasks: g.tasks.map(row) }));
  return {
    // Once every sign-up is decided the Admin has nothing to approve, so the row goes.
    pendingUsers: role === 'admin' && waiting ? waiting : null,
    groups,
    review: review.map(row),
    openCount: open.length,
    empty: groups.every((g) => !g.tasks.length) && !review.length,
  };
}

/** My next listed event that is not done or canceled, then my projects that are not closed (Admin: every such one). */
export function homeAgenda(
  role: Role,
  events: readonly EventItem[],
  me: string,
): { next: AgendaEvent | null; projects: AgendaProject[] } {
  const e = events.find((x) => x.attendees.includes(me) && x.status !== 'Done' && !x.canceled);
  const projects = PROJECTS.filter(
    (p) => !CLOSED_PROJECT.includes(p.status) && (role === 'admin' || p.members.includes(me)),
  );
  return {
    next: e
      ? {
          id: e.id,
          href: eventHref(e),
          title: e.title,
          time: e.time,
          date: e.date,
          mode: e.mode,
          place: e.place,
        }
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
