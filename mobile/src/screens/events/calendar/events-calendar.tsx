// Events ② calendar (prototype events.calendar.jsx): Month / Week switch, the title between its arrows, the date grid
// with dots, then the picked date's agenda. Opens on Month with today picked; the type and project filters apply,
// past and upcoming alike. When the filters hide every event of the shown month or week, Reset filters takes the
// agenda's place (UX §4, beyond the prototype).
import { useState } from 'react';
import { View } from 'react-native';

import { Seg } from '@/components/form/seg';
import { NoMatch } from '@/components/state/no-match';
import { today } from '@/data/clock';
import { type AgendaItem, type CalendarView, getEventsCalendar, stepCalendar } from '@/data/events';
import type { EventsQuery } from '@/data/events.query';
import type { Role } from '@/data/sample';

import { CALENDAR, LIST } from '../events.strings';
import { SPOKEN } from '../events.strings.added';
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

/** The calendar body of the Events tab; the screen around it keeps the search and the List / Calendar switch. */
export function EventsCalendar({ role, query, onOpen, onReset }: EventsCalendarProps) {
  const [view, setView] = useState<CalendarView>('month');
  const [picked, setPicked] = useState(today);
  const data = getEventsCalendar(role, { view, picked, query });
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
      {data.hiddenByFilters ? (
        <NoMatch title={LIST.noMatch} onReset={onReset} />
      ) : (
        <AgendaList date={data.agendaDate} items={data.agenda} onOpen={onOpen} />
      )}
    </>
  );
}
