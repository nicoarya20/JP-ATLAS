/**
 * URL words (Indonesian) of the task list filters and the API values they stand for (S2-08, M16).
 * Kept apart from `tasks-filters.ts` so that file holds only parsing and query building.
 */
import type { ScheduleGroup } from '@server/metrics/schedule';
import type { ProjectPriority, TaskStatus } from '@server/pm/enums';
import type { TaskListScope, TaskSort } from '@server/task/task.limits';

export const SCOPE_SLUGS = { saya: 'mine', semua: 'all' } as const satisfies Record<
  string,
  TaskListScope
>;

// "Aktif" covers every open status, including review rows that may exist before S4 (P3 §2 Tugas ⑩).
// "Belum dikerjakan" and "Sedang dikerjakan" are the wireframe chips (SCR-TUGAS-01) of a single status.
export const STATUS_SLUGS = {
  aktif: ['todo', 'in_progress', 'in_review'],
  belum: ['todo'],
  dikerjakan: ['in_progress'],
  selesai: ['done'],
  dibatalkan: ['canceled'],
} as const satisfies Record<string, readonly TaskStatus[]>;

export const PRIORITY_SLUGS = {
  rendah: 'low',
  sedang: 'medium',
  tinggi: 'high',
  kritis: 'critical',
} as const satisfies Record<string, ProjectPriority>;

export const SORT_SLUGS = {
  tenggat: 'due',
  prioritas: 'priority',
  terbaru: 'updated',
  dibuat: 'created',
} as const satisfies Record<string, TaskSort>;

/** The "Tenggat" filter is one schedule group, the same cut the "Tugas saya" headings use. */
export const DUE_SLUGS = {
  terlambat: 'overdue',
  'hari-ini': 'today',
  besok: 'tomorrow',
  'minggu-ini': 'week',
  nanti: 'later',
  'tanpa-tenggat': 'none',
} as const satisfies Record<string, ScheduleGroup>;

export type TaskScopeSlug = keyof typeof SCOPE_SLUGS;
export type TaskStatusSlug = keyof typeof STATUS_SLUGS;
export type PrioritySlug = keyof typeof PRIORITY_SLUGS;
export type TaskSortSlug = keyof typeof SORT_SLUGS;
export type TaskDueSlug = keyof typeof DUE_SLUGS;

/** Statuses whose tasks can have a schedule group; a finished or canceled task has none, so the filter would match nothing. */
const DUE_STATUSES: readonly TaskStatusSlug[] = ['aktif', 'belum', 'dikerjakan'];
export const dueApplies = (status: TaskStatusSlug) => DUE_STATUSES.includes(status);
