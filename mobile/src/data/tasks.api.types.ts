/**
 * The shapes `/api/app/tasks*` answers with, as this app reads them.
 *
 * Mirrors `server/task/task.dto.ts`, `server/task/task-timeline.query.ts` and
 * `server/access/capabilities.ts` field for field — the server's names, not the screens'. Turning
 * these into what a screen shows is `tasks.api.map.ts`; the request layer is `tasks.api.ts`.
 *
 * Why a copy instead of an import: `mobile/` is its own package and cannot reach `server/`. The
 * copy is narrow on purpose — only the fields a screen uses are declared, so a server field this
 * app ignores cannot drift into looking supported. Fields the server sends but Fase 2 does not use
 * (`labels`, `project.status`, `startDate`) are declared where they are cheap to keep, and the ones
 * mobile wants but the server has no column for are listed in `docs/phase2-gap-disembunyikan.md`.
 */

/** A person as every task DTO refers to them: the id is the identity, the name is for display (K4). */
export type WirePerson = { id: string; name: string };

export type WireTaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';
export type WirePriority = 'low' | 'medium' | 'high' | 'critical';
export type WireBaseKind = 'task' | 'issue' | 'idea';
export type WireCancelCategory =
  | 'duplicate'
  | 'not_needed'
  | 'out_of_scope'
  | 'created_by_mistake'
  | 'other';
export type WireProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'canceled';

/** The six groups an open task's due date can fall in; a closed task is in none of them. */
export type WireScheduleGroup = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none';

/** Badges the server computes; `blocked` waits on S4 and never arrives yet. */
export type WireTaskLabel = 'overdue' | 'awaiting_my_review' | 'blocked' | 'stale' | 'reopened';

/** The one control a row highlights, as the server picked it (`primaryAction`). */
export type WirePrimaryAction =
  | 'start'
  | 'complete'
  | 'requestReview'
  | 'approve'
  | 'reopen'
  | 'uncancel';

/** The fifteen keys of a task's `can{}` (`TASK_CAP_KEYS`). */
export type WireTaskCapKey =
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

/**
 * One capability: `true` = show it enabled, a string = show it disabled with `capMessage`'s reason,
 * **absent** = hide it. The three states are the server's to decide (`DENY_UI[code].ui`); this app
 * reads them and never invents a rule of its own.
 */
export type WireCap = true | string;

/** A sparse capability map: a key that is not there means the control is hidden. */
export type WireCaps = Partial<Record<WireTaskCapKey, WireCap>>;

export type WireProjectRef = { id: string; name: string; status: WireProjectStatus };
export type WirePhaseRef = { id: string; name: string };

/** A row of `GET /api/app/tasks`. No `kind` and no `tags`: see A3 and A2. */
export type WireTaskListItem = {
  id: string;
  /** The global number the routes and the UI use (`#12`). */
  number: number;
  title: string;
  status: WireTaskStatus;
  priority: WirePriority;
  /** `YYYY-MM-DD`, or null for a task with no due date. */
  dueDate: string | null;
  /** One assignee, or none. Several assignees need a server table (A1). */
  assignee: WirePerson | null;
  project: WireProjectRef;
  phase: WirePhaseRef | null;
  labels: WireTaskLabel[];
  checklist: { done: number; total: number };
  primary: WirePrimaryAction | null;
  can: WireCaps;
};

export type WireChecklistItem = { id: string; text: string; isDone: boolean; position: number };

/** `GET /api/app/tasks/:ref`: the list row plus everything only the detail shows. */
export type WireTaskDetail = Omit<WireTaskListItem, 'checklist'> & {
  description: string | null;
  startDate: string | null;
  kind: { id: string; name: string; baseKind: WireBaseKind };
  creator: WirePerson | null;
  reviewer: WirePerson | null;
  needsReview: boolean;
  reopenCount: number;
  cancel: { category: WireCancelCategory; note: string | null } | null;
  /** Instants, all ISO UTC: read them through `instant.ts`, never with the date helpers (K2). */
  startedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  checklist: { done: number; total: number; items: WireChecklistItem[] };
};

/** `GET /api/app/tasks`: one keyset page. `nextCursor: null` is the last page. */
export type WireTaskPage = {
  items: WireTaskListItem[];
  nextCursor: string | null;
  /** Response-level capabilities; `createTask` absent = no New task button. */
  caps: { createTask?: WireCap };
};

/** `GET /api/app/tasks/counts`. */
export type WireTaskCounts = {
  mine: Record<WireScheduleGroup, number>;
  byStatus: Record<WireTaskStatus, number>;
};

/** `GET /api/app/tasks/:ref/timeline`: comments and activity in one stream, newest first. */
export type WireTimelineEntry =
  | {
      kind: 'comment';
      id: string;
      at: string;
      author: { id: string | null; name: string };
      body: string;
      editedAt: string | null;
    }
  | {
      kind: 'activity';
      id: string;
      at: string;
      author: { id: string | null; name: string };
      /** One of `TASK_ACTIVITY`; an unknown one is kept and shown as its own verb. */
      action: string;
      payload: unknown;
    };

export type WireTimelinePage = { items: WireTimelineEntry[]; nextCursor: string | null };

/** What a workflow step answers: the row as it now is, and the buttons for it. */
export type WireTransition = {
  task: {
    id: string;
    number: number;
    status: WireTaskStatus;
    assigneeId: string | null;
    needsReview: boolean;
    reopenCount: number;
    cancel: { category: WireCancelCategory; note: string | null } | null;
    startedAt: string | null;
    completedAt: string | null;
    canceledAt: string | null;
    lastActivityAt: string;
  };
  can: WireCaps & { primary: WirePrimaryAction | null };
};

/** What `DELETE /api/app/tasks/:ref` answers: what went to the Trash, and the id Undo needs (B1). */
export type WireTrashed = {
  trash: { kind: 'task'; id: string; number: number; label: string };
};

/** A kind of task a project offers (`GET /api/app/tasks/form-options`). */
export type WireTaskKind = { id: string; name: string; baseKind: WireBaseKind };

/** A project the caller may add a task to, with its kinds and phases (A12). */
export type WireFormProject = {
  id: string;
  name: string;
  kinds: WireTaskKind[];
  phases: WirePhaseRef[];
};

export type WireFormOptions = { projects: WireFormProject[] };
