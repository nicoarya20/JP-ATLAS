/**
 * The one next-step button of a task row: "Mulai kerjakan" or "Tandai selesai" (P3 §2 Tugas ①).
 * It reads `primary` from the server and renders nothing for any other step, so review steps
 * (S4), reopen and restore never appear in a list even when the API sends them.
 */
import { Button } from '@mantine/core';
import type { PrimaryAction } from '@server/access/task-flow.policy';
import type { MouseEvent } from 'react';
import { FiCheck, FiPlay } from 'react-icons/fi';
import { isNextStep } from '~/lib/tasks-api';
import { NEXT_STEP_LABELS } from './tasks.copy';
import { useNextStep } from './useTaskActions';

const ICONS = { start: FiPlay, complete: FiCheck } as const;

type Props = {
  /** Task number or id, as `/tasks/:ref` takes it. */
  taskRef: string;
  primary: PrimaryAction | null;
  /** Narrow rows (cards) stretch the button to the full width. */
  fullWidth?: boolean;
};

export function NextStepButton({ taskRef, primary, fullWidth }: Props) {
  const step = useNextStep();
  if (!isNextStep(primary)) return null;
  const Icon = ICONS[primary];
  const run = (e: MouseEvent) => {
    // The row around the button opens the task; the button only takes the step.
    e.stopPropagation();
    void step.run({ ref: taskRef, action: primary });
  };
  return (
    <Button
      // K1: one filled button per screen; a step repeated on every row stays light.
      variant="light"
      leftSection={<Icon size="1.25em" aria-hidden />}
      loading={step.loading}
      onClick={run}
      fullWidth={fullWidth}
      flex="0 0 auto"
    >
      {NEXT_STEP_LABELS[primary]}
    </Button>
  );
}
