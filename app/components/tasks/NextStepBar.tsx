/**
 * The step buttons of a task detail (P3 §2 Tugas ⑧⑨): the main button from the server's `primary`
 * (Mulai kerjakan / Tandai selesai), "Tandai selesai" straight from Belum dikerjakan when `can`
 * allows it (T-A4), Buka lagi on a finished task and Pulihkan on a canceled one. No role checks:
 * everything shown here comes from `primary` and `can{}`.
 */
import { Button, Group, Text } from '@mantine/core';
import type { TaskDetail } from '@server/task/task.dto';
import { FiCheck, FiPlay, FiRotateCcw, FiRotateCw } from 'react-icons/fi';
import { isNextStep } from '~/lib/tasks-api';
import { capReason, isShown } from './task-caps';
import { openReopenTaskModal } from './task-reason';
import { DETAIL_COPY, NEXT_STEP_LABELS } from './tasks.copy';
import { useNextStep, useTaskActions } from './useTaskActions';

export type NextStepTask = Pick<TaskDetail, 'number' | 'status' | 'primary' | 'can'>;

const ICONS = { start: FiPlay, complete: FiCheck } as const;

export function NextStepBar({ task }: { task: NextStepTask }) {
  const ref = String(task.number);
  const { nextStep, reopen, uncancel } = useTaskActions();
  // A second hook so only the button that was pressed spins.
  const directComplete = useNextStep();
  const primary = isNextStep(task.primary) ? task.primary : null;
  // T-A4: a task may be marked done without being started first.
  const showDirectComplete = primary === 'start' && task.can.complete === true;
  const showReopen = task.status === 'done' && isShown(task.can.reopen);
  const showUncancel = task.status === 'canceled' && isShown(task.can.uncancel);
  const statusCap = showReopen ? task.can.reopen : showUncancel ? task.can.uncancel : undefined;
  const blocked = capReason(statusCap);
  if (!primary && !showReopen && !showUncancel) return null;
  const PrimaryIcon = primary ? ICONS[primary] : null;
  const openReopen = () => openReopenTaskModal((input) => reopen.run({ ref, input }));

  return (
    <Group gap="xs" wrap="wrap">
      {primary && PrimaryIcon && (
        <Button
          leftSection={<PrimaryIcon size="1.25em" aria-hidden />}
          loading={nextStep.loading}
          onClick={() => void nextStep.run({ ref, action: primary })}
        >
          {NEXT_STEP_LABELS[primary]}
        </Button>
      )}
      {showDirectComplete && (
        <Button
          variant="default"
          leftSection={<FiCheck size="1.25em" aria-hidden />}
          loading={directComplete.loading}
          onClick={() => void directComplete.run({ ref, action: 'complete' })}
        >
          {NEXT_STEP_LABELS.complete}
        </Button>
      )}
      {showReopen && (
        <Button
          leftSection={<FiRotateCcw size="1.25em" aria-hidden />}
          disabled={task.can.reopen !== true}
          loading={reopen.loading}
          onClick={openReopen}
        >
          {DETAIL_COPY.reopen}
        </Button>
      )}
      {showUncancel && (
        <Button
          leftSection={<FiRotateCw size="1.25em" aria-hidden />}
          disabled={task.can.uncancel !== true}
          loading={uncancel.loading}
          onClick={() => void uncancel.run({ ref })}
        >
          {DETAIL_COPY.uncancel}
        </Button>
      )}
      {blocked && (
        <Text size="sm" c="dimmed">
          {blocked}
        </Text>
      )}
    </Group>
  );
}
