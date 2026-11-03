// Pull to refresh on the Tasks tab: what the list or the board shows, asked again from page one (as many rows as are on
// screen, tasks.paged.ts), with the group counts when they head the list. Reloads, not invalidations: someone else's
// change (a task assigned to me) is a change no write in this app marked stale.
import { taskListResource, tasksCountsResource } from './tasks.api';
import { COLUMNS } from './tasks.columns';
import { columnStatus, type ListOptions, plainMine } from './tasks.list';
import { listParams } from './tasks.query';

/** Reloads the list or the board columns the Tasks tab shows; settles once every request has (failures stay on screen). */
export function refreshTasks(view: 'list' | 'board', { scope, query, search }: ListOptions) {
  const params =
    view === 'list'
      ? [listParams(scope, query, search)]
      : COLUMNS.flatMap((c) => {
          const status = columnStatus(query, c);
          return status ? [listParams(scope, query, search, status)] : [];
        });
  return Promise.all([
    ...params.map((p) => taskListResource(p).reload()),
    ...(plainMine(scope, query, search) ? [tasksCountsResource.reload()] : []),
  ]);
}
