/** Writes of the task detail body: checklist steps and comments, each with `loading` and toasts. */
import { useQueryClient } from '@tanstack/react-query';
import {
  addComment,
  addStep,
  editComment,
  isStaleTaskError,
  patchStep,
  removeComment,
  removeStep,
  taskKeys,
} from '~/lib/tasks-api';
import { useApiMutation } from '~/lib/use-api-mutation';
import { CHECKLIST_COPY, COMMENT_COPY, TIMELINE_COPY } from './task-body.copy';

/** Every write refreshes all task keys, so the detail ("2/3") and the timeline agree with the server. */
export function useChecklistActions(ref: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: taskKeys.all });
  const onError = (err: unknown) => {
    if (isStaleTaskError(err)) void refresh();
  };
  const add = useApiMutation({
    mutationFn: (text: string) => addStep(ref, text),
    errorTitle: CHECKLIST_COPY.addFailed,
    onSuccess: refresh,
    onError,
  });
  const change = useApiMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { text?: string; isDone?: boolean } }) =>
      patchStep(ref, id, patch),
    errorTitle: CHECKLIST_COPY.changeFailed,
    onSuccess: refresh,
    onError,
  });
  const remove = useApiMutation({
    mutationFn: (id: string) => removeStep(ref, id),
    successMessage: CHECKLIST_COPY.removed,
    errorTitle: CHECKLIST_COPY.removeFailed,
    onSuccess: refresh,
    onError,
  });
  return { add, change, remove };
}

export function useCommentActions(ref: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: taskKeys.all });
  const send = useApiMutation({
    mutationFn: (body: string) => addComment(ref, body),
    successMessage: COMMENT_COPY.sent,
    errorTitle: COMMENT_COPY.failed,
    onSuccess: refresh,
  });
  const edit = useApiMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => editComment(ref, id, body),
    errorTitle: TIMELINE_COPY.editFailed,
    onSuccess: refresh,
  });
  const remove = useApiMutation({
    mutationFn: (id: string) => removeComment(ref, id),
    successMessage: TIMELINE_COPY.deleted,
    errorTitle: TIMELINE_COPY.deleteFailed,
    onSuccess: refresh,
  });
  return { send, edit, remove };
}
