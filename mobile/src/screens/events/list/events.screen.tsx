// Events ① list, ② calendar and ⑨ empty (prototype events.list.jsx): the stacked Events tab with the
// search and the Filter & sort icon, the List / Calendar switch (route param `view`), then the
// grouped cards or the calendar. The query lives in the events query store (K4).
//
// The rows come from `GET /api/app/events`. The filters and the search text are what the server is
// asked for, so changing either refetches (debounced for typing); nothing is narrowed a second time
// here, which would disagree with the server's own answer on the next page.
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, List, Plus } from 'lucide-react-native';
import { useEffect } from 'react';

import { SearchFilter } from '@/components/filter/filter-button';
import { Seg } from '@/components/form/seg';
import { StackedScreen } from '@/components/screen/stacked-screen';
import { EmptyState } from '@/components/state/empty-state';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { getEventsList } from '@/data/events';
import { eventsListResource, loadMoreEvents, syncEventsList } from '@/data/events.api';
import {
  BASE_QUERY,
  isFiltered,
  listKeyOf,
  setEventsSearch,
  useEventsSearch,
} from '@/data/events.query';
import type { EventHref } from '@/data/events.shared';
import { setEventsQuery, useEventsQuery } from '@/data/events.store';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { EventsCalendar } from '../calendar/events-calendar';
import { LIST, STATE } from '../events.strings';
import { EventsFailed, EventsLoading } from '../parts/event-state';
import { EventGroups } from './event-groups';

const VIEWS = ['list', 'calendar'] as const;
type View = (typeof VIEWS)[number];

/** How long typing settles before the server is asked; a key per keystroke would be a request each. */
const SEARCH_SETTLE_MS = 350;

/** The Events tab. role: who is signed in (K12). */
export function EventsScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const query = useEventsQuery();
  const search = useEventsSearch();
  const state = eventsListResource.use();
  const params = useLocalSearchParams<{ view?: string }>();
  const view: View = params.view === 'calendar' ? 'calendar' : 'list';
  const key = JSON.stringify(listKeyOf(query, search));

  // One effect, one key: `syncEventsList` fetches only when the key is not the one loaded, so this
  // covers the first mount and every later change of the filters or the search text alike.
  useEffect(() => {
    const timer = setTimeout(() => {
      void syncEventsList(JSON.parse(key));
    }, SEARCH_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [key]);

  const data = getEventsList(role, { query });
  const on = isFiltered(view === 'calendar' ? { ...query, when: 0 } : query);
  const open = (x: { href: EventHref }) => router.push(x.href);
  const reset = () => {
    setEventsQuery(BASE_QUERY);
    setEventsSearch('');
  };
  const newEvent = data.createEvent && (
    <Button onPress={() => router.push('/events/new')}>
      <ButtonIcon as={Plus} />
      <ButtonText>{LIST.newEvent}</ButtonText>
    </Button>
  );
  return (
    <StackedScreen
      testID="screen-events"
      title={LIST.title}
      find={
        <SearchFilter
          testID="events-filter"
          placeholder={LIST.search}
          value={search}
          onChangeText={setEventsSearch}
          on={on}
          onPress={() => router.push({ pathname: '/events/filter', params: { view } })}
        />
      }
    >
      <Seg
        testID="events-view"
        items={LIST.views}
        icons={[List, CalendarDays]}
        value={VIEWS.indexOf(view)}
        onChange={(i) => router.setParams({ view: VIEWS[i] })}
      />
      {view === 'calendar' ? (
        <EventsCalendar role={role} query={query} onOpen={open} onReset={reset} />
      ) : state.phase === 'failed' && !state.data ? (
        <EventsFailed
          message={state.error?.message}
          onRetry={() => {
            void eventsListResource.reload();
          }}
        />
      ) : !state.data ? (
        <EventsLoading />
      ) : data.empty ? (
        <EmptyState
          testID="events-empty"
          icon={CalendarDays}
          title={LIST.emptyTitle}
          text={LIST.emptyText}
          action={newEvent || undefined}
        />
      ) : (
        <>
          <EventGroups
            groups={data.groups}
            searchOnly={!on && !!search.trim()}
            onOpen={open}
            onReset={reset}
          />
          {data.more && (
            <Button
              testID="events-load-more"
              variant="outline"
              isDisabled={state.phase === 'loading'}
              onPress={() => {
                void loadMoreEvents();
              }}
            >
              <ButtonText>{STATE.loadMore}</ButtonText>
            </Button>
          )}
        </>
      )}
    </StackedScreen>
  );
}
