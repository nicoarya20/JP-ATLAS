/**
 * "Pulihkan" of any Trash row: one hook that picks the call by kind and tells the page which row
 * is running (`restoringId`, one at a time). Projects come back with their tasks, tasks and events
 * on their own; each refreshes the caches its kind shows in (`useTrashActions`, `useTaskRestore`).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTaskRestore } from '~/components/tasks/useTaskDelete';
import { eventKeys, restoreEvent } from '~/lib/events-api';
import { type TrashItem, trashKeys } from '~/lib/trash-api';
import { itemKey } from '~/lib/trash-view';
import { useApiMutation } from '~/lib/use-api-mutation';
import { TRASH_ACTION_COPY } from './trash.copy';
import { useTrashActions } from './useTrashActions';

export function useTrashRestore() {
  const queryClient = useQueryClient();
  const project = useTrashActions().restore;
  const task = useTaskRestore();
  const [restoringKey, setRestoringKey] = useState<string | null>(null);
  const event = useApiMutation({
    mutationFn: ({ id }: { id: string; title: string }) => restoreEvent(id),
    successMessage: (_done, { title }) => TRASH_ACTION_COPY.eventRestored(title),
    errorTitle: TRASH_ACTION_COPY.eventRestoreFailed,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.all }),
        queryClient.invalidateQueries({ queryKey: trashKeys.all }),
      ]);
    },
    // A 409/410 means the Trash changed under the user; reload it instead of leaving a stale row.
    onError: () => void queryClient.invalidateQueries({ queryKey: trashKeys.all }),
  });

  const run = async (item: TrashItem) => {
    setRestoringKey(itemKey(item));
    try {
      if (item.kind === 'project') return await project.run({ id: item.id, name: item.name });
      if (item.kind === 'task') return await task.run({ id: item.id, number: item.number });
      return await event.run({ id: item.id, title: item.title });
    } finally {
      setRestoringKey(null);
    }
  };

  return { run, restoringKey };
}
