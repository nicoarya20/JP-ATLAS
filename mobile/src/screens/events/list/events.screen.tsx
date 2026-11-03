// Events ① list, ② calendar and ⑨ empty (prototype events.list.jsx): the stacked Events tab with the search and the
// Filter & sort icon, the List / Calendar switch (route param `view`), then the list or the calendar, both from
// `GET /api/app/events`. The query is shared by both (K4); the search looks in event titles (E-5) and goes to the
// server once typing pauses. New event is the tab bar "+". Pulling the sheet down asks the server again
// (events.refresh.ts).
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, List } from 'lucide-react-native';
import { useState } from 'react';

import { SearchFilter } from '@/components/filter/filter-button';
import { Seg } from '@/components/form/seg';
import { StackedScreen } from '@/components/screen/stacked-screen';
import { today } from '@/data/clock';
import type { CalendarPick } from '@/data/events';
import { setEventsQuery, useEventsQuery } from '@/data/events.api';
import { BASE_QUERY, isFiltered } from '@/data/events.query';
import { refreshEvents } from '@/data/events.refresh';
import type { EventHref } from '@/data/events.shared';

import { EventsCalendar } from '../calendar/events-calendar';
import { LIST } from '../events.strings';
import { useDebounced } from '../parts/use-debounced';
import { EventsList } from './events-list';

const VIEWS = ['list', 'calendar'] as const;
type View = (typeof VIEWS)[number];

/** The calendar opens on Month with today (the server's) picked. */
const firstPick = (): CalendarPick => ({ view: 'month', picked: today() });

/** The Events tab. */
export function EventsScreen() {
  const query = useEventsQuery();
  const params = useLocalSearchParams<{ view?: string }>();
  const view: View = params.view === 'calendar' ? 'calendar' : 'list';
  const [search, setSearch] = useState('');
  const sent = useDebounced(search);
  const [pick, setPick] = useState(firstPick);
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
      onRefresh={() => refreshEvents(view, { query, search: sent, pick })}
    >
      <Seg
        testID="events-view"
        items={LIST.views}
        icons={[List, CalendarDays]}
        value={VIEWS.indexOf(view)}
        onChange={(i) => {
          // Back to the list forgets the picked date, as the calendar did when it was left.
          if (VIEWS[i] === 'list') setPick(firstPick());
          router.setParams({ view: VIEWS[i] });
        }}
      />
      {view === 'calendar' ? (
        <EventsCalendar query={query} pick={pick} onPick={setPick} onOpen={open} onReset={reset} />
      ) : (
        <EventsList query={query} search={sent} onOpen={open} onReset={reset} />
      )}
    </StackedScreen>
  );
}
