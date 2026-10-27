/**
 * Mobile card of the "Semua tugas" table (< `sm`): every column stacked, nothing scrolls sideways.
 * Rendered inside the card `Paper` of `ResponsiveTable`; the whole card opens the task.
 */
import { Box, Group, Stack } from '@mantine/core';
import { StatusBadge } from '~/components/pm/StatusBadge';
import type { TaskListItem } from '~/lib/tasks-api';
import { NextStepButton } from './NextStepButton';
import { TaskBadges, TaskFacts, TaskMeta, TaskRowLink, TaskTitle } from './TaskRow';
import { TaskRowMenu } from './TaskRowMenu';

export function TaskCard({ task }: { task: TaskListItem }) {
  return (
    <Box pos="relative">
      <TaskRowLink task={task} />
      <Stack gap="xs">
        <TaskTitle task={task} />
        <TaskMeta task={task} />
        <Group gap="xs" wrap="wrap">
          <StatusBadge status={task.status} />
          <TaskBadges task={task} />
        </Group>
        <TaskFacts task={task} />
        <Group gap="xs" wrap="nowrap" align="center">
          {/* Mantine has no `z-index` style prop; 1 lifts the button above the card's cover link. */}
          <Box pos="relative" flex={1} miw={0} style={{ zIndex: 1 }}>
            <NextStepButton taskRef={String(task.number)} primary={task.primary} fullWidth />
          </Box>
          <TaskRowMenu task={task} />
        </Group>
      </Stack>
    </Box>
  );
}
