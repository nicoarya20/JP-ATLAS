// The List view of the Events tab from `GET /api/app/events`: loading, failed with "Try again", nothing at all (with
// New event for whoever may create one), nothing under the filters or the search (Reset filters), or the grouped cards
// with "Load more" while the server has more.
import { router } from 'expo-router';
import { CalendarDays, Plus } from 'lucide-react-native';
import { useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Button, ButtonIcon, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type EventCard, useEventsList } from '@/data/events';
import { eventsListResource, loadMoreEvents } from '@/data/events.api';
import type { EventsQuery } from '@/data/events.query';
import { useAppCaps } from '@/data/whoami.api';

import { LIST } from '../events.strings';
import { ADDED } from '../events.strings.added';
import { EventGroups } from './event-groups';

/** "Load more" of the list `params`; a failure is reported, the cards stay. */
function LoadMore({ params }: { params: string }) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const press = async () => {
    setBusy(true);
    const state = await loadMoreEvents(params);
    setBusy(false);
    if (state.phase === 'failed' && state.error) notice(state.error.message);
  };
  return (
    <Button
      testID="events-more"
      variant="outline"
      isDisabled={busy}
      accessibilityState={{ busy, disabled: busy }}
      onPress={press}
    >
      {busy && <ButtonSpinner />}
      <ButtonText>{LIST.loadMore}</ButtonText>
    </Button>
  );
}

type EventsListProps = {
  query: EventsQuery;
  /** The search as sent to the server (after typing paused). */
  search: string;
  onOpen: (card: EventCard) => void;
  onReset: () => void;
};

/** The list body under the List / Calendar switch. */
export function EventsList({ query, search, onOpen, onReset }: EventsListProps) {
  const data = useEventsList(query, search);
  const caps = useAppCaps();
  if (data.blank) {
    return data.phase === 'failed' ? (
      <FailedState
        testID="events-failed"
        message={data.error?.message}
        onRetry={() => void eventsListResource(data.params).reload()}
      />
    ) : (
      <LoadingState testID="events-loading" />
    );
  }
  const searchOnly = !data.filtered && !!search.trim();
  return (
    <VStack className="gap-4">
      {data.phase === 'failed' && data.error && (
        <Text testID="events-error" className="text-subhead text-destructive">
          {data.error.message}
        </Text>
      )}
      {data.empty === 'noMatch' ? (
        <NoMatch title={searchOnly ? ADDED.noSearchMatch : LIST.noMatch} onReset={onReset} />
      ) : data.empty === 'none' ? (
        <EmptyState
          testID="events-empty"
          icon={CalendarDays}
          title={LIST.emptyTitle}
          text={LIST.emptyText}
          action={
            caps?.createEvent ? (
              <Button onPress={() => router.push('/events/new')}>
                <ButtonIcon as={Plus} />
                <ButtonText>{LIST.newEvent}</ButtonText>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <EventGroups groups={data.groups} onOpen={onOpen} />
      )}
      {data.more && <LoadMore params={data.params} />}
    </VStack>
  );
}
