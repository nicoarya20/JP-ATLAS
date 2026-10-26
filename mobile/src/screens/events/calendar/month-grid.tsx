// Monday-first date grid (prototype events.calendar.jsx Grid / Day): weekday heads, empty cells before the 1st, then a
// cell per date with one dot for one event and two for more. A plain View grid, at most 6 rows of 7 Pressables.
import { View } from 'react-native';

import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { CalendarDay } from '@/data/events';
import { WEEKDAY_HEADS } from '@/data/events.dates';

const WEEK = 7;
/** Keys of the (at most two) dots under a date. */
const DOT_SLOTS = ['one', 'more'] as const;

type MonthGridProps = {
  days: readonly CalendarDay[];
  lead: number;
  onPick: (date: string) => void;
};

function Day({ d, onPick }: { d: CalendarDay; onPick: (date: string) => void }) {
  return (
    <Pressable
      testID={`cal-${d.date}`}
      accessibilityRole="button"
      accessibilityLabel={d.label}
      accessibilityState={{ selected: d.selected }}
      onPress={() => onPick(d.date)}
      className="min-h-11 flex-1 items-center justify-center gap-1 py-1"
    >
      {/* The picked date's number sits on a violet disc (surface-coloured text, ≥ 4.5:1 in both schemes). */}
      <View
        className={`h-8 w-8 items-center justify-center rounded-full ${d.selected ? 'bg-atlas' : ''}`}
      >
        <Text
          className={`text-subhead ${d.selected ? 'font-semibold text-card' : 'text-foreground'}`}
        >
          {d.day}
        </Text>
      </View>
      <HStack className="h-1.5 gap-1">
        {DOT_SLOTS.slice(0, d.dots).map((slot) => (
          <View key={slot} testID="cal-dot" className="h-1.5 w-1.5 rounded-full bg-atlas" />
        ))}
      </HStack>
    </Pressable>
  );
}

/** Rows of seven: blanks keep the first date under its weekday, the last row is padded. */
export function MonthGrid({ days, lead, onPick }: MonthGridProps) {
  const cells: (CalendarDay | null)[] = [...Array.from({ length: lead }, () => null), ...days];
  while (cells.length % WEEK) cells.push(null);
  const rows = Array.from({ length: cells.length / WEEK }, (_, r) =>
    cells.slice(r * WEEK, r * WEEK + WEEK),
  );
  return (
    <VStack testID="cal-grid" className="gap-1">
      <HStack>
        {WEEKDAY_HEADS.map((w) => (
          <Text key={w} className="flex-1 text-center text-footnote text-muted-foreground">
            {w}
          </Text>
        ))}
      </HStack>
      {rows.map((row, r) => (
        <HStack key={row.find(Boolean)?.date ?? r} className="gap-1">
          {row.map((d, i) =>
            d ? (
              <Day key={d.date} d={d} onPick={onPick} />
            ) : (
              // a blank holds its weekday's column
              <View key={WEEKDAY_HEADS[i]} className="flex-1" />
            ),
          )}
        </HStack>
      ))}
    </VStack>
  );
}
