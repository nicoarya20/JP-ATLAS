/**
 * Trash writes (S1-18): "Hapus proyek" behind a T2 dialog, then back to the project list with an
 * "Urungkan" toast that restores it, and "Pulihkan" on the Trash page. Both refresh projects and Trash.
 */

import { lastRestorableDate } from '@server/metrics/trash.metrics';
import type { IsoDate } from '@server/metrics/types';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { confirmAction } from '~/components/ui/confirmAction';
import { formatCalendarDate } from '~/components/ui/DateText';
import { notify } from '~/components/ui/notify';
import { projectKeys } from '~/lib/projects-api';
import { restoreProject, trashKeys, trashProject } from '~/lib/trash-api';
import { useApiMutation } from '~/lib/use-api-mutation';
import { TRASH_ACTION_COPY, TRASH_CONFIRM_COPY } from './trash.copy';

export const PROJECT_LIST_PATH = '/app/projects';

/** A project as the dialog and toasts name it; `tasks` is how many go to the Trash with it. */
export type TrashTarget = { id: string; name: string; tasks: number };

/** Dialog text for deleting `target` today (server's day): restorable until the last day of retention. */
export function trashConfirmText(target: TrashTarget, today: IsoDate) {
  return {
    title: TRASH_CONFIRM_COPY.title(target.name),
    body: TRASH_CONFIRM_COPY.body(target.tasks, formatCalendarDate(lastRestorableDate(today))),
  };
}

export function useTrashActions() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: projectKeys.all }),
      queryClient.invalidateQueries({ queryKey: trashKeys.all }),
    ]);
  };

  const restore = useApiMutation({
    mutationFn: ({ id }: { id: string; name: string }) => restoreProject(id),
    successMessage: (moved, { name }) => TRASH_ACTION_COPY.restored(name, moved.tasks),
    errorTitle: TRASH_ACTION_COPY.restoreFailed,
    onSuccess: refresh,
  });

  const remove = useApiMutation({
    mutationFn: ({ id }: TrashTarget) => trashProject(id),
    errorTitle: TRASH_ACTION_COPY.trashFailed,
    onSuccess: async (_moved, target) => {
      await refresh();
      // The project page is gone now; the list is where "Urungkan" makes sense (X1-Q1: dialog + undo).
      navigate(PROJECT_LIST_PATH);
      notify.undo(TRASH_ACTION_COPY.trashed(target.name), () => {
        void restore.run({ id: target.id, name: target.name });
      });
    },
  });

  return {
    restore: {
      ...restore,
      /** Id of the row whose "Pulihkan" is running, for that row's `loading`. */
      restoringId,
      run: async (vars: { id: string; name: string }) => {
        setRestoringId(vars.id);
        const result = await restore.run(vars); // never throws: failures come back as `ok: false`
        setRestoringId(null);
        return result;
      },
    },
    remove: {
      ...remove,
      /** Opens the T2 dialog; the project moves to the Trash only after the user confirms. */
      confirm: (target: TrashTarget, today: IsoDate) =>
        confirmAction({
          ...trashConfirmText(target, today),
          confirmLabel: TRASH_CONFIRM_COPY.confirmLabel,
          danger: true,
          onConfirm: () => void remove.run(target),
        }),
    },
  };
}
