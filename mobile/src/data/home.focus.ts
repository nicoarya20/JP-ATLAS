/*
 * "My Focus" and "Agenda & Projects", mapped from the one `GET /api/app/home` payload.
 *
 * Nothing here decides anything: the server already chose which of my tasks are urgent, which
 * button each row may have (`action`, from its own policy — the client permission rule the map
 * forbids is gone), how a project is doing, and which events are coming. This only turns its shape
 * into the screen's, and turns the event instants into a day and a time in the team zone (K2).
 */
import type {
  HomeAgendaItemWire,
  HomeFocusTaskWire,
  HomeFocusWire,
  HomeProjectWire,
  HomeReviewTaskWire,
} from './home.api';
import type {
  AgendaEvent,
  AgendaProject,
  FocusGroupKey,
  FocusTask,
  HomeFocus,
  ReviewTask,
} from './home.types';
import { instantDate, instantTime } from './instant';

/** Buckets in the order Home shows them; an empty one is dropped by the screen. */
const ORDER: readonly FocusGroupKey[] = ['overdue', 'today', 'thisWeek', 'later', 'noDate'];

/**
 * The server's schedule group as Home words it: `tomorrow` and `week` are both "This week". A group
 * a newer server adds falls into "Later" so the task is still shown rather than quietly dropped.
 */
function bucketOf(group: string): FocusGroupKey {
  switch (group) {
    case 'overdue':
      return 'overdue';
    case 'today':
      return 'today';
    case 'tomorrow':
    case 'week':
      return 'thisWeek';
    case 'none':
      return 'noDate';
    default:
      return 'later';
  }
}

const focusTask = (t: HomeFocusTaskWire): FocusTask => ({
  id: t.id,
  no: t.number,
  title: t.title,
  project: t.project.name,
  dueDate: t.dueDate,
  overdueDays: t.overdueDays,
  action: t.action,
});

const reviewTask = (t: HomeReviewTaskWire): ReviewTask => ({
  id: t.id,
  no: t.number,
  title: t.title,
  project: t.project.name,
});

/** My open tasks in their buckets, plus the tasks waiting for my review. */
export function homeFocus(wire: HomeFocusWire): HomeFocus {
  const groups = ORDER.map((key) => ({
    key,
    tasks: wire.items.filter((t) => bucketOf(t.group) === key).map(focusTask),
  }));
  const review = wire.awaitingReview.map(reviewTask);
  return {
    groups,
    review,
    openCount: wire.total,
    reviewCount: wire.awaitingReviewTotal,
    empty: wire.items.length === 0 && review.length === 0,
  };
}

/** Where the event is, when it says: the two values the server has, worded for the screen. */
const MODE: Record<string, AgendaEvent['mode']> = { offline: 'In person', online: 'Online' };

/**
 * My next meeting. The server sends today's and tomorrow's agenda in order, so the first row is the
 * next one; the rest is not shown on Home (the Events menu is where the whole agenda lives).
 */
export function homeAgenda(items: readonly HomeAgendaItemWire[]): AgendaEvent | null {
  const next = items[0];
  if (!next) return null;
  return {
    id: next.id,
    href: `/events/${next.id}`,
    title: next.title,
    time: instantTime(next.startsAt),
    date: instantDate(next.startsAt),
    mode: next.locationType === null ? null : (MODE[next.locationType] ?? null),
  };
}

/** My projects as Home lists them; `percent` stays null for a project with no tasks yet. */
export const homeProjects = (projects: readonly HomeProjectWire[]): AgendaProject[] =>
  projects.map((p) => ({
    id: p.id,
    name: p.name,
    due: p.dueDate,
    progress: p.progress.percent,
    condition: p.condition,
    reason: p.reason,
  }));
