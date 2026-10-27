/**
 * One task in the "Tugas saya" groups, plus the parts `TaskCard` reuses. The whole row opens the
 * task (`/app/tasks/:number`) through a covering link, so the next-step button stays a real button
 * instead of an interactive element nested inside a link.
 */
import { Anchor, Badge, Box, Group, Paper, Stack, Text } from '@mantine/core';
import type { TaskLabel } from '@server/metrics/types';
import { FiLayers } from 'react-icons/fi';
import { Link } from 'react-router';
import { PriorityBadge } from '~/components/pm/PriorityBadge';
import { TaskLabelChip } from '~/components/pm/TaskLabelChip';
import { DateText } from '~/components/ui/DateText';
import { TASK_LABEL_PRIORITY } from '~/lib/pm-labels';
import type { TaskListItem } from '~/lib/tasks-api';
import { NextStepButton } from './NextStepButton';
import { TaskRowMenu } from './TaskRowMenu';
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
      // Mantine has no `z-index` style prop; 0 keeps the cover link under the row's own controls.
      style={{ zIndex: 0 }}
      data-row-link
    />
  );
}

/** Task title as a link; truncated on one line, which needs `miw={0}` inside a flex row. */
export function TaskTitle({ task }: { task: TaskListItem }) {
  return (
    <Anchor
      component={Link}
      to={taskPath(task)}
      fw={600}
      c="inherit"
      truncate
      pos="relative"
      miw={0}
      display="block"
      // Mantine has no `z-index` style prop; 1 lifts the title above the row's cover link.
      style={{ zIndex: 1 }}
    >
      {task.title}
    </Anchor>
  );
}

// A long phase name is cut with an ellipsis instead of pushing the row sideways on a phone.
const PHASE_MAX_WIDTH = 160;

/**
 * The small line under the title: the task number people read aloud ("tolong cek tugas 42",
 * searchable as `#42`) and, when the task sits in one, the phase of its project (H-C12, H-B5).
 * A task without a phase shows the number alone, never a placeholder.
 */
export function TaskMeta({ task }: { task: TaskListItem }) {
  return (
    <Group gap="xs" wrap="wrap" miw={0}>
      <Text size="xs" c="dimmed">
        {LIST_COPY.taskNumber(task.number)}
      </Text>
      {task.phase && (
        <Badge
          variant="light"
          color="gray"
          size="sm"
          // Phase names are ordinary words ("Persiapan"), so no forced uppercase.
          tt="none"
          maw={PHASE_MAX_WIDTH}
          leftSection={<FiLayers size="1.25em" aria-hidden />}
          aria-label={LIST_COPY.inPhase(task.phase.name)}
        >
          {task.phase.name}
        </Badge>
      )}
    </Group>
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
    <Group gap="xs" wrap="wrap" c="dimmed" miw={0}>
      <Text size="sm" truncate miw={0}>
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
    <Paper withBorder p="sm" pos="relative" role="listitem">
      <TaskRowLink task={task} />
      <Group justify="space-between" align="center" wrap="wrap" gap="xs">
        <Stack gap={4} miw={0} flex={1}>
          <TaskTitle task={task} />
          <TaskMeta task={task} />
          <TaskBadges task={task} />
          <TaskFacts task={task} withAssignee={false} />
        </Stack>
        <Group gap="xs" wrap="nowrap">
          {/* Mantine has no `z-index` style prop; 1 lifts the button above the row's cover link. */}
          <Box pos="relative" style={{ zIndex: 1 }}>
            <NextStepButton taskRef={String(task.number)} primary={task.primary} />
          </Box>
          <TaskRowMenu task={task} />
        </Group>
      </Group>
    </Paper>
  );
}
