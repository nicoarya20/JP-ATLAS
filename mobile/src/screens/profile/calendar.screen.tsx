// Profile ② My calendar, pushed inside the profile modal: month, the swipeable Sunday-first week,
// the picked day with its event count, and the hour grid of my events on that day. One request per
// week shown (`GET /api/app/events?from&to`), so the strip's dots and the grid agree.
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { DetailHeader } from '@/components/screen/detail-header';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Text } from '@/components/ui/text';
import { today } from '@/data/clock';
import { addDays } from '@/data/events.dates';
import { calendarRange, getMyCalendar } from '@/data/profile';
import { myEventsRange } from '@/data/profile.calendar.api';

import { DayGrid } from './day-grid';
import { CALENDAR } from './profile.strings';
import { WeekStrip } from './week-strip';

/** Days in a week: one page of the strip. */
const WEEK_DAYS = 7;

/** My calendar. */
export function CalendarScreen() {
  const [day, setDay] = useState(today());
  const { from, to } = calendarRange(day);
  const week = myEventsRange(from, to);
  const state = week.use();
  // Idempotent by rule 1; a new week is a different resource, so paging the strip asks once for it.
  useEffect(() => {
    void week.ensure();
  }, [week]);
  const d = getMyCalendar(day);
  const grid = () => {
    if (state.phase === 'failed' && !state.data) {
      return (
        <FailedState
          testID="calendar-failed"
          message={state.error?.message}
          onRetry={() => void week.reload()}
        />
      );
    }
    if (!state.data) return <LoadingState testID="calendar-loading" />;
    return <DayGrid blocks={d.blocks} scrollY={d.scrollY} day={day} />;
  };
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
        {d.truncated && <Text className="text-footnote text-warning">{CALENDAR.truncated}</Text>}
      </View>
      {grid()}
    </View>
  );
}
