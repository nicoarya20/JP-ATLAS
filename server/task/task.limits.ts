/**
 * Fixed limits and list vocabularies for tasks (S2). Pure: the browser bundle and the task form
 * import it, so the form and the server validate against the same numbers.
 */
import type { FlowAction } from '../access/task-flow.policy';

/** Longest task title and description accepted by the form and the write routes. */
export const TASK_TITLE_MAX = 200;
export const TASK_DESCRIPTION_MAX = 5000;

/** Longest search text; longer input is cut instead of rejected, a search box should not error. */
export const TASK_SEARCH_MAX = 100;

/** `scope` of the task list: assigned to me, one project, or everything I may see. */
export const TASK_LIST_SCOPES = ['mine', 'project', 'all'] as const;
export type TaskListScope = (typeof TASK_LIST_SCOPES)[number];

/** Sort keys of the task list; the order of each is fixed in `task.sql.ts`. */
export const TASK_SORTS = ['due', 'priority', 'updated', 'created'] as const;
export type TaskSort = (typeof TASK_SORTS)[number];
export const TASK_SORT_DEFAULT: TaskSort = 'due';

/** Longest checklist step, and how many steps the create form may send at once. */
export const TASK_CHECKLIST_TEXT_MAX = 300;
export const TASK_CHECKLIST_INITIAL_MAX = 20;

/** `task_activity.action` values written by the create/update service (S2-04); the timeline (S2-06) reads them. */
export const TASK_ACTIVITY = {
  created: 'created',
  assigneeChanged: 'assignee_changed',
  dueDateChanged: 'due_date_changed',
  priorityChanged: 'priority_changed',
  // Status steps (S2-05): one row per transition, payload `{ from, to, ... }`.
  start: 'started',
  unstart: 'unstarted',
  complete: 'completed',
  reopen: 'reopened',
  cancel: 'canceled',
  uncancel: 'uncanceled',
} as const;

/** Workflow steps the API offers in S2 (P3 §5); each has a `POST /tasks/:ref/<action>` route. */
export const ENABLED_TASK_ACTIONS = [
  'start',
  'unstart',
  'complete',
  'reopen',
  'cancel',
  'uncancel',
] as const satisfies readonly FlowAction[];
export type EnabledTaskAction = (typeof ENABLED_TASK_ACTIONS)[number];

/** Review steps that stay unrouted until the review feature ships in S4 (M25, KB-6). */
export const S4_ACTIONS = [
  'requestReview',
  'approve',
  'return',
] as const satisfies readonly FlowAction[];

/** Longest note on a cancellation (ASUMSI: the form counter uses the same number). */
export const TASK_CANCEL_NOTE_MAX = 500;

/** Field-level refusals (422 `VALIDATION`) with a message the form can show as is; the service and the form share them. */
export const TASK_WRITE_MESSAGES = {
  emptyTitle: 'Judul tugas belum diisi.',
  emptyStep: 'Langkah tidak boleh kosong.',
  assigneeNotWorker: 'Yang mengerjakan harus Pengelola atau Anggota proyek ini.',
  kindNotInProject: 'Jenis tugas ini tidak ada di proyek ini.',
  noDefaultKind: 'Proyek ini belum punya jenis tugas. Hubungi pengelola proyek.',
  startAfterDue: 'Tanggal mulai tidak boleh sesudah tenggat.',
} as const;
