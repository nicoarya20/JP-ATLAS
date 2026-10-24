// Events ① list, ② calendar and ⑨ empty (prototype events.list.jsx): the stacked Events tab with the search and the
// Filter & sort icon, the List / Calendar switch (route param `view`), then the grouped cards or the calendar. The query
// lives in the events query store (K4); the search narrows the list by title or location.
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, List, Plus } from 'lucide-react-native';
import { useState } from 'react';

import { SearchFilter } from '@/components/filter/filter-button';
import { Seg } from '@/components/form/seg';
import { StackedScreen } from '@/components/screen/stacked-screen';
import { EmptyState } from '@/components/state/empty-state';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { getEventsList } from '@/data/events';
import { BASE_QUERY, isFiltered } from '@/data/events.query';
import type { EventHref } from '@/data/events.shared';
import { setEventsQuery, useEventsQuery, useEventsState } from '@/data/events.store';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { EventsCalendar } from '../calendar/events-calendar';
import { LIST } from '../events.strings';
import { EventGroups } from './event-groups';

const VIEWS = ['list', 'calendar'] as const;
type View = (typeof VIEWS)[number];

/** The Events tab. role: who is signed in (K12). */
export function EventsScreen({ role = SESSION_ROLE }: { role?: Role }) {
  useEventsState();
  const query = useEventsQuery();
  const params = useLocalSearchParams<{ view?: string }>();
  const view: View = params.view === 'calendar' ? 'calendar' : 'list';
  const [search, setSearch] = useState('');
  const data = getEventsList(role, { query, search });
  const on = isFiltered(view === 'calendar' ? { ...query, when: 0 } : query);
  const open = (x: { href: EventHref }) => router.push(x.href);
  const reset = () => {
    setEventsQuery(BASE_QUERY);
    setSearch('');
  };
  return (
    <StackedScreen
      testID="screen-events"
      title={LIST.title}
      find={
        <SearchFilter
          testID="events-filter"
          placeholder={LIST.search}
          value={search}
          onChangeText={setSearch}
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
      ) : data.empty ? (
        <EmptyState
          testID="events-empty"
          icon={CalendarDays}
          title={LIST.emptyTitle}
          text={LIST.emptyText}
          action={
            <Button onPress={() => router.push('/events/new')}>
              <ButtonIcon as={Plus} />
              <ButtonText>{LIST.newEvent}</ButtonText>
            </Button>
          }
        />
      ) : (
        <EventGroups
          groups={data.groups}
          searchOnly={!on && !!search.trim()}
          onOpen={open}
          onReset={reset}
        />
      )}
    </StackedScreen>
  );
}
