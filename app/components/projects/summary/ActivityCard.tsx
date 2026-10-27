/** "Aktivitas terakhir" card: who did what, newest first, with a keyset "Muat lebih banyak". */
import { Box, Button, Group, Paper, Stack, Text } from '@mantine/core';
import type { ActivityItemDto } from '@server/project/project-activity.dto';
import { FiActivity } from 'react-icons/fi';
import { DateText } from '~/components/ui/DateText';
import { EmptyState } from '~/components/ui/EmptyState';
import { MemberAvatar } from '~/components/ui/MemberAvatar';
import type { ActivityPage } from '~/lib/project-deadline-api';
import { ACTIVITY_COPY } from './summary.copy';
import { useProjectActivity } from './useProjectActivity';

export function ActivityRow({ item }: { item: ActivityItemDto }) {
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start" role="listitem" miw={0}>
      <MemberAvatar name={item.actorName ?? ACTIVITY_COPY.unknownActor} />
      {/* Clamped, not wrapped: every row in the feed keeps the same height (K-5). */}
      <Text size="sm" miw={0} flex={1} lineClamp={2}>
        {item.text}
      </Text>
      <Box flex="0 0 auto">
        <DateText value={item.createdAt} mode="date" />
      </Box>
    </Group>
  );
}

type ListProps = {
  items: readonly ActivityItemDto[];
  hasMore: boolean;
  loadingMore: boolean;
  failed: boolean;
  onMore: () => void;
};

/** The card body without the query, so tests can render every state. */
export function ActivityList({ items, hasMore, loadingMore, failed, onMore }: ListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={FiActivity}
        title={ACTIVITY_COPY.empty}
        description={ACTIVITY_COPY.emptyHint}
      />
    );
  }
  return (
    <Stack gap="sm">
      <Stack gap="sm" role="list">
        {items.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </Stack>
      {failed && (
        <Text size="sm" c="danger">
          {ACTIVITY_COPY.failed}
        </Text>
      )}
      {(hasMore || failed) && (
        <Button variant="default" onClick={onMore} loading={loadingMore}>
          {failed ? ACTIVITY_COPY.retry : ACTIVITY_COPY.more}
        </Button>
      )}
    </Stack>
  );
}

export function ActivityCard({ projectId, first }: { projectId: string; first: ActivityPage }) {
  const feed = useProjectActivity(projectId, first);
  const items = feed.data.pages.flatMap((page) => page.items);
  return (
    <Paper withBorder p="md">
      <Stack gap="xs">
        <Text fw={600}>{ACTIVITY_COPY.title}</Text>
        <ActivityList
          items={items}
          hasMore={feed.hasNextPage}
          loadingMore={feed.isFetchingNextPage}
          failed={feed.isFetchNextPageError}
          onMore={() => void feed.fetchNextPage()}
        />
      </Stack>
    </Paper>
  );
}
