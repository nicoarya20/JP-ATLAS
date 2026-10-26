/** The cards of one lane: sections per day, "Muat lebih banyak", and the loading, error and empty states. */
import { Button, Skeleton, Stack, Text } from '@mantine/core';
import { describeApiError } from '~/lib/http';
import type { InboxItem, InboxLane, InboxSeed } from '~/lib/inbox-api';
import { uniqueInboxItems } from '~/lib/inbox-api';
import { type InboxClock, sectionsFor } from '~/lib/inbox-view';
import { useInboxPages } from '~/lib/use-inbox';
import { InboxCard } from './InboxCard';
import { InboxEmpty } from './InboxEmpty';
import { InboxLoadError } from './InboxLoadError';
import { INBOX_COPY } from './inbox.copy';

type Props = {
  lane: InboxLane;
  seed: InboxSeed;
  clock: InboxClock;
  onOpen: (item: InboxItem) => void;
  onShowNews: () => void;
};

export function InboxList({ lane, seed, clock, onOpen, onShowNews }: Props) {
  const pages = useInboxPages(lane, seed);
  const items = uniqueInboxItems(pages.data?.pages ?? []);
  return (
    <Stack gap="md">
      {pages.isError && (
        <InboxLoadError
          message={describeApiError(pages.error)}
          retrying={pages.isFetching}
          onRetry={() => void pages.refetch()}
        />
      )}
      {pages.isPending && <Skeleton height={88} radius="md" aria-label={INBOX_COPY.loading} />}
      {pages.data && items.length === 0 && !pages.isError && (
        <InboxEmpty lane={lane} onShowNews={onShowNews} />
      )}
      {sectionsFor(lane, items).map((section) => (
        <Stack
          key={section.key}
          gap="xs"
          component="section"
          aria-label={section.heading ?? undefined}
        >
          {section.heading && (
            <Text fw={700} size="sm">
              {section.heading}
            </Text>
          )}
          {section.items.map((item) => (
            <InboxCard key={item.id} item={item} clock={clock} onOpen={onOpen} />
          ))}
        </Stack>
      ))}
      {pages.hasNextPage && (
        <Button
          variant="default"
          loading={pages.isFetchingNextPage}
          onClick={() => void pages.fetchNextPage()}
          style={{ alignSelf: 'center' }}
        >
          {INBOX_COPY.loadMore}
        </Button>
      )}
    </Stack>
  );
}
