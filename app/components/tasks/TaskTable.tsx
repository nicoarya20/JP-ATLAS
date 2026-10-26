/**
 * "Semua tugas" table (P3 §2 Tugas ②): five columns from `sm` up — Tugas · Status+langkah ·
 * Mengerjakan · Tenggat · Prioritas (K15) — and a card per task below it. The number and the
 * phase ride under the title instead of taking columns of their own (H-C12). No kind, tag or CSV.
 */
import { Button, Group, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { StatusBadge } from '~/components/pm/StatusBadge';
import { DateText } from '~/components/ui/DateText';
import { type ResponsiveColumn, ResponsiveTable } from '~/components/ui/ResponsiveTable';
import type { TaskListItem } from '~/lib/tasks-api';
import { NextStepButton } from './NextStepButton';
import { TaskCard } from './TaskCard';
import { TaskBadges, TaskMeta, TaskTitle } from './TaskRow';
import { TaskRowMenu } from './TaskRowMenu';
import { LIST_COPY } from './tasks.copy';

export const TASK_COLUMNS: ResponsiveColumn<TaskListItem>[] = [
  {
    key: 'task',
    header: LIST_COPY.colTask,
    cell: (t) => (
      <Group gap="xs" wrap="nowrap" justify="space-between">
        <Stack gap={4} style={{ minWidth: 0 }}>
          <TaskTitle task={t} />
          <TaskMeta task={t} />
          <Text size="sm" c="dimmed" truncate>
            {t.project.name}
          </Text>
        </Stack>
        <TaskRowMenu task={t} />
      </Group>
    ),
  },
  {
    key: 'status',
    header: LIST_COPY.colStatus,
    cell: (t) => (
      <Group gap="xs" wrap="wrap">
        <StatusBadge status={t.status} />
        <NextStepButton taskRef={String(t.number)} primary={t.primary} />
      </Group>
    ),
  },
  {
    key: 'assignee',
    header: LIST_COPY.colAssignee,
    cell: (t) => <Text size="sm">{t.assignee?.name ?? LIST_COPY.noAssignee}</Text>,
  },
  {
    key: 'due',
    header: LIST_COPY.colDue,
    cell: (t) =>
      t.dueDate ? (
        <DateText
          value={t.dueDate}
          mode="due"
          settled={t.status === 'done' || t.status === 'canceled'}
        />
      ) : (
        <Text size="sm">{LIST_COPY.noDue}</Text>
      ),
  },
  {
    key: 'priority',
    header: LIST_COPY.colPriority,
    // Labels (Terlambat, Mandek, Dibuka lagi) ride with the priority so the table keeps five columns.
    cell: (t) => <TaskBadges task={t} />,
  },
];

type Props = {
  rows: TaskListItem[];
  /** Shown instead of the table when `rows` is empty. */
  empty: ReactNode;
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
};

export function TaskTable({ rows, empty, hasMore, loadingMore, onMore }: Props) {
  return (
    <Stack gap="sm">
      <ResponsiveTable
        columns={TASK_COLUMNS}
        rows={rows}
        getRowKey={(t) => t.id}
        renderCard={(t) => <TaskCard task={t} />}
        empty={empty}
        label={LIST_COPY.tableLabel}
      />
      {hasMore && (
        <Button variant="subtle" loading={loadingMore} onClick={onMore}>
          {LIST_COPY.showMore}
        </Button>
      )}
    </Stack>
  );
}
