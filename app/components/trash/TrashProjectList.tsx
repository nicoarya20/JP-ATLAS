/** Trashed projects (S1-18): a table from `sm` up, cards below it, "Pulihkan" only where the server allows. */
import { Button, Group, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { formatCalendarDate } from '~/components/ui/DateText';
import { EmptyState } from '~/components/ui/EmptyState';
import { type ResponsiveColumn, ResponsiveTable } from '~/components/ui/ResponsiveTable';
import type { TrashProjectItem } from '~/lib/trash-api';
import { RestoreAction, restoreBlockedReason } from './RestoreAction';
import { TRASH_COLUMNS, TRASH_EMPTY_COPY, TRASH_PAGE_COPY, TRASH_ROW_COPY } from './trash.copy';

type RestoreProps = {
  /** Id of the row whose restore is running. */
  restoringId: string | null;
  onRestore: (item: TrashProjectItem) => void;
};

type Props = RestoreProps & {
  items: TrashProjectItem[];
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
  /** Replaces the default "Sampah kosong" state, e.g. when the page also lists tasks. */
  empty?: ReactNode;
};

export { restoreBlockedReason };

const deleterName = (item: TrashProjectItem) =>
  item.deletedBy?.name ?? TRASH_ROW_COPY.unknownDeleter;

/** "Pulihkan": on with `loading` when allowed, off with the reason when refused, absent otherwise. */
export function RestoreButton({
  item,
  restoringId,
  onRestore,
}: RestoreProps & { item: TrashProjectItem }) {
  return (
    <RestoreAction
      cap={item.can.restore}
      ariaLabel={TRASH_ROW_COPY.restoreProject(item.name)}
      loading={restoringId === item.id}
      busyElsewhere={restoringId !== null && restoringId !== item.id}
      onRestore={() => onRestore(item)}
    />
  );
}

function columns(restore: RestoreProps): ResponsiveColumn<TrashProjectItem>[] {
  return [
    {
      key: 'name',
      header: TRASH_COLUMNS.name,
      cell: (r) => (
        <Text fw={500} style={{ overflowWrap: 'anywhere' }}>
          {r.name}
        </Text>
      ),
    },
    { key: 'by', header: TRASH_COLUMNS.deletedBy, cell: deleterName, hideBelow: 'md' },
    {
      key: 'at',
      header: TRASH_COLUMNS.deletedAt,
      cell: (r) => formatCalendarDate(r.deletedAt),
    },
    {
      key: 'until',
      header: TRASH_COLUMNS.until,
      cell: (r) => formatCalendarDate(r.restorableUntil),
    },
    {
      key: 'action',
      header: TRASH_COLUMNS.action,
      align: 'right',
      cell: (r) => <RestoreButton item={r} {...restore} />,
    },
  ];
}

/** Mobile card: name first, who and when dimmed, the restore limit, then the button full width. */
export function TrashCard({ item, ...restore }: RestoreProps & { item: TrashProjectItem }) {
  return (
    <Stack gap="xs">
      <Text fw={600} style={{ overflowWrap: 'anywhere' }}>
        {item.name}
      </Text>
      <Text size="sm" c="dimmed">
        {TRASH_ROW_COPY.deletedBy(deleterName(item), formatCalendarDate(item.deletedAt))}
      </Text>
      <Text size="sm">{TRASH_ROW_COPY.until(formatCalendarDate(item.restorableUntil))}</Text>
      <Group justify="flex-end" wrap="wrap">
        <RestoreButton item={item} {...restore} />
      </Group>
    </Stack>
  );
}

export function TrashProjectList({
  items,
  total,
  hasMore,
  loadingMore,
  onMore,
  empty,
  ...restore
}: Props) {
  return (
    <Stack gap="md">
      <ResponsiveTable
        label={TRASH_PAGE_COPY.tableLabel}
        columns={columns(restore)}
        rows={items}
        getRowKey={(r) => r.id}
        renderCard={(r) => <TrashCard item={r} {...restore} />}
        empty={
          empty ?? (
            <EmptyState
              icon={FiTrash2}
              title={TRASH_EMPTY_COPY.title}
              description={TRASH_EMPTY_COPY.description}
            />
          )
        }
      />
      {items.length > 0 && (
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text size="sm" c="dimmed">
            {TRASH_PAGE_COPY.shown(items.length, total)}
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
