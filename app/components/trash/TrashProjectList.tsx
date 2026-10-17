/** Trashed projects (S1-18): a table from `sm` up, cards below it, "Pulihkan" only where the server allows. */
import { Button, Group, Stack, Text, Tooltip } from '@mantine/core';
import type { CapValue } from '@server/access/capabilities';
import { DENY_UI } from '@server/access/decision';
import { FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import { formatCalendarDate } from '~/components/ui/DateText';
import { EmptyState } from '~/components/ui/EmptyState';
import { type ResponsiveColumn, ResponsiveTable } from '~/components/ui/ResponsiveTable';
import type { TrashProjectItem } from '~/lib/trash-api';
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
};

/** Why "Pulihkan" is off (expired, impersonating), or null when it is on or hidden. */
export function restoreBlockedReason(cap: CapValue | undefined): string | null {
  if (cap === undefined || cap === true) return null;
  return cap in DENY_UI ? DENY_UI[cap as keyof typeof DENY_UI].message : null;
}

const deleterName = (item: TrashProjectItem) =>
  item.deletedBy?.name ?? TRASH_ROW_COPY.unknownDeleter;

/** "Pulihkan": on with `loading` when allowed, off with the reason when refused, absent otherwise. */
export function RestoreButton({
  item,
  restoringId,
  onRestore,
}: RestoreProps & { item: TrashProjectItem }) {
  const cap = item.can.restore;
  if (cap === undefined) return null;
  const reason = restoreBlockedReason(cap);
  const button = (
    <Button
      variant="light"
      leftSection={<FiRotateCcw size="1.25em" aria-hidden />}
      aria-label={TRASH_ROW_COPY.restoreProject(item.name)}
      loading={restoringId === item.id}
      disabled={reason !== null || (restoringId !== null && restoringId !== item.id)}
      onClick={() => onRestore(item)}
    >
      {TRASH_ROW_COPY.restore}
    </Button>
  );
  if (!reason) return button;
  return (
    <Tooltip label={reason} multiline maw={280}>
      {/* A disabled button fires no pointer events; the span carries the tooltip. */}
      <span>{button}</span>
    </Tooltip>
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
          <EmptyState
            icon={FiTrash2}
            title={TRASH_EMPTY_COPY.title}
            description={TRASH_EMPTY_COPY.description}
          />
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
