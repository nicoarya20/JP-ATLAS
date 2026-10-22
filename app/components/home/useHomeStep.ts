/** The button of a focus row: take the task's next step, then refresh the Beranda and every task list. */
import type { HomeFocusTask } from '@server/home/home.dto';
import { useQueryClient } from '@tanstack/react-query';
import { homeKeys } from '~/lib/home-api';
import { completeTask, isStaleTaskError, startTask, taskKeys } from '~/lib/tasks-api';
import { type MutationOptions, useApiMutation } from '~/lib/use-api-mutation';
import { HOME_COPY } from './home.copy';

export type Step = NonNullable<HomeFocusTask['action']>;

/** What the step needs from the outside; the hook wires the real API, tests pass their own. */
export type StepFlow = {
  run: (step: Step, ref: string) => Promise<unknown>;
  refresh: () => Promise<void>;
};

const DONE: Record<Step, (title: string) => string> = {
  complete: HOME_COPY.focus.completed,
  start: HOME_COPY.focus.started,
};

/** Mutation options of one row: call the step, toast, reload; a task changed by someone else reloads too. */
export function stepOptions(
  task: Pick<HomeFocusTask, 'id' | 'title'>,
  flow: StepFlow,
): MutationOptions<Step, unknown> {
  return {
    mutationFn: (step) => flow.run(step, task.id),
    successMessage: (_data, step) => DONE[step](task.title),
    errorTitle: HOME_COPY.focus.failed,
    onSuccess: flow.refresh,
    // Someone changed the task first: the toast says so, and reloading shows what they did.
    onError: (err) => {
      if (isStaleTaskError(err)) void flow.refresh();
    },
  };
}

/** One hook per row, so only the button that was pressed spins. */
export function useHomeStep(task: Pick<HomeFocusTask, 'id' | 'title'>) {
  const queryClient = useQueryClient();
  return useApiMutation(
    stepOptions(task, {
      run: (step, ref) => (step === 'complete' ? completeTask(ref) : startTask(ref)),
      // A step moves the task out of its group and changes the counters, so both caches reload.
      refresh: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: homeKeys.all }),
          queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        ]);
      },
    }),
  );
}
