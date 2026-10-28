// Move to Trash from the task detail's ⋯ menu (T1, as for events): it acts at once, the detail closes onto the task
// list, and the snack there offers Undo for a while. The Trash keeps the task for the retention period after that.
import { router } from 'expo-router';
import { useState } from 'react';

import { isApiError } from '@/api/errors';
import { useNotice } from '@/components/notice/use-notice';
import { showSnack } from '@/components/snack/use-snack';
import { writeError } from '@/components/state/write-error';
import { restoreTask, trashTask } from '@/data/tasks.trash';

import { S } from '../tasks.strings';

/** Moves task #no (id `id`) to the Trash; a second pick while it is out does nothing. */
export function useTaskTrash(no: number, id: string) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  // The snack is already closed here, and so is the detail: the outcome goes to a notice.
  const undo = async () => {
    try {
      await restoreTask(id);
      notice(S.detail.restored);
    } catch (e) {
      notice(writeError(e));
      if (!isApiError(e)) throw e;
    }
  };
  return async () => {
    if (busy) return;
    setBusy(true);
    try {
      await trashTask(no, id);
    } catch (e) {
      setBusy(false);
      notice(writeError(e));
      if (!isApiError(e)) throw e;
      return;
    }
    router.dismissTo('/tasks');
    showSnack({ message: S.detail.trashed, action: S.detail.undo, onAction: () => void undo() });
  };
}
