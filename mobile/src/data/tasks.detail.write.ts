/**
 * What the task detail writes (map `phase2-map-tasks.md` §4): the workflow steps (`POST
 * /tasks/:ref/<step>`), the checklist and comments. Each resolves with the notice to show, or throws
 * the server's error, whose message is shown as it is (K5); a failure also reaches the session
 * (pattern §3). Only a success invalidates: every task view for a step, the task and the cards for a
 * checklist change (its "2/3"), the timeline for a comment.
 */
import { apiPatch, apiPost } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { type Resource, write } from './resource';
import { taskListTargets, taskWriteTargets } from './tasks.api';
import { taskDetailResource, taskTimelineResource } from './tasks.detail.api';
import type { ChecklistReplyWire } from './tasks.detail.wire';
import type { TaskCancelCategoryWire, TaskTransitionWire } from './tasks.wire';

export type WorkflowStep = 'start' | 'unstart' | 'complete' | 'reopen' | 'cancel' | 'uncancel';

export const STEP_NOTICE: Record<WorkflowStep, string> = {
  start: 'Task started',
  unstart: 'Stopped working',
  complete: 'Marked as done',
  reopen: 'Task reopened',
  cancel: 'Task canceled',
  uncancel: 'Task restored',
};

/** The reason Reopen asks for: the server's REASON_REQUIRED rule (`task-flow.policy.ts`), 3-200. */
export const REOPEN_REASON = { min: 3, max: 200 } as const;
/** The longest note on a cancellation (`TASK_CANCEL_NOTE_MAX`). */
export const CANCEL_NOTE_MAX = 500;
/** The longest checklist step (`TASK_CHECKLIST_TEXT_MAX`). */
export const STEP_TEXT_MAX = 300;
/** The longest comment (`TASK_COMMENT_MAX`). */
export const COMMENT_MAX = 2000;

/** The reason as Reopen sends it, or null while it is too short or too long. */
export function reopenReason(text: string): string | null {
  const why = text.trim();
  return why.length >= REOPEN_REASON.min && why.length <= REOPEN_REASON.max ? why : null;
}

/** The body Cancel sends, or null while it is incomplete (Other needs a note). */
export function cancelBody(
  category: TaskCancelCategoryWire | null,
  note: string,
): { category: TaskCancelCategoryWire; note?: string } | null {
  const text = note.trim();
  if (!category || text.length > CANCEL_NOTE_MAX) return null;
  if (category === 'other' && !text) return null;
  return text ? { category, note: text } : { category };
}

const taskPath = (id: string) => `/api/app/tasks/${encodeURIComponent(id)}`;

/** A failed write reaches the session before it reaches the screen (pattern §3). */
async function send<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (isApiError(e)) applyApiError(e);
    throw e;
  }
}

/** Moves task `id` one workflow step; `body` carries Reopen's reason or Cancel's category. */
export async function runTaskStep(id: string, step: WorkflowStep, body?: object): Promise<string> {
  await write(
    () => send(() => apiPost<TaskTransitionWire>(`${taskPath(id)}/${step}`, body)),
    taskWriteTargets(),
  );
  return STEP_NOTICE[step];
}

const checklistTargets = (no: number): Resource<unknown>[] => [
  taskDetailResource(no) as Resource<unknown>,
  ...taskListTargets(),
];

/** Adds a step at the end of task #no's checklist. */
export async function addChecklistStep(no: number, id: string, text: string): Promise<string> {
  await write(
    () => send(() => apiPost<ChecklistReplyWire>(`${taskPath(id)}/checklist`, { text })),
    checklistTargets(no),
  );
  return 'Step added';
}

/** Ticks a step of task #no, or clears its tick. */
export async function tickChecklistStep(
  no: number,
  id: string,
  itemId: string,
  isDone: boolean,
): Promise<void> {
  await write(
    () =>
      send(() =>
        apiPatch<ChecklistReplyWire>(`${taskPath(id)}/checklist/${encodeURIComponent(itemId)}`, {
          isDone,
        }),
      ),
    checklistTargets(no),
  );
}

/** Adds a comment to task #no; it shows at the top of the timeline. */
export async function addTaskComment(no: number, id: string, body: string): Promise<string> {
  await write(
    () => send(() => apiPost<unknown>(`${taskPath(id)}/comments`, { body })),
    [taskTimelineResource(no) as Resource<unknown>],
  );
  return 'Comment sent';
}
