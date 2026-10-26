/**
 * Shapes the task read routes return and the inputs the queries take (S2-02). Explicit DTOs, not
 * table rows: nothing here carries S4-S5 columns (dependencies, tags, proof), so those can be added
 * later without changing what exists (expand-only). Dates leave the server as ISO strings.
 */
import type { Caps, CapValue, TaskCapKey } from '../access/capabilities';
import type { PrimaryAction } from '../access/task-flow.policy';
import type { ScheduleGroup } from '../metrics/schedule';
import type { IsoDate, MetricsConfig, TaskLabel } from '../metrics/types';
import type {
  ProjectPriority,
  ProjectStatus,
  TaskBaseKind,
  TaskCancelCategory,
  TaskStatus,
} from '../pm/enums';
import type { TaskListScope, TaskSort } from './task.limits';
import type { PersonRef } from './task.lookup.query';

export type { PersonRef } from './task.lookup.query';

/** "Now" and "today" are injected so day boundaries and labels are testable (R03 D9); the route derives `today` in the team zone. */
export type TaskClock = {
  now: Date;
  today: IsoDate;
  /** Defaults to the env-resolved metrics; only the stale threshold is read. */
  metrics?: Pick<MetricsConfig, 'TASK_STALE_DAYS'>;
};

export type ListTasksInput = {
  scope: TaskListScope;
  /** Required when `scope` is `project`. */
  projectId?: string;
  status?: readonly TaskStatus[];
  assigneeId?: string;
  priority?: readonly ProjectPriority[];
  /** Free text matched against the title. */
  q?: string;
  /** One schedule group; only open tasks belong to one. */
  due?: ScheduleGroup;
  sort?: TaskSort;
  limit?: number;
  cursor?: string;
};

export type ProjectRef = { id: string; name: string; status: ProjectStatus };

/** The phase of a project a task belongs to; the same shape in the list and in the detail (H-B5). */
export type PhaseRef = { id: string; name: string };

export interface TaskListItem {
  id: string;
  /** Global task number, the human-friendly handle in `/app/tasks/:number`. */
  number: number;
  title: string;
  status: TaskStatus;
  priority: ProjectPriority;
  /** `YYYY-MM-DD` or null. */
  dueDate: string | null;
  assignee: PersonRef | null;
  project: ProjectRef;
  /** The phase of the task's project it belongs to (H-B5), or null. */
  phase: PhaseRef | null;
  /** Every badge the task carries, most important first. */
  labels: TaskLabel[];
  checklist: { done: number; total: number };
  /** The one next step to highlight for this viewer, or null. */
  primary: PrimaryAction | null;
  can: Caps<TaskCapKey>;
}

export type ListTasksResult =
  | {
      ok: true;
      items: TaskListItem[];
      nextCursor: string | null;
      /** Response-level capabilities; a missing key means the control is hidden. */
      caps: { createTask?: CapValue };
    }
  // The keyset decoder calls this VALIDATION (422); the list route maps it to the 400 `BAD_CURSOR` of R04.
  | { ok: false; code: 'BAD_CURSOR' };

export interface TaskCounts {
  /** Open tasks assigned to me, per schedule group. */
  mine: Record<ScheduleGroup, number>;
  /** All my tasks (open or finished) per status. */
  byStatus: Record<TaskStatus, number>;
}

export interface ChecklistItemDto {
  id: string;
  text: string;
  isDone: boolean;
  position: number;
}

export interface TaskDetail extends Omit<TaskListItem, 'checklist'> {
  description: string | null;
  startDate: string | null;
  kind: { id: string; name: string; baseKind: TaskBaseKind };
  creator: PersonRef | null;
  reviewer: PersonRef | null;
  needsReview: boolean;
  reopenCount: number;
  cancel: { category: TaskCancelCategory; note: string | null } | null;
  startedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  checklist: { done: number; total: number; items: ChecklistItemDto[] };
}

export type TaskDetailResult = { ok: true; task: TaskDetail } | { ok: false; code: 'NOT_FOUND' };

/** The columns every task read selects (see `cardColumns` in `task.sql.ts`). */
export type TaskCardRow = {
  id: string;
  number: number;
  title: string;
  status: TaskStatus;
  priority: ProjectPriority;
  dueDate: string | null;
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  phaseId: string | null;
  phaseName: string | null;
  assigneeId: string | null;
  reviewerId: string | null;
  createdBy: string | null;
  needsReview: boolean;
  reopenCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  canceledAt: Date | null;
  lastActivityAt: Date;
  checklistDone: number;
  checklistTotal: number;
};
