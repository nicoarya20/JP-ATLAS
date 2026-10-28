/**
 * What `/api/app/tasks/:ref` and its parts send, mirrored from `server/task/task.dto.ts`,
 * `task-timeline.query.ts`, `task-checklist.service.ts` and `task-comment.service.ts` (map
 * `phase2-map-tasks.md` §0, §2c). Types only; instants are ISO strings (read them through
 * `instant.ts`), days are `YYYY-MM-DD`.
 */
import type { PageWire } from './tasks.paged';
import type { PersonRefWire, TaskCancelCategoryWire, TaskListItemWire } from './tasks.wire';

export type ChecklistItemWire = { id: string; text: string; isDone: boolean; position: number };
export type ChecklistWire = { done: number; total: number; items: ChecklistItemWire[] };

/** `GET /api/app/tasks/:ref`: the list row and everything only the detail carries. */
export type TaskDetailWire = Omit<TaskListItemWire, 'checklist'> & {
  description: string | null;
  startDate: string | null;
  kind: { id: string; name: string; baseKind: 'task' | 'issue' | 'idea' };
  creator: PersonRefWire | null;
  reviewer: PersonRefWire | null;
  needsReview: boolean;
  reopenCount: number;
  cancel: { category: TaskCancelCategoryWire; note: string | null } | null;
  startedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  checklist: ChecklistWire;
};

/** A removed account has no id; its name is the server's stand-in ("Mantan anggota", K5). */
export type TimelinePersonWire = { id: string | null; name: string };

/** One entry of `GET /api/app/tasks/:ref/timeline`, newest first. */
export type TimelineEntryWire =
  | {
      kind: 'comment';
      id: string;
      at: string;
      author: TimelinePersonWire;
      body: string;
      editedAt: string | null;
    }
  | {
      kind: 'activity';
      id: string;
      at: string;
      author: TimelinePersonWire;
      /** `TASK_ACTIVITY` in `server/task/task.limits.ts`; its sentence is the app's (§3). */
      action: string;
      payload: unknown;
    };

export type TimelinePageWire = PageWire<TimelineEntryWire>;

/** A checklist write answers the step it touched (null once removed) and the whole checklist. */
export type ChecklistReplyWire = { item: ChecklistItemWire | null; checklist: ChecklistWire };
