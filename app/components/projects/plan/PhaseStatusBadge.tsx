import { Badge } from '@mantine/core';
import type { PhaseStatus } from '@server/pm/enums';
import type { IconType } from 'react-icons';
import { FiCheckCircle, FiCircle, FiPlayCircle } from 'react-icons/fi';
import { PHASE_STATUS_LABELS } from './plan.copy';

const STATUS_STYLE: Record<PhaseStatus, { icon: IconType; color: string }> = {
  not_started: { icon: FiCircle, color: 'gray' },
  in_progress: { icon: FiPlayCircle, color: 'blue' },
  done: { icon: FiCheckCircle, color: 'ok' },
};

/** Phase status as icon plus words; colour alone never carries it (WCAG 1.4.1). */
export function PhaseStatusBadge({ status }: { status: PhaseStatus }) {
  const { icon: Icon, color } = STATUS_STYLE[status];
  return (
    <Badge variant="light" color={color} leftSection={<Icon size="1.25em" aria-hidden />}>
      {PHASE_STATUS_LABELS[status]}
    </Badge>
  );
}
