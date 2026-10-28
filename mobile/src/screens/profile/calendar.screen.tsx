// Profile ② My calendar (prototype profile.calendar.jsx), pushed inside the profile modal: month, the swipeable
// Sunday-first week, the picked day with its event count, and the hour grid of my events on that day.
import { useState } from 'react';
import { View } from 'react-native';

import { DetailHeader } from '@/components/screen/detail-header';
import { Text } from '@/components/ui/text';
import { today } from '@/data/clock';
import { addDays } from '@/data/events.dates';
import { useEventsState } from '@/data/events.store';
import { getMyCalendar } from '@/data/profile';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { DayGrid } from './day-grid';
import { CALENDAR } from './profile.strings';
import { WeekStrip } from './week-strip';

/** Days in a week: one page of the strip. */
const WEEK_DAYS = 7;

/** My calendar. role: who is signed in (K12). */
export function CalendarScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { list } = useEventsState();
  const [day, setDay] = useState(today);
  const d = getMyCalendar(role, day, list);
  return (
    <View testID="screen-profile-calendar" className="flex-1 bg-background">
      <DetailHeader title={CALENDAR.title} />
      <View className="gap-2 border-b border-border bg-card px-4 pb-2">
        <Text accessibilityRole="header" className="text-section font-bold">
          {d.month}
        </Text>
        <WeekStrip
          week={d.week}
          onPick={setDay}
          onPage={(step) => setDay((x) => addDays(x, step * WEEK_DAYS))}
        />
        <Text testID="calendar-day" className="text-subhead font-semibold text-foreground">
          {`${d.dayLabel} · ${d.count}`}
        </Text>
      </View>
      <DayGrid blocks={d.blocks} today={d.today} scrollY={d.scrollY} day={day} />
    </View>
  );
}
