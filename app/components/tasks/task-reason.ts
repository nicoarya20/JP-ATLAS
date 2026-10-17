/**
 * The two "why?" dialogs of a task (P3 §2 Tugas ⑪): Batalkan (five reasons, "Lainnya" needs a note)
 * and Buka lagi (reason required, the server's 3-200 characters). Both take the mutation to run.
 */
import { REVIEW_NOTE_MAX_LENGTH, REVIEW_NOTE_MIN_LENGTH } from '@server/access/review.policy';
import { TASK_CANCEL_CATEGORIES, type TaskCancelCategory } from '@server/pm/enums';
import { TASK_CANCEL_NOTE_MAX } from '@server/task/task.limits';
import { openReasonModal, type ReasonCategory } from '~/components/ui/ReasonModal';
import { isStaleTaskError } from '~/lib/tasks-api';
import type { MutationResult } from '~/lib/use-api-mutation';
import { CANCEL_CATEGORY_LABELS, REASON_COPY } from './tasks.copy';

const CANCEL_CATEGORIES: ReasonCategory[] = TASK_CANCEL_CATEGORIES.map((value) => ({
  value,
  label: CANCEL_CATEGORY_LABELS[value],
  requireNote: value === 'other',
}));

/**
 * Keeps the dialog open (with the error) on a failure the user can fix, but closes it when someone
 * else changed the task first: the toast says so and the task data reloads by itself.
 */
function settle(res: MutationResult<unknown>) {
  if (!res.ok && !isStaleTaskError(res.error)) throw res.error;
}

export function openCancelTaskModal(
  run: (input: { category: TaskCancelCategory; note?: string }) => Promise<MutationResult<unknown>>,
) {
  return openReasonModal({
    title: REASON_COPY.cancelTitle,
    description: REASON_COPY.cancelDescription,
    categories: CANCEL_CATEGORIES,
    noteRequiredMessage: REASON_COPY.noteRequired,
    noteMaxLength: TASK_CANCEL_NOTE_MAX,
    confirmLabel: REASON_COPY.cancelConfirm,
    danger: true,
    onSubmit: async ({ category, reason }) => {
      const input = {
        category: category as TaskCancelCategory,
        ...(reason ? { note: reason } : {}),
      };
      settle(await run(input));
    },
  });
}

export function openReopenTaskModal(
  run: (input: { reason: string }) => Promise<MutationResult<unknown>>,
) {
  return openReasonModal({
    title: REASON_COPY.reopenTitle,
    description: REASON_COPY.reopenDescription,
    requireNote: true,
    noteRequiredMessage: REASON_COPY.noteRequired,
    noteMinLength: REVIEW_NOTE_MIN_LENGTH,
    noteMaxLength: REVIEW_NOTE_MAX_LENGTH,
    confirmLabel: REASON_COPY.reopenConfirm,
    onSubmit: async ({ reason }) => settle(await run({ reason })),
  });
}
