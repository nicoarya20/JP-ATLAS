// Events ② calendar (prototype events.calendar.jsx): Month / Week switch, the title between its arrows, the date grid
// with dots, then the picked date's agenda. Opens on Month with today (the server's) picked; the shown month or week
// is one `GET /api/app/events?from=&to=` with the type and project filters, past and upcoming alike. When the filters
// hide every event of the shown month or week, Reset filters takes the agenda's place (UX §4, beyond the prototype).
import { useState } from 'react';
import { View } from 'react-native';

import { Seg } from '@/components/form/seg';
import { NoMatch } from '@/components/state/no-match';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Text } from '@/components/ui/text';
import { today } from '@/data/clock';
import { type CalendarView, type EventRow, stepCalendar, useEventsCalendar } from '@/data/events';
import type { EventsQuery } from '@/data/events.query';

import { CALENDAR, LIST } from '../events.strings';
import { SPOKEN } from '../events.strings.added';
import { AgendaList } from './agenda-list';
import { CalendarTitle } from './calendar-title';
import { MonthGrid } from './month-grid';

const VIEWS: readonly CalendarView[] = ['month', 'week'];

type EventsCalendarProps = {
  query: EventsQuery;
  onOpen: (row: EventRow) => void;
  /** Puts the filters (and the search) back to their default. */
  onReset: () => void;
};

/** The calendar body of the Events tab; the screen around it keeps the search and the List / Calendar switch. */
export function EventsCalendar({ query, onOpen, onReset }: EventsCalendarProps) {
  const [view, setView] = useState<CalendarView>('month');
  const [picked, setPicked] = useState(today);
  const data = useEventsCalendar({ view, picked, query });
  const below = data.blank ? (
    data.phase === 'failed' ? (
      <FailedState testID="calendar-failed" message={data.error?.message} onRetry={data.retry} />
    ) : (
      <LoadingState testID="calendar-loading" />
    )
  ) : data.hiddenByFilters ? (
    <NoMatch title={LIST.noMatch} onReset={onReset} />
  ) : (
    <AgendaList date={data.agendaDate} items={data.agenda} onOpen={onOpen} />
  );
  return (
    <>
      <Seg
        testID="calendar-view"
        kind="radio"
        label={SPOKEN.calendarView}
        items={CALENDAR.views}
        value={VIEWS.indexOf(view)}
        onChange={(i) => setView(VIEWS[i] ?? 'month')}
      />
      <CalendarTitle
        view={view}
        title={data.title}
        onStep={(by) => setPicked((d) => stepCalendar(view, d, by))}
      />
      <MonthGrid days={data.days} lead={data.lead} onPick={setPicked} />
      <View className="h-px bg-border" />
      {!data.blank && data.phase === 'failed' && data.error && (
        <Text testID="calendar-error" className="text-subhead text-destructive">
          {data.error.message}
        </Text>
      )}
      {below}
    </>
  );
}
