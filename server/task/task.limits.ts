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

/** Most steps one task may hold (S2-06); adding past it answers 422 (ASUMSI: no number in R02/R04). */
export const TASK_CHECKLIST_MAX_ITEMS = 50;

/** Longest comment, counted before trimming (ASUMSI: the comment box counter uses the same number). */
export const TASK_COMMENT_MAX = 2000;

/** Author shown on a timeline entry whose account was removed (`author_id`/`actor_id` nulled). */
export const TASK_FORMER_MEMBER_LABEL = 'Mantan anggota';

/** `task_activity.action` values written by the create/update service (S2-04); the timeline (S2-06) reads them. */
export const TASK_ACTIVITY = {
  created: 'created',
  assigneeChanged: 'assignee_changed',
  dueDateChanged: 'due_date_changed',
  priorityChanged: 'priority_changed',
  // H-B5: payload `{ from, to }` holds phase names (null = no phase), so the row reads right after a rename.
  phaseChanged: 'phase_changed',
  // Status steps (S2-05): one row per transition, payload `{ from, to, ... }`.
  start: 'started',
  unstart: 'unstarted',
  complete: 'completed',
  reopen: 'reopened',
  cancel: 'canceled',
  uncancel: 'uncanceled',
  // Comment removal (S2-06, D6): payload `{ commentId }` only, never the comment text.
  commentDelete: 'comment.delete',
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
  phaseNotInProject: 'Tahapan tidak ditemukan di proyek ini. Pilih tahapan lain.',
  stepTooLong: `Langkah paling panjang ${TASK_CHECKLIST_TEXT_MAX} karakter.`,
  tooManySteps: `Satu tugas paling banyak punya ${TASK_CHECKLIST_MAX_ITEMS} langkah.`,
  emptyComment: 'Komentar tidak boleh kosong.',
  commentTooLong: `Komentar paling panjang ${TASK_COMMENT_MAX} karakter.`,
  nothingToChange: 'Tidak ada yang diubah.',
} as const;

/** Project roles that may be the one working on a task; a Pemantau only reads (P3 §2 Tugas ⑥). */
export const TASK_WORKER_ROLES = ['manager', 'member'] as const;
/** Whether a project role may be assigned a task; the form and the write service share this rule. */
export const isTaskWorkerRole = (r: string | null | undefined): boolean =>
  (TASK_WORKER_ROLES as readonly string[]).includes(r ?? '');
