/** Trashed tasks (S6 D1): a table from `sm` up, cards below it, "Pulihkan" only where the server allows. */
import { Badge, Button, Group, Stack, Text } from '@mantine/core';
import { FiTrash2 } from 'react-icons/fi';
import { formatCalendarDate } from '~/components/ui/DateText';
import { EmptyState } from '~/components/ui/EmptyState';
import { type ResponsiveColumn, ResponsiveTable } from '~/components/ui/ResponsiveTable';
import type { TrashTaskItem } from '~/lib/trash-api';
import { RestoreAction } from './RestoreAction';
import { TRASH_COLUMNS, TRASH_COPY, TRASH_PAGE_COPY, TRASH_ROW_COPY } from './trash.copy';

type RestoreProps = {
  /** Id of the task whose restore is running. */
  restoringId: string | null;
  onRestore: (item: TrashTaskItem) => void;
};

type Props = RestoreProps & {
  items: TrashTaskItem[];
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
};

const deleterName = (item: TrashTaskItem) => item.deletedBy?.name ?? TRASH_ROW_COPY.unknownDeleter;

/** "Pulihkan" of a task: off with "Pulihkan proyeknya dulu" while its project is in the Trash. */
export function RestoreTaskButton({
  item,
  restoringId,
  onRestore,
}: RestoreProps & { item: TrashTaskItem }) {
  return (
    <RestoreAction
      cap={item.can.restore}
      ariaLabel={TRASH_COPY.restoreTask(item.number, item.title)}
      loading={restoringId === item.id}
      busyElsewhere={restoringId !== null && restoringId !== item.id}
      onRestore={() => onRestore(item)}
    />
  );
}

/** Title with "#number · project"; a task whose project is in the Trash says what to restore first. */
function TaskCell({ item }: { item: TrashTaskItem }) {
  return (
    <Stack gap={2} style={{ minWidth: 0 }}>
      <Text fw={500} style={{ overflowWrap: 'anywhere' }}>
        {item.title}
      </Text>
      <Text size="sm" c="dimmed" style={{ overflowWrap: 'anywhere' }}>
        {TRASH_COPY.taskRef(item.number, item.project.name)}
      </Text>
      {item.blockedBy && (
        <Badge variant="light" color="warn" size="sm" style={{ alignSelf: 'flex-start' }}>
          {TRASH_COPY.blocked}
        </Badge>
      )}
    </Stack>
  );
}

function columns(restore: RestoreProps): ResponsiveColumn<TrashTaskItem>[] {
  return [
    { key: 'task', header: TRASH_COPY.columnTask, cell: (r) => <TaskCell item={r} /> },
    { key: 'by', header: TRASH_COLUMNS.deletedBy, cell: deleterName, hideBelow: 'md' },
    { key: 'at', header: TRASH_COLUMNS.deletedAt, cell: (r) => formatCalendarDate(r.deletedAt) },
    {
      key: 'until',
      header: TRASH_COLUMNS.until,
      cell: (r) => formatCalendarDate(r.restorableUntil),
    },
    {
      key: 'action',
      header: TRASH_COLUMNS.action,
      align: 'right',
      cell: (r) => <RestoreTaskButton item={r} {...restore} />,
    },
  ];
}

/** Mobile card: title first, who and when dimmed, the restore limit, then the button. */
export function TrashTaskCard({ item, ...restore }: RestoreProps & { item: TrashTaskItem }) {
  return (
    <Stack gap="xs">
      <TaskCell item={item} />
      <Text size="sm" c="dimmed">
        {TRASH_ROW_COPY.deletedBy(deleterName(item), formatCalendarDate(item.deletedAt))}
      </Text>
      <Text size="sm">{TRASH_ROW_COPY.until(formatCalendarDate(item.restorableUntil))}</Text>
      <Group justify="flex-end" wrap="wrap">
        <RestoreTaskButton item={item} {...restore} />
      </Group>
    </Stack>
  );
}

export function TrashTaskList({ items, total, hasMore, loadingMore, onMore, ...restore }: Props) {
  return (
    <Stack gap="md">
      <ResponsiveTable
        label={TRASH_COPY.tasksTableLabel}
        columns={columns(restore)}
        rows={items}
        getRowKey={(r) => r.id}
        renderCard={(r) => <TrashTaskCard item={r} {...restore} />}
        empty={
          <EmptyState
            icon={FiTrash2}
            title={TRASH_COPY.noTasks.title}
            description={TRASH_COPY.noTasks.description}
          />
        }
      />
      {items.length > 0 && (
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text size="sm" c="dimmed">
            {TRASH_COPY.shownTasks(items.length, total)}
          </Text>
          {hasMore && (
            <Button variant="default" loading={loadingMore} onClick={onMore}>
              {TRASH_PAGE_COPY.more}
            </Button>
          )}
        </Group>
      )}
    </Stack>
  );
}
