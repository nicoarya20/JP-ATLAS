/** Default metrics numbers (X2 §2D); read from nowhere, so tests and the browser bundle can import it. */
import type { MetricsConfig } from './types';

// Frozen so a stray assignment cannot shift thresholds for every caller in the same run.
export const METRICS: MetricsConfig = Object.freeze({
  AT_RISK_OVERDUE_RATIO: 0.2,
  AT_RISK_PRIORITIES: Object.freeze(['high', 'critical'] as const),
  TASK_STALE_DAYS: 3,
  TRASH_RETENTION_DAYS: 30,
  TASK_KINDS_MAX_ACTIVE: 6,
  TIME_ZONE: 'Asia/Jakarta',
  UNDO_WINDOW_SECONDS: 10,
  PROGRESS_DISPLAY_CAP_UNLESS_ALL_DONE: 99,
});
