/**
 * The task list shared by the Tugas page (S2-10) and the Tugas tab of a project (S2-14). "Tugas saya"
 * with open tasks shows schedule groups; every other view is a table of at most five columns from
 * `sm` up (K15) and cards below it. `lockedProjectId` pins the list to one project.
 */
import { Alert, Button, Center, Group, Loader, Stack, Text } from '@mantine/core';
import { StatusBadge } from '~/components/pm/StatusBadge';
import { DateText } from '~/components/ui/DateText';
import { type ResponsiveColumn, ResponsiveTable } from '~/components/ui/ResponsiveTable';
import { type TaskListItem, taskErrorMessage, useTaskCounts, useTaskList } from '~/lib/tasks-api';
import { hasTaskFilters, isGroupedView, type TaskFilters, toTaskQuery } from '~/lib/tasks-filters';
import { NextStepButton } from './NextStepButton';
import { TaskCard } from './TaskCard';
import { TaskEmpty, type TaskEmptyVariant } from './TaskEmpty';
import { TaskGroupList } from './TaskGroupList';
import { TaskBadges, TaskTitle } from './TaskRow';
import { LIST_COPY } from './tasks.copy';

const COLUMNS: ResponsiveColumn<TaskListItem>[] = [
  {
    key: 'task',
    header: LIST_COPY.colTask,
    cell: (t) => (
      <Stack gap={4} style={{ minWidth: 0 }}>
        <TaskTitle task={t} />
        <Text size="sm" c="dimmed" truncate>
          {t.project.name}
        </Text>
      </Stack>
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
  filters: TaskFilters;
  /** The signed-in user, for `orang=saya`. */
  viewerId: string;
  /** Project tab: only this project's tasks, whatever the URL says. */
  lockedProjectId?: string;
  onResetFilters: () => void;
  /** Task form link when the server allows creating (`caps.createTask`); null hides the button. */
  createTo?: string | null;
};

function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Alert color="danger" title={LIST_COPY.loadFailed}>
      <Stack gap="xs" align="flex-start">
        <Text size="sm">{taskErrorMessage(error)}</Text>
        <Button variant="light" onClick={onRetry}>
          {LIST_COPY.retry}
        </Button>
      </Stack>
    </Alert>
  );
}

const Loading = () => (
  <Center py="xl">
    <Loader />
  </Center>
);

export function TaskListView({
  filters,
  viewerId,
  lockedProjectId,
  onResetFilters,
  createTo,
}: Props) {
  const scope = { lockedProjectId };
  const query = toTaskQuery(filters, { viewerId, lockedProjectId });
  const grouped = isGroupedView(filters, scope);
  const filtered = hasTaskFilters(filters, scope);
  const counts = useTaskCounts({ enabled: grouped });
  const list = useTaskList(query, { enabled: !grouped });

  const variant: TaskEmptyVariant = lockedProjectId
    ? 'project'
    : filters.lingkup === 'saya'
      ? 'mine'
      : 'all';
  const empty = (
    <TaskEmpty
      variant={variant}
      filtered={filtered}
      onResetFilters={onResetFilters}
      createTo={createTo}
    />
  );

  if (grouped) {
    if (counts.isError)
      return <LoadError error={counts.error} onRetry={() => void counts.refetch()} />;
    if (!counts.data) return <Loading />;
    return (
      <TaskGroupList
        key={JSON.stringify(query)}
        query={query}
        counts={counts.data.mine}
        filtered={filtered}
        empty={empty}
      />
    );
  }

  if (list.isError && !list.data) {
    return <LoadError error={list.error} onRetry={() => void list.refetch()} />;
  }
  if (!list.data) return <Loading />;
  const rows = list.data.pages.flatMap((p) => p.items);
  return (
    <Stack gap="sm">
      <ResponsiveTable
        columns={COLUMNS}
        rows={rows}
        getRowKey={(t) => t.id}
        renderCard={(t) => <TaskCard task={t} />}
        empty={empty}
        label={LIST_COPY.tableLabel}
      />
      {list.hasNextPage && (
        <Button
          variant="subtle"
          loading={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {LIST_COPY.showMore}
        </Button>
      )}
    </Stack>
  );
}
