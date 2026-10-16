/**
 * Task writes with `loading`, toasts and cache refresh. A step on a task someone else just changed
 * (409 `STATE_CONFLICT`) reloads the task data by itself, so the user only reads one sentence.
 * Checklist and comments join with S2-06.
 */
import { useQueryClient } from '@tanstack/react-query';
import {
  type CancelTaskInput,
  cancelTask,
  completeTask,
  createTask,
  isStaleTaskError,
  type NextStepAction,
  type ReopenInput,
  reopenTask,
  startTask,
  type TaskCreateInput,
  type TaskPatch,
  taskKeys,
  uncancelTask,
  updateTask,
} from '~/lib/tasks-api';
import { useApiMutation } from '~/lib/use-api-mutation';
import { ACTION_COPY } from './tasks.copy';

const STEPS = {
  start: { run: startTask, done: ACTION_COPY.started },
  complete: { run: completeTask, done: ACTION_COPY.completed },
} as const satisfies Record<NextStepAction, unknown>;

/** Refresh of every task key, plus the error hook that reloads a task someone else changed first. */
function useTaskRefresh() {
  const queryClient = useQueryClient();
  // A write can move a task between schedule groups, change counts and the detail, so every task key refreshes.
  const refresh = () => queryClient.invalidateQueries({ queryKey: taskKeys.all });
  // The toast already says "Tugas ini baru saja diubah orang lain." (`withTaskMessage`); reloading
  // shows what the other person did instead of asking the user to reload.
  const onError = (err: unknown) => {
    if (isStaleTaskError(err)) void refresh();
  };
  return { refresh, onError };
}

/** The one next step of a row (start/complete); one hook per button so only that button spins. */
export function useNextStep() {
  const { refresh, onError } = useTaskRefresh();
  return useApiMutation({
    mutationFn: ({ ref, action }: { ref: string; action: NextStepAction }) =>
      STEPS[action].run(ref),
    successMessage: (_d, { action }) => STEPS[action].done,
    errorTitle: ACTION_COPY.stepFailed,
    onSuccess: refresh,
    onError,
  });
}

export function useTaskActions() {
  const { refresh, onError } = useTaskRefresh();

  const create = useApiMutation({
    mutationFn: (input: TaskCreateInput) => createTask(input),
    successMessage: (task) => ACTION_COPY.created(task.title),
    errorTitle: ACTION_COPY.createFailed,
    onSuccess: refresh,
  });

  const update = useApiMutation({
    mutationFn: ({ ref, patch }: { ref: string; patch: TaskPatch }) => updateTask(ref, patch),
    successMessage: ACTION_COPY.updated,
    errorTitle: ACTION_COPY.updateFailed,
    onSuccess: refresh,
    onError,
  });

  const cancel = useApiMutation({
    mutationFn: ({ ref, input }: { ref: string; input: CancelTaskInput }) => cancelTask(ref, input),
    successMessage: ACTION_COPY.canceled,
    errorTitle: ACTION_COPY.cancelFailed,
    onSuccess: refresh,
    onError,
  });

  const reopen = useApiMutation({
    mutationFn: ({ ref, input }: { ref: string; input: ReopenInput }) => reopenTask(ref, input),
    successMessage: ACTION_COPY.reopened,
    errorTitle: ACTION_COPY.reopenFailed,
    onSuccess: refresh,
    onError,
  });

  const uncancel = useApiMutation({
    mutationFn: ({ ref }: { ref: string }) => uncancelTask(ref),
    successMessage: ACTION_COPY.uncanceled,
    errorTitle: ACTION_COPY.uncancelFailed,
    onSuccess: refresh,
    onError,
  });

  return { nextStep: useNextStep(), create, update, cancel, reopen, uncancel };
}
