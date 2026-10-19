/**
 * "Hapus tugas" and "Urungkan" (S6 D1, CLAUDE.md UX T1): the delete runs at once, without a dialog,
 * and the toast carries an "Urungkan" button for the metrics undo window that restores the task from
 * the Trash. Tasks, projects (progress) and the Trash refresh after either, so no list keeps a ghost.
 * The mutation options are built from injected calls (`TrashFlow`) so the flow is testable without a DOM.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { notify } from '~/components/ui/notify';
import { projectKeys } from '~/lib/projects-api';
import { type DeletedTask, deleteTask, restoreTrashedTask } from '~/lib/task-trash-api';
import { taskKeys } from '~/lib/tasks-api';
import { trashKeys } from '~/lib/trash-api';
import { type MutationOptions, useApiMutation } from '~/lib/use-api-mutation';
import { DELETE_COPY } from './tasks.copy';

/** The task a delete or restore is about: `ref` is its number (the URL handle), `id` its row id. */
export type TaskTrashTarget = { id: string; number: number };

/** The calls the flow makes, injected so a test can watch them. */
export type TrashFlow = {
  remove: (ref: string) => Promise<DeletedTask>;
  restore: (id: string) => Promise<{ id: string; number: number }>;
  refresh: () => Promise<unknown>;
  undo: (message: string, onUndo: () => void) => void;
};

/** Options of "Pulihkan"/"Urungkan": the task comes back, then every cache it shows in reloads. */
export function restoreOptions(
  flow: Pick<TrashFlow, 'restore' | 'refresh'>,
): MutationOptions<TaskTrashTarget, { id: string; number: number }> {
  return {
    mutationFn: ({ id }) => flow.restore(id),
    successMessage: (_done, { number }) => DELETE_COPY.restored(number),
    errorTitle: DELETE_COPY.restoreFailed,
    onSuccess: async () => {
      await flow.refresh();
    },
    // A 409/410 means the Trash changed under the user; reload it instead of leaving a stale row.
    onError: () => void flow.refresh(),
  };
}

/**
 * Options of "Hapus tugas": no confirmation, the call goes out at once. On success `afterDelete`
 * runs first (a detail page leaves the task it just removed), then the toast offers "Urungkan",
 * which calls `undoRun` with the task's id.
 */
export function deleteOptions(
  flow: TrashFlow,
  undoRun: (target: TaskTrashTarget) => void,
  afterDelete?: () => void,
): MutationOptions<{ ref: string }, DeletedTask> {
  return {
    mutationFn: ({ ref }) => flow.remove(ref),
    errorTitle: DELETE_COPY.deleteFailed,
    onSuccess: async (deleted) => {
      afterDelete?.();
      void flow.refresh();
      flow.undo(DELETE_COPY.deleted, () => undoRun({ id: deleted.id, number: deleted.number }));
    },
    // The task may already be gone (someone else deleted it); reload the lists either way.
    onError: () => void flow.refresh(),
  };
}

/** Refreshes every cache a task's trash state shows in. */
function useFlow(): TrashFlow {
  const queryClient = useQueryClient();
  return {
    remove: deleteTask,
    restore: restoreTrashedTask,
    undo: notify.undo,
    refresh: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        queryClient.invalidateQueries({ queryKey: projectKeys.all }),
        queryClient.invalidateQueries({ queryKey: trashKeys.all }),
      ]),
  };
}

/** Restores a trashed task by id; `restoringId` is the row whose button spins. */
export function useTaskRestore() {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const mutation = useApiMutation(restoreOptions(useFlow()));
  return {
    loading: mutation.loading,
    restoringId,
    run: async (target: TaskTrashTarget) => {
      setRestoringId(target.id);
      const result = await mutation.run(target); // never throws: failures come back as `ok: false`
      setRestoringId(null);
      return result;
    },
  };
}

/** Deletes the task `ref` names; `loading` is for the menu button, `run({ ref })` for its click. */
export function useTaskDelete(afterDelete?: () => void) {
  const restore = useTaskRestore();
  return useApiMutation(
    deleteOptions(useFlow(), (target) => void restore.run(target), afterDelete),
  );
}
