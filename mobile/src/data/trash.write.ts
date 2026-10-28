/**
 * Trash writes (map `phase2-map-profile-archive.md` §4d): Restore (`POST /trash/:kind/:id/restore`) and Delete
 * forever (`DELETE /trash/:kind/:id`, Admin and Super-admin; the item's `can.purge` says so). Each write reports a
 * failure to the session itself and re-throws it, so the screen can say why; only an accepted write marks reads
 * stale. A restore brings the item back to Projects, Tasks, Events and Home; a purge only changes the Trash.
 */
import { apiDelete, apiPost } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { eventListTargets } from './events.api';
import { homeResource } from './home.api';
import { projectsResource } from './projects.api';
import { type Resource, write } from './resource';
import { filterProjectsResource, taskListTargets, tasksCountsResource } from './tasks.api';
import { trashResource } from './trash.api';
import type { TrashItemWire, TrashPurgeWire, TrashRestoreWire } from './trash.wire';

/** A write outside a resource reports its own failure to the session, then re-throws it (pattern §3). */
async function send<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (isApiError(e)) applyApiError(e);
    throw e;
  }
}

const path = (item: Pick<TrashItemWire, 'kind' | 'id'>) =>
  `/api/app/trash/${item.kind}/${encodeURIComponent(item.id)}`;

/** Everything a restored item shows up in again. One not loaded yet is skipped by `invalidate` itself. */
const restoreTargets = (): Resource<unknown>[] => [
  trashResource as Resource<unknown>,
  projectsResource as Resource<unknown>,
  filterProjectsResource as Resource<unknown>,
  ...taskListTargets(),
  tasksCountsResource as Resource<unknown>,
  ...eventListTargets(),
  homeResource as Resource<unknown>,
];

/** Restore one item; a project brings back the tasks and events that went with it. */
export const restoreTrashItem = (item: TrashItemWire): Promise<TrashRestoreWire> =>
  write(() => send(() => apiPost<TrashRestoreWire>(`${path(item)}/restore`)), restoreTargets());

/** Delete one item for good; a project takes its tasks and events along. */
export const purgeTrashItem = (item: TrashItemWire): Promise<TrashPurgeWire> =>
  write(
    () => send(() => apiDelete<TrashPurgeWire>(path(item))),
    [trashResource as Resource<unknown>],
  );
