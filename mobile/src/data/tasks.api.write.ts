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
import { apiPatch, apiPost } from '@/api/client';

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
import type { WireCancelCategory, WireChecklistItem, WireTransition } from './tasks.api.types';

/**
 * Everything a write to task `ref` may have changed.
 *
 * Deliberately wide: a status change moves the task between schedule groups and board columns, so
 * every list that was ever asked for can be wrong, not only the one in front. One request too many
 * is far cheaper than a number that is quietly wrong.
 */
export function touchedBy(ref: string | number): Resource<unknown>[] {
  return [
    taskDetail(ref),
    taskTimeline(ref),
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
 * One workflow step: `start`, `unstart`, `complete`, `reopen`, `cancel` or `uncancel`. The answer
 * carries the row as it now is and its fresh `can{}`, which the invalidated detail picks up too.
 *
 * A step the task's state does not allow is the server's to refuse (`409 WRONG_STATE`); the caller
 * is expected to have offered only what `can{}` allowed, so a refusal here is worth showing.
 */
export const runStep = (ref: string | number, step: string, body?: unknown) =>
  write(() => apiPost<WireTransition>(stepPath(ref, step), body), touchedBy(ref));

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
  write(() => apiPost<WireChecklistResult>(checklistPath(ref), { text }), touchedBy(ref));

/** Tick or untick a step, or rename it. */
export const editChecklistItem = (
  ref: string | number,
  itemId: string,
  fields: { text?: string; isDone?: boolean },
) => write(() => apiPatch<WireChecklistResult>(checklistPath(ref, itemId), fields), touchedBy(ref));

/** A comment on a task; it shows up in the timeline the invalidation refetches. */
export const addComment = (ref: string | number, body: string) =>
  write(() => apiPost<unknown>(stepPath(ref, 'comments'), { body }), touchedBy(ref));
