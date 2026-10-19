/**
 * One task in the "Tugas saya" groups, plus the parts `TaskCard` reuses. The whole row opens the
 * task (`/app/tasks/:number`) through a covering link, so the next-step button stays a real button
 * instead of an interactive element nested inside a link.
 */
import { Anchor, Box, Group, Paper, Stack, Text } from '@mantine/core';
import type { TaskLabel } from '@server/metrics/types';
import { Link } from 'react-router';
import { PriorityBadge } from '~/components/pm/PriorityBadge';
import { TaskLabelChip } from '~/components/pm/TaskLabelChip';
import { DateText } from '~/components/ui/DateText';
import { TASK_LABEL_PRIORITY } from '~/lib/pm-labels';
import type { TaskListItem } from '~/lib/tasks-api';
import { NextStepButton } from './NextStepButton';
import { LIST_COPY } from './tasks.copy';

/** Detail page of a task; the number is the handle people read aloud (M16). */
export const taskPath = (task: Pick<TaskListItem, 'number'>) => `/app/tasks/${task.number}`;

// "Tertahan" and "Menunggu diperiksa saya" come with dependencies and review (S4); a row shows these three.
const ROW_LABELS: readonly TaskLabel[] = ['overdue', 'stale', 'reopened'];

const isSettled = (task: TaskListItem) => task.status === 'done' || task.status === 'canceled';

/** Transparent link over the whole row; mouse and touch hit it, keyboards use the title link. */
export function TaskRowLink({ task }: { task: TaskListItem }) {
  return (
    <Box
      component={Link}
      to={taskPath(task)}
      aria-hidden
      tabIndex={-1}
      pos="absolute"
      inset={0}
      style={{ zIndex: 0 }}
      data-row-link
    />
  );
}

/** Task title as a link; truncated on one line, which needs `minWidth: 0` inside a flex row. */
export function TaskTitle({ task }: { task: TaskListItem }) {
  return (
    <Anchor
      component={Link}
      to={taskPath(task)}
      fw={600}
      c="inherit"
      truncate
      pos="relative"
      style={{ minWidth: 0, zIndex: 1, display: 'block' }}
    >
      {task.title}
    </Anchor>
  );
}

/**
 * Priority and the one label of the row, icon plus text (WCAG 1.4.1). A task that is late and stale
 * and reopened shows only the most urgent (03-tugas §4.3); the detail page lists them all.
 */
export function TaskBadges({ task }: { task: TaskListItem }) {
  const label = TASK_LABEL_PRIORITY.find((l) => ROW_LABELS.includes(l) && task.labels.includes(l));
  return (
    <Group gap="xs" wrap="wrap">
      <PriorityBadge priority={task.priority} />
      {label && <TaskLabelChip label={label} />}
    </Group>
  );
}

/** Project, the person doing it and the due date, dimmed under the title. */
export function TaskFacts({
  task,
  withAssignee = true,
}: {
  task: TaskListItem;
  withAssignee?: boolean;
}) {
  return (
    <Group gap="xs" wrap="wrap" c="dimmed" style={{ minWidth: 0 }}>
      <Text size="sm" truncate style={{ minWidth: 0 }}>
        {task.project.name}
        {withAssignee && ` · ${task.assignee?.name ?? LIST_COPY.noAssignee}`}
      </Text>
      {task.dueDate ? (
        <DateText value={task.dueDate} mode="due" settled={isSettled(task)} />
      ) : (
        <Text size="sm">{LIST_COPY.noDue}</Text>
      )}
    </Group>
  );
}

/** Grouped-list row: facts on the left, the one next step on the right; wraps on narrow screens. */
export function TaskRow({ task }: { task: TaskListItem }) {
  return (
    <Paper withBorder p="sm" radius="md" pos="relative" role="listitem">
      <TaskRowLink task={task} />
      <Group justify="space-between" align="center" wrap="wrap" gap="xs">
        <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
          <TaskTitle task={task} />
          <TaskBadges task={task} />
          <TaskFacts task={task} withAssignee={false} />
        </Stack>
        <Box pos="relative" style={{ zIndex: 1 }}>
          <NextStepButton taskRef={String(task.number)} primary={task.primary} />
        </Box>
      </Group>
    </Paper>
  );
}
