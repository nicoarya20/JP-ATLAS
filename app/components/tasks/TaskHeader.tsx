/**
 * Task detail header (P3 §2 Tugas ⑧⑨): title, #number, project link, kind, status, priority, who
 * works on it, due date and the Terlambat/Mandek/Dibuka lagi labels, then the step buttons and notes.
 * Proof, blocking ("Tertahan"), review and tags are S4-S5 and do not appear here.
 */
import { Anchor, Group, Stack, Text, Title } from '@mantine/core';
import type { IsoDate, TaskLabel } from '@server/metrics/types';
import type { TaskDetail } from '@server/task/task.dto';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PriorityBadge } from '~/components/pm/PriorityBadge';
import { StatusBadge } from '~/components/pm/StatusBadge';
import { TaskLabelChip } from '~/components/pm/TaskLabelChip';
import { WRAP_ANYWHERE } from '~/components/pm/text-wrap';
import { DateText } from '~/components/ui/DateText';
import { TASK_LABEL_PRIORITY } from '~/lib/pm-labels';
import { NextStepBar } from './NextStepBar';
import { TaskMenu } from './TaskMenu';
import { TaskStatusBanner } from './TaskStatusBanner';
import { DETAIL_COPY } from './tasks.copy';

/** Labels S2 shows; "Tertahan" and "Menunggu diperiksa saya" wait for S4 even if the API sends them. */
const HEADER_LABELS: readonly TaskLabel[] = ['overdue', 'stale', 'reopened'];

export type TaskHeaderData = Pick<
  TaskDetail,
  | 'number'
  | 'title'
  | 'status'
  | 'priority'
  | 'dueDate'
  | 'assignee'
  | 'project'
  | 'kind'
  | 'labels'
  | 'cancel'
  | 'primary'
  | 'can'
>;

/** The labels to show, most urgent first. */
export function headerLabels(labels: readonly TaskLabel[]): TaskLabel[] {
  return TASK_LABEL_PRIORITY.filter((l) => HEADER_LABELS.includes(l) && labels.includes(l));
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group gap="xs" wrap="nowrap" miw={0}>
      <Text size="sm" c="dimmed" flex="0 0 auto">
        {`${label}:`}
      </Text>
      {children}
    </Group>
  );
}

type Props = { task: TaskHeaderData; today: IsoDate; afterDelete?: () => void };

export function TaskHeader({ task, today, afterDelete }: Props) {
  const settled = task.status === 'done' || task.status === 'canceled';
  return (
    <Stack gap="sm">
      {/* nowrap is safe: the only button is one 44px icon and the title itself wraps. */}
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Stack gap={4} miw={0}>
          <Text size="sm" c="dimmed">{`#${task.number}`}</Text>
          {/* The page title of a detail page: 32 px like every PageHeader page (K-1), and it
              wraps in full rather than being truncated (K-5). */}
          <Title order={1} style={WRAP_ANYWHERE}>
            {task.title}
          </Title>
        </Stack>
        <TaskMenu task={task} afterDelete={afterDelete} />
      </Group>

      <Group gap="xs" wrap="wrap">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
        {headerLabels(task.labels).map((l) => (
          <TaskLabelChip key={l} label={l} />
        ))}
      </Group>

      <Group gap="lg" wrap="wrap">
        <Fact label={DETAIL_COPY.project}>
          <Anchor
            component={Link}
            to={`/app/projects/${encodeURIComponent(task.project.id)}`}
            size="sm"
            fw={500}
            truncate
          >
            {task.project.name}
          </Anchor>
        </Fact>
        <Fact label={DETAIL_COPY.kind}>
          <Text size="sm">{task.kind.name}</Text>
        </Fact>
        <Fact label={DETAIL_COPY.assignee}>
          <Text size="sm" fw={500} truncate>
            {task.assignee?.name ?? DETAIL_COPY.noAssignee}
          </Text>
        </Fact>
        <Fact label={DETAIL_COPY.due}>
          {task.dueDate ? (
            <DateText value={task.dueDate} mode="due" today={today} settled={settled} />
          ) : (
            <Text size="sm">{DETAIL_COPY.noDue}</Text>
          )}
        </Fact>
      </Group>

      <NextStepBar task={task} />
      <TaskStatusBanner task={task} />
    </Stack>
  );
}
