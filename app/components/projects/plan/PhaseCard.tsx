/** One phase of the plan: name, status, dates, task progress and, for managers, move/edit/remove. */
import { ActionIcon, Button, Group, Paper, Stack, Text } from '@mantine/core';
import type { PhaseDto } from '@server/project/project-plan.dto';
import { FiArrowDown, FiArrowUp, FiCalendar, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { ProgressBar } from '~/components/pm/ProgressBar';
import { PhaseStatusBadge } from './PhaseStatusBadge';
import { PLAN_COPY } from './plan.copy';
import { describeRange, type MoveDirection, type PlanBusy } from './plan-view';

export type PhaseHandlers = {
  onMove: (phase: PhaseDto, direction: MoveDirection) => void;
  onEdit: (phase: PhaseDto) => void;
  onRemove: (phase: PhaseDto) => void;
};

type Props = PhaseHandlers & {
  phase: PhaseDto;
  /** 0-based place in the list. */
  index: number;
  total: number;
  canManage: boolean;
  busy: PlanBusy;
};

/** Label of a move button; when it cannot move, the reason is part of the name a screen reader hears. */
function moveLabel(name: string, direction: MoveDirection, atEnd: boolean): string {
  const base = direction === 'up' ? PLAN_COPY.moveUpOf(name) : PLAN_COPY.moveDownOf(name);
  if (!atEnd) return base;
  return `${base} (${direction === 'up' ? PLAN_COPY.atTop : PLAN_COPY.atBottom})`;
}

export function PhaseCard({
  phase,
  index,
  total,
  canManage,
  busy,
  onMove,
  onEdit,
  onRemove,
}: Props) {
  const mine = busy?.id === phase.id ? busy.action : null;
  // One reorder at a time: each one saves the whole order, so two in flight would overwrite each other.
  const reordering = busy?.action === 'move';
  const move = (direction: MoveDirection, atEnd: boolean, Icon: typeof FiArrowUp) => (
    <ActionIcon
      variant="default"
      aria-label={moveLabel(phase.name, direction, atEnd)}
      title={direction === 'up' ? PLAN_COPY.moveUp : PLAN_COPY.moveDown}
      disabled={atEnd || reordering}
      loading={mine === 'move'}
      onClick={() => onMove(phase, direction)}
    >
      <Icon size="1.25em" aria-hidden />
    </ActionIcon>
  );

  return (
    <Paper component="li" withBorder p="md" radius="md" data-phase={phase.id}>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
            <Group gap="xs" wrap="wrap">
              <Text fw={600} style={{ overflowWrap: 'anywhere' }}>
                {phase.name}
              </Text>
              <PhaseStatusBadge status={phase.status} />
            </Group>
            <Text size="xs" c="dimmed">
              {PLAN_COPY.position(index + 1, total)}
            </Text>
            <Group gap={6} wrap="wrap" c="dimmed">
              <FiCalendar size="1.25em" aria-hidden />
              <Text size="sm">{describeRange(phase.startDate, phase.endDate)}</Text>
            </Group>
            {phase.description && (
              <Text size="sm" style={{ overflowWrap: 'anywhere' }}>
                {phase.description}
              </Text>
            )}
          </Stack>
          {canManage && (
            <Group gap="xs" wrap="wrap">
              {move('up', index === 0, FiArrowUp)}
              {move('down', index === total - 1, FiArrowDown)}
            </Group>
          )}
        </Group>
        <ProgressBar done={phase.doneCount} total={phase.taskCount} />
        {canManage && (
          <Group gap="xs" wrap="wrap">
            <Button
              variant="default"
              leftSection={<FiEdit2 size="1.25em" aria-hidden />}
              aria-label={PLAN_COPY.editOf(phase.name)}
              onClick={() => onEdit(phase)}
            >
              {PLAN_COPY.edit}
            </Button>
            <Button
              variant="light"
              color="danger"
              leftSection={<FiTrash2 size="1.25em" aria-hidden />}
              aria-label={PLAN_COPY.removeOf(phase.name)}
              loading={mine === 'remove'}
              onClick={() => onRemove(phase)}
            >
              {PLAN_COPY.remove}
            </Button>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
