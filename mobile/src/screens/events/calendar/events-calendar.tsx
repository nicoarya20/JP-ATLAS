// Events ② calendar (prototype events.calendar.jsx): Month / Week switch, the title between its
// arrows, the date grid with dots, then the picked date's agenda. Opens on Month with today picked;
// the type and project filters apply, past and upcoming alike.
//
// The month or week is one read of `GET /api/app/events?from=&to=` (GAP-A9), refetched when the
// shown window or the filters change. The "Show" filter is ignored here on purpose: a calendar
// draws both halves of the year, which is exactly why the range filter exists.
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Seg } from '@/components/form/seg';
import { NoMatch } from '@/components/state/no-match';
import { today } from '@/data/clock';
import { type AgendaItem, type CalendarView, getEventsCalendar, stepCalendar } from '@/data/events';
import { eventsWindowResource, syncEventsWindow } from '@/data/events.api';
import { windowKeyOf } from '@/data/events.calendar';
import type { EventsQuery } from '@/data/events.query';
import type { Role } from '@/data/sample';

import { CALENDAR, LIST, STATE } from '../events.strings';
import { SPOKEN } from '../events.strings.added';
import { Note } from '../parts/event-parts';
import { EventsFailed, EventsLoading } from '../parts/event-state';
import { AgendaList } from './agenda-list';
import { CalendarTitle } from './calendar-title';
import { MonthGrid } from './month-grid';

const VIEWS: readonly CalendarView[] = ['month', 'week'];

type EventsCalendarProps = {
  role: Role;
  query: EventsQuery;
  onOpen: (item: AgendaItem) => void;
  /** Puts the filters (and the search) back to their default. */
  onReset: () => void;
};

/** The calendar body of the Events tab; the screen around it keeps the search and the view switch. */
export function EventsCalendar({ role, query, onOpen, onReset }: EventsCalendarProps) {
  const [view, setView] = useState<CalendarView>('month');
  const [picked, setPicked] = useState(today());
  const state = eventsWindowResource.use();
  const key = JSON.stringify(windowKeyOf(view, picked, query));

  useEffect(() => {
    void syncEventsWindow(JSON.parse(key));
  }, [key]);

  const data = getEventsCalendar(role, { view, picked, query });
  const body = () => {
    if (state.phase === 'failed' && !state.data) {
      return (
        <EventsFailed
          testID="calendar-failed"
          message={state.error?.message}
          onRetry={() => {
            void eventsWindowResource.reload();
          }}
        />
      );
    }
    if (!state.data) return <EventsLoading testID="calendar-loading" />;
    if (data.hiddenByFilters) return <NoMatch title={LIST.noMatch} onReset={onReset} />;
    return <AgendaList date={data.agendaDate} items={data.agenda} onOpen={onOpen} />;
  };
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
      {data.truncated && <Note>{STATE.truncated}</Note>}
      <View className="h-px bg-border" />
      {body()}
    </>
  );
}
