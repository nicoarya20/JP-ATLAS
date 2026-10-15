/** Pure project counters: progress, elapsed time and milestone state; `today` is always passed in (R03 D9). */

import { METRICS } from './config';
import { diffDays } from './dates';
import type { IsoDate, TaskMetricsRow } from './types';

const PERCENT_FULL = 100;

export interface ProgressResult {
  readonly done: number;
  readonly total: number;
  /** Whole percent, or `null` when no task counts (the UI shows "Belum ada tugas", never 0%). */
  readonly percent: number | null;
}

/**
 * Share of counted tasks that are done. The pool skips trashed and canceled tasks; `in_review`
 * is not done yet. Rounds to nearest but never shows 100% until every counted task is done.
 */
export function progress(
  tasks: readonly Pick<TaskMetricsRow, 'status' | 'deletedAt'>[],
): ProgressResult {
  const pool = tasks.filter((t) => !t.deletedAt && t.status !== 'canceled');
  const done = pool.filter((t) => t.status === 'done').length;
  if (pool.length === 0) return { done, total: 0, percent: null };
  if (done === pool.length) return { done, total: pool.length, percent: PERCENT_FULL };
  // 199/200 rounds to 100 but the project is not finished, so the cap keeps the bar honest (X2 §2C).
  const rounded = Math.round((PERCENT_FULL * done) / pool.length);
  return {
    done,
    total: pool.length,
    percent: Math.min(rounded, METRICS.PROGRESS_DISPLAY_CAP_UNLESS_ALL_DONE),
  };
}

export interface ElapsedResult {
  /** Share of the planned span already used, clamped to 0-100. */
  readonly percent: number;
  /** True once today is past the due date, so the bar can show "lewat tenggat" instead of a plain 100%. */
  readonly overrun: boolean;
}

/** Share of the start-to-due span that has passed; `null` without both dates or with an empty span. */
export function elapsed(
  start: IsoDate | null,
  due: IsoDate | null,
  today: IsoDate,
): ElapsedResult | null {
  if (!start || !due) return null;
  const span = diffDays(start, due);
  if (span <= 0) return null;
  const raw = Math.round((PERCENT_FULL * diffDays(start, today)) / span);
  return { percent: Math.min(PERCENT_FULL, Math.max(0, raw)), overrun: today > due };
}

export type MilestoneState = 'reached' | 'overdue' | 'waiting';

/** A milestone is reached once marked, overdue when due before `today` (due today still waits), else waiting. */
export function milestoneState(
  m: { readonly dueDate: IsoDate; readonly reachedAt: Date | null },
  today: IsoDate,
): MilestoneState {
  if (m.reachedAt) return 'reached';
  return m.dueDate < today ? 'overdue' : 'waiting';
}
