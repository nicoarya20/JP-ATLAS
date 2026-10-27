/**
 * Writes to `/api/app/tasks*`, and the one place that says what each one made stale.
 *
 * The rule behind every call here is §2 of `docs/phase2-pola-data.md`: no screen unmounts, so a
 * store that is not invalidated after a successful write keeps showing the old value on *every*
 * screen still alive — silently. So each write names everything it could have changed: the task's
 * own detail and timeline, every task list fetched so far, the counts, and Home (its chips, Focus
 * and agenda are built from the same tasks).
 *
 * `write()` invalidates only when the request succeeded. A refused write changed nothing on the
 * server, so nothing on screen is out of date — and the error is thrown on, not swallowed, for the
 * screen to show.
 */
import { apiDelete, apiPatch, apiPost } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { homeResource } from './home.api';
import { type Resource, write } from './resource';
import {
  taskCounts,
  taskDetail,
  taskDetails,
  taskLists,
  taskTimeline,
  taskTimelines,
} from './tasks.api';
import type {
  WireCancelCategory,
  WireChecklistItem,
  WireTransition,
  WireTrashed,
} from './tasks.api.types';

/**
 * Everything a write to task `ref` may have changed.
 *
 * Deliberately wide: a status change moves the task between schedule groups and board columns, so
 * every list that was ever asked for can be wrong, not only the one in front. One request too many
 * is far cheaper than a number that is quietly wrong.
 */
export function touchedBy(ref: string | number): Resource<unknown>[] {
  return [taskDetail(ref), taskTimeline(ref), ...everyTaskStore()] as Resource<unknown>[];
}

/**
 * Everything a write names when it cannot name one task: every list, detail and timeline fetched so
 * far, the counts and Home.
 *
 * Undo of a trashed task is the case. It is addressed by the trash entry's **id** while the screens
 * hold the task by its number (B1), so asking `touchedBy(id)` would build a detail and a timeline
 * under a key nothing ever reads — and still have to invalidate the number-keyed ones anyway.
 */
export function everyTaskStore(): Resource<unknown>[] {
  return [
    ...taskLists(),
    ...taskDetails(),
    ...taskTimelines(),
    taskCounts,
    homeResource,
  ] as Resource<unknown>[];
}

const stepPath = (ref: string | number, step: string) =>
  `/api/app/tasks/${encodeURIComponent(String(ref))}/${step}`;

/**
 * One write: it invalidates what it touched when it succeeds, and a failure about the *session* is
 * routed to the gate before it is thrown on.
 *
 * `resource()` does that routing for every read, but a write is made outside one, so §3 of
 * `docs/phase2-pola-data.md` asks each write to do it itself: an approval withdrawn mid-session
 * must move the screen, not just colour one button red. Everything else is thrown on untouched, so
 * the screen can show the server's own sentence (K5).
 */
async function send<T>(run: () => Promise<T>, touched: Resource<unknown>[]): Promise<T> {
  try {
    return await write(run, touched);
  } catch (cause) {
    if (isApiError(cause)) applyApiError(cause);
    throw cause;
  }
}

/**
 * One workflow step: `start`, `unstart`, `complete`, `reopen`, `cancel` or `uncancel`. The answer
 * carries the row as it now is and its fresh `can{}`, which the invalidated detail picks up too.
 *
 * A step the task's state does not allow is the server's to refuse (`409 WRONG_STATE`); the caller
 * is expected to have offered only what `can{}` allowed, so a refusal here is worth showing.
 */
export const runStep = (ref: string | number, step: string, body?: unknown) =>
  send(() => apiPost<WireTransition>(stepPath(ref, step), body), touchedBy(ref));

/** Reopen a finished task. The reason is the server's requirement, 3–200 characters. */
export const reopenTask = (ref: string | number, reason: string) =>
  runStep(ref, 'reopen', { reason });

/**
 * Cancel a task: a category, and a note the server insists on when the category is `other`. Two
 * fields, never one joined sentence — the server stores them apart.
 */
export const cancelTaskOnServer = (
  ref: string | number,
  category: WireCancelCategory,
  note?: string,
) => runStep(ref, 'cancel', note?.trim() ? { category, note: note.trim() } : { category });

/** What the checklist endpoints answer: the item written, and the counts after it. */
export type WireChecklistResult = {
  item: WireChecklistItem;
  checklist: { done: number; total: number; items: WireChecklistItem[] };
};

const checklistPath = (ref: string | number, itemId?: string) =>
  `${stepPath(ref, 'checklist')}${itemId ? `/${encodeURIComponent(itemId)}` : ''}`;

/** Add a step to a task's checklist. */
export const addChecklistItem = (ref: string | number, text: string) =>
  send(() => apiPost<WireChecklistResult>(checklistPath(ref), { text }), touchedBy(ref));

/** Tick or untick a step, or rename it. */
export const editChecklistItem = (
  ref: string | number,
  itemId: string,
  fields: { text?: string; isDone?: boolean },
) => send(() => apiPatch<WireChecklistResult>(checklistPath(ref, itemId), fields), touchedBy(ref));

/** A comment on a task; it shows up in the timeline the invalidation refetches. */
export const addComment = (ref: string | number, body: string) =>
  send(() => apiPost<unknown>(stepPath(ref, 'comments'), { body }), touchedBy(ref));

/**
 * Move a task to the Trash (the "Move to Archive" of the menu, A14): it leaves every list, and the
 * server keeps it for 30 days.
 *
 * The answer carries the trash entry's **id**, which Undo needs: `POST /trash/task/:id/restore`
 * takes an id where every other task route also takes a number (B1).
 */
export const trashTask = (ref: string | number) =>
  send(() => apiDelete<WireTrashed>(`/api/app/tasks/${encodeURIComponent(String(ref))}`), touchedBy(ref));

/** Undo of a trashed task, by the id the delete answered with. */
export const restoreTrashedTask = (id: string) =>
  send(
    () => apiPost<{ id: string; number: number }>(`/api/app/trash/task/${encodeURIComponent(id)}/restore`),
    everyTaskStore(),
  );
