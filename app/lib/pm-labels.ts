/**
 * Plain-Indonesian labels, icons and colour tokens for project/task vocabulary (R11 §3.4 glossary).
 * Status, priority and condition always render icon + text, never colour alone (WCAG 1.4.1).
 */

import type { TaskLabel } from '@server/metrics/types';
import type {
  ProjectCondition,
  ProjectPriority,
  ProjectStatus,
  TaskStatus,
} from '@server/pm/enums';
import type { IconType } from 'react-icons';
import {
  FiAlertOctagon,
  FiAlertTriangle,
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiCheckCircle,
  FiCircle,
  FiClock,
  FiEdit3,
  FiEye,
  FiLoader,
  FiLock,
  FiMinus,
  FiMoon,
  FiPauseCircle,
  FiPlay,
  FiRotateCcw,
  FiUserCheck,
  FiXCircle,
} from 'react-icons/fi';

/** What a badge needs: words, a shape and a colour token (`ok`/`warn`/`danger` come from the theme palette). */
export type PmLabel = { label: string; icon: IconType; color: string };

/** Task status, chosen by a person ("Menunggu diperiksa" = in review). */
export const TASK_STATUS_LABELS = {
  todo: { label: 'Belum dikerjakan', icon: FiCircle, color: 'gray' },
  in_progress: { label: 'Sedang dikerjakan', icon: FiLoader, color: 'blue' },
  in_review: { label: 'Menunggu diperiksa', icon: FiEye, color: 'grape' },
  done: { label: 'Selesai', icon: FiCheckCircle, color: 'ok' },
  canceled: { label: 'Dibatalkan', icon: FiXCircle, color: 'gray' },
} as const satisfies Record<TaskStatus, PmLabel>;

/** Project status; "Berjalan" is for projects only, tasks say "Sedang dikerjakan". */
export const PROJECT_STATUS_LABELS = {
  draft: { label: 'Draf', icon: FiEdit3, color: 'gray' },
  active: { label: 'Berjalan', icon: FiPlay, color: 'blue' },
  on_hold: { label: 'Ditunda', icon: FiPauseCircle, color: 'warn' },
  completed: { label: 'Selesai', icon: FiCheckCircle, color: 'ok' },
  canceled: { label: 'Dibatalkan', icon: FiXCircle, color: 'gray' },
} as const satisfies Record<ProjectStatus, PmLabel>;

/** Priority, shared by projects and tasks. */
export const PRIORITY_LABELS = {
  low: { label: 'Rendah', icon: FiArrowDown, color: 'gray' },
  medium: { label: 'Sedang', icon: FiMinus, color: 'blue' },
  high: { label: 'Tinggi', icon: FiArrowUp, color: 'warn' },
  critical: { label: 'Kritis', icon: FiAlertOctagon, color: 'danger' },
} as const satisfies Record<ProjectPriority, PmLabel>;

/** Condition is computed by the system (M13), unlike status which a person picks. */
export const CONDITION_LABELS = {
  on_track: { label: 'Lancar', icon: FiCheck, color: 'ok' },
  at_risk: { label: 'Perlu perhatian', icon: FiAlertTriangle, color: 'warn' },
  off_track: { label: 'Terlambat', icon: FiClock, color: 'danger' },
} as const satisfies Record<ProjectCondition, PmLabel>;

/** Extra states a task row can show next to its status ("Dibuka lagi" etc.). */
export const TASK_LABEL_LABELS = {
  overdue: { label: 'Terlambat', icon: FiClock, color: 'danger' },
  awaiting_my_review: { label: 'Menunggu diperiksa saya', icon: FiUserCheck, color: 'grape' },
  blocked: { label: 'Tertahan', icon: FiLock, color: 'warn' },
  stale: { label: 'Mandek', icon: FiMoon, color: 'gray' },
  reopened: { label: 'Dibuka lagi', icon: FiRotateCcw, color: 'warn' },
} as const satisfies Record<TaskLabel, PmLabel>;

/** Order a list row picks its single label from (R03: most urgent first). */
export const TASK_LABEL_PRIORITY: readonly TaskLabel[] = [
  'overdue',
  'awaiting_my_review',
  'blocked',
  'stale',
  'reopened',
];
