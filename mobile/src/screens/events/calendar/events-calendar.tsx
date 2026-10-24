// Events ② calendar (prototype events.calendar.jsx): Month / Week switch, the title between its arrows, the date grid
// with dots, then the picked date's agenda. Opens on Month with today picked; the type and project filters apply,
// past and upcoming alike.
import { useState } from 'react';
import { View } from 'react-native';

import { Seg } from '@/components/form/seg';
import { type AgendaItem, type CalendarView, getEventsCalendar, stepCalendar } from '@/data/events';
import type { EventsQuery } from '@/data/events.query';
import { type Role, TODAY } from '@/data/sample';

import { CALENDAR } from '../events.strings';
import { AgendaList } from './agenda-list';
import { CalendarTitle } from './calendar-title';
import { MonthGrid } from './month-grid';

const VIEWS: readonly CalendarView[] = ['month', 'week'];

type EventsCalendarProps = { role: Role; query: EventsQuery; onOpen: (item: AgendaItem) => void };

/** The calendar body of the Events tab; the screen around it keeps the search and the List / Calendar switch. */
export function EventsCalendar({ role, query, onOpen }: EventsCalendarProps) {
  const [view, setView] = useState<CalendarView>('month');
  const [picked, setPicked] = useState(TODAY);
  const data = getEventsCalendar(role, { view, picked, query });
  return (
    <>
      <Seg
        testID="calendar-view"
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
      <AgendaList date={data.agendaDate} items={data.agenda} onOpen={onOpen} />
    </>
  );
}
