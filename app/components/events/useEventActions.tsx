/**
 * Event writes with `loading`, toasts and cache refresh (S7 E-11): "Batalkan acara" (T2, the dialog
 * is `CancelEventModal`) and "Hapus acara" (T1: no dialog, the toast offers "Urungkan" for the metrics
 * undo window and restores the event from the Trash). The mutation options are built from injected
 * calls (`EventFlow`) so the flows are testable without a DOM, like `useTaskDelete`.
 */
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '~/components/ui/notify';
import {
  cancelEvent,
  type EventDetail,
  eventKeys,
  restoreEvent,
  type TrashedEvent,
  trashEvent,
} from '~/lib/events-api';
import { trashKeys } from '~/lib/trash-api';
import { type MutationOptions, useApiMutation } from '~/lib/use-api-mutation';
import { ACTION_COPY } from './event-detail.copy';

/** The calls the flows make, injected so a test can watch them. */
export type EventFlow = {
  cancel: (id: string, reason: string) => Promise<EventDetail>;
  trash: (id: string) => Promise<TrashedEvent>;
  restore: (id: string) => Promise<{ id: string }>;
  refresh: () => Promise<unknown>;
  undo: (message: string, onUndo: () => void) => void;
};

/** "Batalkan acara": the reason goes to the guests; lists and the detail reload to show Dibatalkan. */
export function cancelOptions(
  flow: Pick<EventFlow, 'cancel' | 'refresh'>,
): MutationOptions<{ id: string; reason: string }, EventDetail> {
  return {
    mutationFn: ({ id, reason }) => flow.cancel(id, reason),
    successMessage: ACTION_COPY.canceled,
    errorTitle: ACTION_COPY.cancelFailed,
    onSuccess: async () => {
      await flow.refresh();
    },
    // 404/409 mean the event changed under the user; reload so the page shows what is true now.
    onError: () => void flow.refresh(),
  };
}

/** "Urungkan": the event comes back from the Trash, then the page returns to it and caches reload. */
export function restoreOptions(
  flow: Pick<EventFlow, 'restore' | 'refresh'>,
  afterRestore?: (id: string) => void,
): MutationOptions<{ id: string }, { id: string }> {
  return {
    mutationFn: ({ id }) => flow.restore(id),
    successMessage: ACTION_COPY.restored,
    errorTitle: ACTION_COPY.restoreFailed,
    onSuccess: async ({ id }) => {
      await flow.refresh();
      afterRestore?.(id);
    },
    onError: () => void flow.refresh(),
  };
}

/**
 * "Hapus acara": the call goes out at once, without a dialog. On success `afterDelete` runs first
 * (the page leaves an event that no longer exists), then the toast offers "Urungkan" → `undoRun`.
 */
export function deleteOptions(
  flow: EventFlow,
  undoRun: (id: string) => void,
  afterDelete?: () => void,
): MutationOptions<{ id: string }, TrashedEvent> {
  return {
    mutationFn: ({ id }) => flow.trash(id),
    errorTitle: ACTION_COPY.deleteFailed,
    onSuccess: async (trashed) => {
      afterDelete?.();
      void flow.refresh();
      flow.undo(ACTION_COPY.deleted, () => undoRun(trashed.id));
    },
    onError: () => void flow.refresh(),
  };
}

/** Refreshes every cache an event's state shows in: the event lists and detail, and the Trash. */
function useFlow(): EventFlow {
  const queryClient = useQueryClient();
  return {
    cancel: cancelEvent,
    trash: trashEvent,
    restore: restoreEvent,
    undo: notify.undo,
    refresh: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.all }),
        queryClient.invalidateQueries({ queryKey: trashKeys.all }),
      ]),
  };
}

type Hooks = { afterDelete?: () => void; afterRestore?: (id: string) => void };

/** `cancel.run({ id, reason })` and `remove.run({ id })`; each has its own `loading` flag. */
export function useEventActions({ afterDelete, afterRestore }: Hooks = {}) {
  const flow = useFlow();
  const restore = useApiMutation(restoreOptions(flow, afterRestore));
  const cancel = useApiMutation(cancelOptions(flow));
  const remove = useApiMutation(deleteOptions(flow, (id) => void restore.run({ id }), afterDelete));
  return { cancel, remove };
}
