/** The list under the Trash tabs: the summary line, one card per item, the empty state of the tab and "Tampilkan lebih banyak". */
import { Alert, Button, Group, Skeleton, Stack, Text } from '@mantine/core';
import { FiAlertCircle, FiTrash2 } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import type { TrashItem, TrashTab } from '~/lib/trash-api';
import { itemKey } from '~/lib/trash-view';
import { TrashItemCard } from './TrashItemCard';
import { TRASH_EMPTY_COPY, TRASH_PAGE_COPY } from './trash.copy';

type Props = {
  tab: TrashTab;
  items: TrashItem[];
  /** Items on this tab (the server's count, not how many pages are loaded). */
  total: number;
  /** The first page of this tab is still loading. */
  loading: boolean;
  /** Message of a failed load; null when it went well. */
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
  restoringKey: string | null;
  highlightKey: string | null;
  onRestore: (item: TrashItem) => void;
  onViewProject: (projectId: string) => void;
};

const PLACEHOLDER_KEYS = ['first', 'second', 'third'] as const;

export function TrashList(props: Props) {
  const { tab, items, total, loading, error, hasMore, loadingMore, onMore } = props;
  if (error) {
    return (
      <Alert
        color="red"
        variant="light"
        title={TRASH_PAGE_COPY.loadFailed}
        icon={<FiAlertCircle size="1.25em" aria-hidden />}
      >
        {error}
      </Alert>
    );
  }
  if (loading) {
    return (
      <Stack gap="sm" aria-busy="true">
        {PLACEHOLDER_KEYS.map((key) => (
          <Skeleton key={key} height={72} radius="md" />
        ))}
      </Stack>
    );
  }
  if (items.length === 0) {
    const copy = TRASH_EMPTY_COPY[tab];
    return <EmptyState icon={FiTrash2} title={copy.title} description={copy.description} />;
  }
  return (
    <Stack gap="sm">
      <Text size="sm" fw={700}>
        {TRASH_PAGE_COPY.summary(total)}
      </Text>
      {items.map((item) => {
        const key = itemKey(item);
        return (
          <TrashItemCard
            key={key}
            item={item}
            restoring={props.restoringKey === key}
            busyElsewhere={props.restoringKey !== null && props.restoringKey !== key}
            highlighted={props.highlightKey === key}
            onRestore={props.onRestore}
            onViewProject={props.onViewProject}
          />
        );
      })}
      {hasMore && (
        <Group justify="center">
          <Button variant="default" loading={loadingMore} onClick={onMore}>
            {TRASH_PAGE_COPY.more}
          </Button>
        </Group>
      )}
    </Stack>
  );
}
