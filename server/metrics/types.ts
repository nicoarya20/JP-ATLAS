/** Shared shapes for the pure metrics modules: config, calendar date and the task row subset the counters read. */
import type { ProjectPriority, TaskStatus } from '../pm/enums';

/** Calendar date as `YYYY-MM-DD` in the team time zone (never a UTC slice of an instant). */
export type IsoDate = string;

/** Tunable numbers; permission flags live in `server/access/rules.ts`, not here (R03 §3.5). */
export interface MetricsConfig {
  /** Share of active tasks that must be overdue (strict `>`) to flag a project "at risk". */
  readonly AT_RISK_OVERDUE_RATIO: number;
  /** Priorities whose overdue tasks flag a project "at risk" on their own. */
  readonly AT_RISK_PRIORITIES: readonly ProjectPriority[];
  /** An in-progress task with no activity for more than this many days (strict `>`) is stale. */
  readonly TASK_STALE_DAYS: number;
  /** Days a trashed item stays restorable. */
  readonly TRASH_RETENTION_DAYS: number;
  /** Maximum number of active task kinds per workspace. */
  readonly TASK_KINDS_MAX_ACTIVE: number;
  /** IANA zone that decides what "today" means for everyone. */
  readonly TIME_ZONE: string;
  /** Seconds the Undo action stays available after a delete. */
  readonly UNDO_WINDOW_SECONDS: number;
  /** Displayed progress is capped here unless every counted task is done. */
  readonly PROGRESS_DISPLAY_CAP_UNLESS_ALL_DONE: number;
}

/**
 * Structural subset of the `task` row. Declared here (not imported from the schema) so
 * this module stays free of the database layer; the full row is assignable to it.
 */
export interface TaskMetricsRow {
  readonly status: TaskStatus;
  readonly deletedAt: Date | null;
  readonly dueDate: IsoDate | null;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
  readonly canceledAt: Date | null;
  readonly lastActivityAt: Date;
  readonly reopenCount: number;
}

/** Badges a task can carry at once; `today` is a schedule group, not a label (X3 M13). */
export type TaskLabel = 'overdue' | 'awaiting_my_review' | 'blocked' | 'stale' | 'reopened';
