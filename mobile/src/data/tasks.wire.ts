/**
 * What `/api/app/tasks*` sends, mirrored from `server/task/task.dto.ts`, `server/pm/enums.ts`,
 * `server/access/capabilities.ts` and the workflow route (map `phase2-map-tasks.md` §0). Types
 * only, plus the enum words the app shows in English: the server sends codes, never English text.
 */
import type { TaskStatus } from './sample';
import type { TaskPriority } from './tasks.shared';

export type TaskStatusWire = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';
export type TaskPriorityWire = 'low' | 'medium' | 'high' | 'critical';
/** Where an open task sits against today (`server/metrics/schedule.ts`). */
export type ScheduleGroupWire = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none';
export type TaskLabelWire = 'overdue' | 'awaiting_my_review' | 'blocked' | 'stale' | 'reopened';
export type TaskSortWire = 'due' | 'priority' | 'updated' | 'created';
export type TaskCancelCategoryWire =
  | 'duplicate'
  | 'not_needed'
  | 'out_of_scope'
  | 'created_by_mistake'
  | 'other';

/** `true` = enabled; a code = shown disabled with that reason (`caps.messages.ts`); absent = hidden. */
export type CapValueWire = true | string;

export type TaskCapKeyWire =
  | 'update'
  | 'start'
  | 'unstart'
  | 'complete'
  | 'requestReview'
  | 'approve'
  | 'return'
  | 'reopen'
  | 'cancel'
  | 'uncancel'
  | 'comment'
  | 'needsReviewOn'
  | 'needsReviewOff'
  | 'changeReviewer'
  | 'trash';

export type TaskCapsWire = Partial<Record<TaskCapKeyWire, CapValueWire>>;

export type PrimaryActionWire =
  | 'start'
  | 'complete'
  | 'requestReview'
  | 'approve'
  | 'reopen'
  | 'uncancel';

export type PersonRefWire = { id: string; name: string };
export type ProjectRefWire = { id: string; name: string; status: string };
export type PhaseRefWire = { id: string; name: string };

/** One row of `GET /api/app/tasks`. */
export type TaskListItemWire = {
  id: string;
  /** Global number: the `#12` people use, and what `/tasks/:ref` accepts. */
  number: number;
  title: string;
  status: TaskStatusWire;
  priority: TaskPriorityWire;
  /** `YYYY-MM-DD`, a calendar day (safe to compare as text, K2). */
  dueDate: string | null;
  assignee: PersonRefWire | null;
  project: ProjectRefWire;
  phase: PhaseRefWire | null;
  labels: TaskLabelWire[];
  checklist: { done: number; total: number };
  primary: PrimaryActionWire | null;
  can: TaskCapsWire;
};

export type TaskListPageWire = {
  items: TaskListItemWire[];
  nextCursor: string | null;
  /** A missing `createTask` means the viewer may not add a task anywhere. */
  caps: { createTask?: CapValueWire };
};

/** `GET /api/app/tasks/counts`: my open tasks per schedule group, and all mine per status. */
export type TaskCountsWire = {
  mine: Record<ScheduleGroupWire, number>;
  byStatus: Record<TaskStatusWire, number>;
};

/** The workflow routes answer the task's new state and its new `can{}` (with `primary`). */
export type TaskTransitionWire = {
  task: { id: string; number: number; status: TaskStatusWire };
  can: TaskCapsWire & { primary: PrimaryActionWire | null };
};

/** One project of `GET /api/app/projects` the filter offers; only these fields are read. */
export type FilterProjectWire = { id: string; name: string };
export type FilterProjectsPageWire = { items: FilterProjectWire[] };

export const STATUS_LABEL: Record<TaskStatusWire, TaskStatus> = {
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
  canceled: 'Canceled',
};

export const STATUS_WIRE = Object.fromEntries(
  Object.entries(STATUS_LABEL).map(([wire, label]) => [label, wire]),
) as Record<TaskStatus, TaskStatusWire>;

export const PRIORITY_LABEL: Record<TaskPriorityWire, TaskPriority> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const PRIORITY_WIRE = Object.fromEntries(
  Object.entries(PRIORITY_LABEL).map(([wire, label]) => [label, wire]),
) as Record<TaskPriority, TaskPriorityWire>;

/** Statuses of open work: "All active" names them, because an empty `status` means every status. */
export const OPEN_STATUSES: readonly TaskStatusWire[] = ['todo', 'in_progress', 'in_review'];
