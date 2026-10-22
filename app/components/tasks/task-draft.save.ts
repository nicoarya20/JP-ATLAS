/**
 * Saves the picked drafts of "Tulis saja ✦" one by one through the normal create call (U1). A draft
 * that fails is reported on its own card and the others still go through; a saved draft is never sent again.
 */
import { describeApiError } from '~/lib/http';
import type { TaskCreateInput } from '~/lib/tasks-api';
import type { SavedTask } from './TaskCreateForm';
import { type DraftItem, isPending, type WriteAction } from './task-draft.state';
import { toCreateTaskInput } from './task-form';

export type CreateOne = (input: TaskCreateInput) => Promise<SavedTask>;

export type BatchResult = { saved: SavedTask[]; failed: number };

/** Sequential on purpose: task numbers follow the order on screen, and one error never hides another. */
export async function saveDrafts(
  items: DraftItem[],
  create: CreateOne,
  dispatch: (action: WriteAction) => void,
): Promise<BatchResult> {
  const targets = items.filter(isPending);
  const result: BatchResult = { saved: [], failed: 0 };
  dispatch({ type: 'batchStarted', total: targets.length });
  try {
    for (const item of targets) {
      dispatch({ type: 'saving', id: item.id });
      try {
        const created = await create(toCreateTaskInput(item.values));
        const task = { id: created.id, number: created.number, title: created.title };
        result.saved.push(task);
        dispatch({ type: 'saved', id: item.id, task });
      } catch (err) {
        result.failed += 1;
        dispatch({ type: 'failed', id: item.id, error: describeApiError(err) });
      }
    }
  } finally {
    dispatch({ type: 'batchEnded' });
  }
  return result;
}
