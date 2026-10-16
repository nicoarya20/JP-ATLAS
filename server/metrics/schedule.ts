/**
 * Pure schedule grouping for the task lists ("Terlambat / Hari ini / Besok / Minggu ini / Nanti /
 * Tanpa tenggat"). `today` is always passed in, as everywhere in `server/metrics` (R03 D9).
 *
 * DECISION (B-7 unverified, KEPUTUSAN not yet recorded): "Minggu ini" runs from the day after
 * tomorrow up to and including the Sunday of the CURRENT week, with Monday as the first day. So
 * on a Saturday tomorrow is that Sunday and the week group is empty; on a Sunday tomorrow is
 * already next week and the group is empty too. The week never rolls over into next week, which
 * keeps the group's meaning "what is left of this week" instead of "next 7 days" (that is `later`).
 */
import { isActive } from './task.metrics';
import type { IsoDate, TaskMetricsRow } from './types';

export const SCHEDULE_GROUPS = ['overdue', 'today', 'tomorrow', 'week', 'later', 'none'] as const;
export type ScheduleGroup = (typeof SCHEDULE_GROUPS)[number];

/** Calendar boundaries of the groups, also used to build the SQL `due_date` conditions. */
export interface ScheduleBounds {
  readonly today: IsoDate;
  readonly tomorrow: IsoDate;
  /** Last day of "Minggu ini"; equal to `tomorrow` when the week group is empty (Saturday, Sunday). */
  readonly weekEnd: IsoDate;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAYS_PER_WEEK = 7;

function utcDate(date: IsoDate): Date {
  const m = ISO_DATE_RE.exec(date);
  if (!m) throw new Error(`Invalid ISO date: ${JSON.stringify(date)}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** `date` moved by whole calendar days; UTC arithmetic, so month ends and leap years need no care. */
function shift(date: IsoDate, days: number): IsoDate {
  const d = utcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The group boundaries for `today`; throws on a malformed date. */
export function scheduleBounds(today: IsoDate): ScheduleBounds {
  const tomorrow = shift(today, 1);
  // getUTCDay: Sunday = 0, so (7 - 0) % 7 = 0 days to go and Monday = 1 leaves 6.
  const sunday = shift(today, (DAYS_PER_WEEK - utcDate(today).getUTCDay()) % DAYS_PER_WEEK);
  // ISO dates compare correctly as strings; the max keeps the week group empty instead of negative.
  return { today, tomorrow, weekEnd: sunday > tomorrow ? sunday : tomorrow };
}

/**
 * The group of an open task, or `null` for a task that is not open work (done, canceled, trashed):
 * those never appear in any group. Due today is not overdue (R03), and no due date is its own group.
 */
export function scheduleGroupOf(
  t: Pick<TaskMetricsRow, 'status' | 'deletedAt' | 'dueDate'>,
  today: IsoDate,
): ScheduleGroup | null {
  if (!isActive(t)) return null;
  if (t.dueDate === null) return 'none';
  const b = scheduleBounds(today);
  if (t.dueDate < b.today) return 'overdue';
  if (t.dueDate === b.today) return 'today';
  if (t.dueDate === b.tomorrow) return 'tomorrow';
  return t.dueDate <= b.weekEnd ? 'week' : 'later';
}
