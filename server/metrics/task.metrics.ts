/** Pure task counters and badges; `now` and `today` are always passed in so day boundaries are testable (R03 D9). */

import type { TaskStatus } from '../pm/enums';
import { METRICS } from './config';
import { diffDays, isoDateIn } from './dates';
import type { IsoDate, MetricsConfig, TaskLabel, TaskMetricsRow } from './types';

export type { TaskLabel } from './types';

/** Statuses that still count as work to do; shared with SQL filters so there is one definition. */
export const ACTIVE_STATUSES = [
  'todo',
  'in_progress',
  'in_review',
] as const satisfies readonly TaskStatus[];

const MS_PER_DAY = 86_400_000;

/** Whether the task is open work: an active status and not in the trash. */
export function isActive(t: Pick<TaskMetricsRow, 'status' | 'deletedAt'>): boolean {
  return !t.deletedAt && (ACTIVE_STATUSES as readonly TaskStatus[]).includes(t.status);
}

/** Active with a due date before `today`; due today is not yet overdue, and no due date never is. */
export function isOverdue(t: TaskMetricsRow, today: IsoDate): boolean {
  return isActive(t) && t.dueDate !== null && t.dueDate < today;
}

/** In progress with no activity for strictly more than `TASK_STALE_DAYS` x 24h (exactly 72h is not stale). */
export function isStale(
  t: TaskMetricsRow,
  now: Date,
  c: Pick<MetricsConfig, 'TASK_STALE_DAYS'> = METRICS,
): boolean {
  return (
    !t.deletedAt &&
    t.status === 'in_progress' &&
    now.getTime() - t.lastActivityAt.getTime() > c.TASK_STALE_DAYS * MS_PER_DAY
  );
}

/** Calendar days (in `tz`) from creation to completion/cancellation, or to `now` while the task is open. */
export function ageDays(t: TaskMetricsRow, now: Date, tz: string = METRICS.TIME_ZONE): number {
  // Calendar days, not 24h blocks: a task made at 00:30 local turns one day old at midnight, not at 00:30.
  const end =
    (t.status === 'done' ? t.completedAt : t.status === 'canceled' ? t.canceledAt : null) ?? now;
  return Math.max(0, diffDays(isoDateIn(t.createdAt, tz), isoDateIn(end, tz)));
}

export interface TaskLabelContext {
  readonly today: IsoDate;
  readonly now: Date;
  /** Supplied by the caller: whether an open blocker exists (the dependency check lands in S4). */
  readonly blocked: boolean;
  /** Supplied by the caller: whether the viewer is allowed to review this task. */
  readonly awaitingMe: boolean;
}

/** Every label the task carries (list rows show `primary`; detail shows `all`), in display priority order. */
export function taskLabels(
  t: TaskMetricsRow,
  x: TaskLabelContext,
  c: Pick<MetricsConfig, 'TASK_STALE_DAYS'> = METRICS,
): { all: TaskLabel[]; primary: TaskLabel | null } {
  const all: TaskLabel[] = [];
  if (isOverdue(t, x.today)) all.push('overdue');
  if (x.awaitingMe && t.status === 'in_review' && !t.deletedAt) all.push('awaiting_my_review');
  if (x.blocked && isActive(t)) all.push('blocked');
  if (isStale(t, x.now, c)) all.push('stale');
  // Last on purpose: R03 fixes only the first four, and a reopened mark never outranks a schedule problem.
  if (t.reopenCount > 0 && !t.deletedAt) all.push('reopened');
  return { all, primary: all[0] ?? null };
}
