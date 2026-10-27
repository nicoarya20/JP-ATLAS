/** The loaded events under one heading per day, with the empty, loading, error and "more" states. */
import { Button, Skeleton, Stack, Text } from '@mantine/core';
import { FiCalendar } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { type EventsSeed, NEW_EVENT_PATH, uniqueEvents, useEventPages } from '~/lib/events-api';
import { type EventFilters, hasEventFilters, toEventQuery } from '~/lib/events-filters';
import { type EventsClock, groupByDay } from '~/lib/events-format';
import { describeApiError } from '~/lib/http';
import { EventLoadError } from './EventLoadError';
import { EventRow } from './EventRow';
import { EVENTS_COPY } from './events.copy';

/** The previous answer stays readable but visibly out of date while the new one loads. */
const STALE_OPACITY = 0.6;

type Props = {
  filters: EventFilters;
  seed: EventsSeed;
  clock: EventsClock;
  canCreate: boolean;
  onResetFilters: () => void;
};

function Empty({ filters, canCreate, onResetFilters }: Omit<Props, 'seed' | 'clock'>) {
  const past = filters.waktu === 'lewat';
  return (
    <EmptyState
      icon={FiCalendar}
      title={past ? EVENTS_COPY.emptyPastTitle : EVENTS_COPY.emptyUpcomingTitle}
      description={past ? EVENTS_COPY.emptyPastBody : EVENTS_COPY.emptyUpcomingBody}
      action={!past && canCreate ? { label: EVENTS_COPY.create, to: NEW_EVENT_PATH } : undefined}
      filtered={hasEventFilters(filters)}
      onReset={onResetFilters}
    />
  );
}

export function EventList({ filters, seed, clock, canCreate, onResetFilters }: Props) {
  const pages = useEventPages(toEventQuery(filters), seed);
  const items = uniqueEvents(pages.data?.pages ?? []);
  return (
    <Stack gap="md">
      {pages.isError && (
        <EventLoadError
          message={describeApiError(pages.error)}
          retrying={pages.isFetching}
          onRetry={() => void pages.refetch()}
        />
      )}
      {pages.isPending && <Skeleton height={88} radius="md" aria-label={EVENTS_COPY.loading} />}
      {pages.data && items.length === 0 && !pages.isError && (
        <Empty filters={filters} canCreate={canCreate} onResetFilters={onResetFilters} />
      )}
      {items.length > 0 && (
        <Stack
          gap="md"
          aria-busy={pages.isPlaceholderData}
          opacity={pages.isPlaceholderData ? STALE_OPACITY : 1}
        >
          {groupByDay(items, clock).map((group) => (
            <Stack key={group.key} gap="xs" component="section" aria-label={group.heading}>
              <Text fw={700} size="sm">
                {group.heading}
              </Text>
              {group.items.map((event) => (
                <EventRow key={event.id} event={event} clock={clock} />
              ))}
            </Stack>
          ))}
          <Stack gap="xs" align="center">
            <Text size="sm" c="dimmed">
              {EVENTS_COPY.shown(items.length)}
            </Text>
            {pages.hasNextPage && (
              <Button
                variant="default"
                loading={pages.isFetchingNextPage}
                onClick={() => void pages.fetchNextPage()}
              >
                {EVENTS_COPY.more}
              </Button>
            )}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
