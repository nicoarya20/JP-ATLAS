import { daysBetween, daysSinceMonday, sameMonth } from './dates';
import type { EventItem } from './events.shared';
import { doneOn } from './home.tasks';
import type { HomeTarget, StatChip, StatKey, StatSub } from './home.types';
import { respondCards } from './inbox';
import { ADMIN_OVERDUE_TASKS, PROJECTS, type Role, TODAY } from './sample';
import { assigned, dueIn, isOpen, type TaskItem } from './tasks.shared';
import { type Decisions, waitingUsers } from './users';

/*
 * Home stat chips per role, ported from the prototype (home.stats.js, home.roles.js) on the live tasks and events,
 * against the sample "today".
 */

type Tasks = readonly TaskItem[];

const TARGET: Record<StatKey, HomeTarget> = {
  assigned: 'tasks.all',
  inProgress: 'tasks.all',
  completed: 'tasks.all',
  upcoming: 'events.calendar',
  inbox: 'inbox.respond',
  active: 'projects.list',
  overdue: 'tasks.all',
  awaiting: 'users.approve',
};

const chip = (key: StatKey, count: number | null, sub: StatSub, alert = false): StatChip => ({
  key,
  count,
  sub,
  alert,
  target: TARGET[key],
});

/** True for a date from today to the end of this month. */
const leftThisMonth = (iso: string) => sameMonth(iso, TODAY) && daysBetween(TODAY, iso) >= 0;

/** Line under In Progress: the most urgent thing among the tasks being worked on. */
function activeSub(active: Tasks): StatSub {
  const overdue = active.filter((t) => dueIn(t) < 0).length;
  const today = active.filter((t) => dueIn(t) === 0).length;
  if (overdue) return { kind: 'overdue', n: overdue };
  if (today) return { kind: 'dueToday', n: today };
  if (!active.length) return { kind: 'noneStarted' };
  const next = [...active].sort((a, b) => dueIn(a) - dueIn(b))[0];
  return { kind: 'nextDue', date: next.due };
}

/** Assigned, In Progress and Completed for the signed-in person (Member and PM). */
function taskChips(tasks: Tasks, me: string): StatChip[] {
  const mine = tasks.filter((t) => assigned(t, me));
  const open = mine.filter(isOpen);
  const overdue = open.filter((t) => dueIn(t) < 0).length;
  const active = mine.filter((t) => t.status === 'In progress');
  const done = mine.filter((t) => {
    const on = doneOn(t);
    return on !== undefined && daysBetween(TODAY, on) >= -daysSinceMonday(TODAY);
  });
  return [
    chip(
      'assigned',
      open.length,
      overdue ? { kind: 'overdue', n: overdue } : { kind: 'onTrack' },
      overdue > 0,
    ),
    chip(
      'inProgress',
      active.length,
      activeSub(active),
      active.some((t) => dueIn(t) < 0),
    ),
    chip('completed', done.length, { kind: 'thisWeek' }),
  ];
}

/** Upcoming (my open tasks and events not canceled still ahead this month) and Inbox (cards waiting for my response). */
function aheadChips(
  tasks: Tasks,
  events: readonly EventItem[],
  me: string,
  role: Role,
  decided: Decisions,
): StatChip[] {
  const dueTasks = tasks.filter((t) => assigned(t, me) && isOpen(t) && leftThisMonth(t.due)).length;
  // A canceled event stays listed (marked Canceled) but is no longer ahead of me, as in Agenda.
  const ahead = events.filter(
    (e) => e.attendees.includes(me) && e.status !== 'Done' && !e.canceled && leftThisMonth(e.date),
  ).length;
  const respond = respondCards(role, decided).length;
  return [
    chip('upcoming', null, { kind: 'items', n: dueTasks + ahead }),
    chip('inbox', null, respond ? { kind: 'toRespond', n: respond } : { kind: 'caughtUp' }),
  ];
}

/** Admin: workspace health (active projects, overdue tasks, users awaiting approval). */
const adminChips = (decided: Decisions): StatChip[] => [
  chip('active', PROJECTS.filter((p) => p.status === 'Active').length, {
    kind: 'unit',
    unit: 'projects',
  }),
  chip('overdue', ADMIN_OVERDUE_TASKS, { kind: 'unit', unit: 'tasks' }),
  chip('awaiting', waitingUsers(decided).length, { kind: 'unit', unit: 'users' }),
];

/** Stat chips of a role, in the prototype's order; `decided` (the Users decisions) sets the approval counts. */
export function homeStats(
  role: Role,
  tasks: Tasks,
  events: readonly EventItem[],
  me: string,
  decided: Decisions,
): StatChip[] {
  const first = role === 'admin' ? adminChips(decided) : taskChips(tasks, me);
  return [...first, ...aheadChips(tasks, events, me, role, decided)];
}
