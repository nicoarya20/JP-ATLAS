/** Pure project condition: computed from tasks, due date and milestones, then optionally replaced by a manual override. */

import type { ProjectCondition, ProjectPriority, ProjectStatus } from '../pm/enums';
import { METRICS } from './config';
import { diffDays } from './dates';
import { milestoneState } from './project.metrics';
import { isActive, isOverdue } from './task.metrics';
import type { IsoDate, MetricsConfig, TaskMetricsRow } from './types';

/** Why a project is not on track; the order of a result's list is the order the UI shows them. */
export type ConditionReason =
  | { readonly code: 'PAST_DUE'; readonly days: number }
  | { readonly code: 'IMPORTANT_OVERDUE'; readonly count: number }
  | { readonly code: 'MILESTONE_OVERDUE'; readonly count: number }
  | { readonly code: 'OVERDUE_RATIO'; readonly late: number; readonly active: number };

/** Task row subset the condition reads; priority decides whether a late task flags the project on its own. */
export type ConditionTask = TaskMetricsRow & { readonly priority: ProjectPriority };

export interface ConditionMilestone {
  readonly dueDate: IsoDate;
  readonly reachedAt: Date | null;
}

/** A manual condition set by a manager; extra columns (reason, author) pass through untouched. */
export interface ConditionOverride {
  readonly condition: ProjectCondition;
  readonly createdAt: Date;
  readonly expiresAt: Date | null;
  readonly clearedAt: Date | null;
}

// Milestones and overrides were in the signature from S1 (callers passed `[]`); S5 feeds real rows without a new contract.
export interface ConditionInput<O extends ConditionOverride = ConditionOverride> {
  readonly status: ProjectStatus;
  readonly dueDate: IsoDate | null;
  readonly tasks: readonly ConditionTask[];
  readonly milestones: readonly ConditionMilestone[];
  readonly overrides: readonly O[];
  readonly today: IsoDate;
  readonly now: Date;
}

export interface ConditionResult<O extends ConditionOverride = ConditionOverride> {
  /** What the numbers say; always returned so the UI can show it next to an override. */
  readonly computed: { readonly condition: ProjectCondition; readonly reasons: ConditionReason[] };
  /** What the user sees: the active override if any, otherwise the computed condition. */
  readonly effective: ProjectCondition;
  readonly override: O | null;
}

/** The newest override that is neither cleared nor expired (expiring exactly at `now` counts as expired). */
export function activeOverride<O extends ConditionOverride>(
  rows: readonly O[],
  now: Date,
): O | null {
  let best: O | null = null;
  for (const r of rows) {
    if (r.clearedAt !== null) continue;
    if (r.expiresAt !== null && r.expiresAt.getTime() <= now.getTime()) continue;
    // Strict `>` keeps the first row on a createdAt tie, so the result does not depend on later rows.
    if (best === null || r.createdAt.getTime() > best.createdAt.getTime()) best = r;
  }
  return best;
}

/** Condition of an `active` project; any other status has no condition (`null`), overrides included. */
export function computeCondition<O extends ConditionOverride = ConditionOverride>(
  i: ConditionInput<O>,
  c: Pick<MetricsConfig, 'AT_RISK_OVERDUE_RATIO' | 'AT_RISK_PRIORITIES'> = METRICS,
): ConditionResult<O> | null {
  if (i.status !== 'active') return null;
  const active = i.tasks.filter(isActive);
  const late = active.filter((t) => isOverdue(t, i.today));
  const reasons: ConditionReason[] = [];
  if (i.dueDate !== null && i.dueDate < i.today) {
    // Past due is the whole story: smaller signals would only dilute "Terlambat".
    reasons.push({ code: 'PAST_DUE', days: diffDays(i.dueDate, i.today) });
  } else {
    const important = late.filter((t) => c.AT_RISK_PRIORITIES.includes(t.priority));
    const missed = i.milestones.filter((m) => milestoneState(m, i.today) === 'overdue');
    if (important.length > 0) reasons.push({ code: 'IMPORTANT_OVERDUE', count: important.length });
    if (missed.length > 0) reasons.push({ code: 'MILESTONE_OVERDUE', count: missed.length });
    // Strict `>`: exactly 20% late is still fine (Atlas sits at 1 of 5 on purpose).
    if (active.length > 0 && late.length / active.length > c.AT_RISK_OVERDUE_RATIO) {
      reasons.push({ code: 'OVERDUE_RATIO', late: late.length, active: active.length });
    }
  }
  const computed: ProjectCondition =
    reasons[0]?.code === 'PAST_DUE' ? 'off_track' : reasons.length > 0 ? 'at_risk' : 'on_track';
  const override = activeOverride(i.overrides, i.now);
  return {
    computed: { condition: computed, reasons },
    effective: override?.condition ?? computed,
    override,
  };
}

/** One-line Indonesian text for a reason, e.g. "1 tugas penting terlambat". */
export function formatConditionReason(r: ConditionReason): string {
  switch (r.code) {
    case 'PAST_DUE':
      return `tenggat lewat ${r.days} hari`;
    case 'IMPORTANT_OVERDUE':
      return `${r.count} tugas penting terlambat`;
    case 'MILESTONE_OVERDUE':
      return `${r.count} milestone terlewat`;
    case 'OVERDUE_RATIO':
      return `${r.late} dari ${r.active} tugas aktif terlambat`;
  }
}
