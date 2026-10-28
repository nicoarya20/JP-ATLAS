// Profile ② My calendar (prototype profile.calendar.jsx), pushed inside the profile modal: month, the swipeable
// Sunday-first week, the picked day with its event count, and the hour grid of my events on that day. Each week is
// one read of the server's events (`profile.calendar.ts`), kept while the modal is open.
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { DetailHeader } from '@/components/screen/detail-header';
import { FailedState, SECTION_STATE } from '@/components/state/section-state';
import { Text } from '@/components/ui/text';
import { today } from '@/data/clock';
import { addDays } from '@/data/events.dates';
import { getMyCalendar, myWeekResource } from '@/data/profile.calendar';

import { DayGrid } from './day-grid';
import { CALENDAR } from './profile.strings';
import { WeekStrip } from './week-strip';

/** Days in a week: one page of the strip. */
const WEEK_DAYS = 7;

/** My calendar. */
export function CalendarScreen() {
  const [day, setDay] = useState(today);
  const week = myWeekResource(day);
  const state = week.useSnapshot();
  useEffect(() => {
    void week.ensure();
  }, [week]);
  const d = getMyCalendar(day, state.data?.items ?? []);
  const failed = !state.data && state.phase === 'failed';
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
          {`${d.dayLabel} · ${state.data ? d.count : SECTION_STATE.loading}`}
        </Text>
      </View>
      {failed ? (
        <FailedState
          testID="calendar-failed"
          message={state.error?.message}
          onRetry={() => void week.reload()}
        />
      ) : (
        <DayGrid blocks={d.blocks} scrollY={d.scrollY} day={day} />
      )}
    </View>
  );
}
