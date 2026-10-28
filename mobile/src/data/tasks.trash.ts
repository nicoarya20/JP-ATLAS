/**
 * Move a task to the Trash (`DELETE /tasks/:ref`) and its Undo (`POST /trash/task/:id/restore`), the T1 pair of the
 * task detail's ⋯ menu. Like the other task writes, a failure reaches the session first and is re-thrown so the screen
 * can say why; only an accepted write marks reads stale.
 */
import { apiDelete, apiPost } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { type Resource, write } from './resource';
import { taskWriteTargets } from './tasks.api';
import { taskDetailResource, taskTimelineResource } from './tasks.detail.api';
import { trashResource } from './trash.api';

export type TaskTrashWire = { trash: { kind: 'task'; id: string; number: number; label: string } };

async function send<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (isApiError(e)) applyApiError(e);
    throw e;
  }
}

/** Every task view, and the Trash page the task moves in and out of. */
const targets = (): Resource<unknown>[] => [
  ...taskWriteTargets(),
  trashResource as Resource<unknown>,
];

/**
 * Task #no (id `id`) moves to the Trash. Its detail and timeline are forgotten rather than refetched: kept, the last
 * copy would still show if it were opened again, where the server now answers 404.
 */
export async function trashTask(no: number, id: string): Promise<TaskTrashWire> {
  const moved = await write(
    () => send(() => apiDelete<TaskTrashWire>(`/api/app/tasks/${encodeURIComponent(id)}`)),
    targets(),
  );
  taskDetailResource(no).forget();
  taskTimelineResource(no).forget();
  return moved;
}

/** The Undo of trashTask: the task comes back with the same number. */
export const restoreTask = (id: string): Promise<{ id: string; number: number }> =>
  write(
    () =>
      send(() =>
        apiPost<{ id: string; number: number }>(
          `/api/app/trash/task/${encodeURIComponent(id)}/restore`,
        ),
      ),
    targets(),
  );
