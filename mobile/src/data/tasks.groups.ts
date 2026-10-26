import { today } from './clock';
import { daysToSunday } from './dates';
import type { Role } from './sample';
import { applyQuery, SORT_DUE, SORTS, type TaskQuery } from './tasks.query';
import { assigned, dueIn, type TaskItem } from './tasks.shared';

/*
 * My tasks grouping (prototype tasks.list.jsx TasksMy): a review queue on top for Managers and Admins, then the
 * viewer's own tasks by urgency when sorted by due date, or one list titled by the sort otherwise.
 */

export const GROUPS = [
  'Overdue',
  'Today',
  'Tomorrow',
  'This week',
  'Later',
  'Done',
  'Canceled',
] as const;

export type TaskGroup = { title: string; tasks: TaskItem[] };

/** Index into GROUPS: closed tasks by status, open ones by days to due ("This week" runs to Sunday). */
export function groupOf(t: Pick<TaskItem, 'status' | 'due'>): number {
  if (t.status === 'Canceled') return 6;
  if (t.status === 'Done') return 5;
  const d = dueIn(t);
  if (d < 0) return 0;
  if (d <= 1) return d + 1;
  return d <= daysToSunday(today()) ? 3 : 4;
}

/** Title of the review queue per role; a Member has none. */
export const REVIEW_GROUP: Partial<Record<Role, string>> = {
  pm: 'Waiting for my review',
  admin: 'Waiting for review',
};

/**
 * My tasks for `role` (signed in as `me`): every In review task in the review queue (not for a Member), then the
 * rest of the tasks assigned to me. Empty groups are left out.
 */
export function myGroups(
  role: Role,
  tasks: readonly TaskItem[],
  q: TaskQuery,
  me: string,
): TaskGroup[] {
  const title = REVIEW_GROUP[role];
  const review = title
    ? applyQuery(
        tasks.filter((t) => t.status === 'In review'),
        q,
        { me },
      )
    : [];
  const own = applyQuery(
    tasks.filter((t) => assigned(t, me) && !review.includes(t)),
    q,
    { me },
  );
  const groups: TaskGroup[] =
    q.sort === SORT_DUE
      ? GROUPS.map((g, i) => ({ title: g as string, tasks: own.filter((t) => groupOf(t) === i) }))
      : [{ title: SORTS[q.sort], tasks: own }];
  const filled = groups.filter((g) => g.tasks.length);
  return title && review.length ? [{ title, tasks: review }, ...filled] : filled;
}
