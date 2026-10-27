// My calendar day grid: 24 hour rows and my events as blocks placed by their start and end, opened
// scrolled near the first thing to see.
//
// The prototype's red "now" line is gone: it sat at the sample's frozen 9:41, and the server's
// clock gives this app today's date and the team's zone but no instant to put a line at. A line
// drawn at a made-up minute reads as the time, which is worse than none.
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ScrollView, type ScrollViewInstance, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { CalendarBlock, CalendarTone } from '@/data/profile';
import { HOUR_PX, hourLabel } from '@/data/profile.calendar.dates';

import { type BlockSlop, blockSlops } from './day-grid.slop';

/** Left gutter holding the hour labels, in points. */
const GUTTER_PX = 56;
/** A block never gets shorter than this, so its title stays readable and tappable. */
const MIN_BLOCK_PX = 28;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
/** Room above 12 AM, whose label sits half a line above its hour line (-mt-2). */
const TOP_PAD_PX = 8;

// Event type colour as an Atlas soft pair, with the strong colour on the left edge.
const TONE: Record<CalendarTone, string> = {
  blue: 'bg-info-soft border-info',
  purple: 'bg-accent border-atlas',
  red: 'bg-danger-soft border-destructive',
  green: 'bg-success-soft border-success',
  gray: 'bg-muted border-muted-foreground',
};

const px = (min: number) => (min / 60) * HOUR_PX;
const spanOf = (b: CalendarBlock) => ({
  top: px(b.start),
  height: Math.max(px(b.end - b.start), MIN_BLOCK_PX),
});

function Block({ b, slop }: { b: CalendarBlock; slop: BlockSlop }) {
  return (
    <Pressable
      testID={`calendar-block-${b.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${b.title}, ${b.meta}`}
      onPress={() => router.push(b.href)}
      style={spanOf(b)}
      hitSlop={slop}
      className={`absolute left-0 right-2 overflow-hidden rounded-control border-l-4 px-2 py-1 ${TONE[b.tone]}`}
    >
      <Text numberOfLines={1} className="text-subhead font-semibold text-foreground">
        {b.title}
      </Text>
      <Text numberOfLines={1} className="text-footnote text-muted-foreground">
        {b.meta}
      </Text>
    </Pressable>
  );
}

type DayGridProps = {
  blocks: CalendarBlock[];
  /** Where to open; a new day jumps there without animation. */
  scrollY: number;
  /** The picked day, so a change scrolls again. */
  day: string;
};

/** The scrolling hours of one day. */
export function DayGrid({ blocks, scrollY, day }: DayGridProps) {
  const scroll = useRef<ScrollViewInstance>(null);
  const bottom = useSafeAreaInsets().bottom;
  const slops = blockSlops(blocks.map(spanOf), HOURS.length * HOUR_PX);
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll only when the picked day changes, not on every edit
  useEffect(() => {
    scroll.current?.scrollTo({ y: scrollY, animated: false });
  }, [day]);
  return (
    <ScrollView
      ref={scroll}
      testID="day-grid"
      contentOffset={{ x: 0, y: scrollY }}
      contentContainerStyle={{ paddingTop: TOP_PAD_PX, paddingBottom: bottom }}
      className="flex-1"
    >
      <View style={{ height: HOURS.length * HOUR_PX }}>
        {HOURS.map((h) => (
          <View key={h} style={{ height: HOUR_PX }} className="flex-row">
            <Text
              style={{ width: GUTTER_PX }}
              className="-mt-2 pr-2 text-right text-footnote text-muted-foreground"
            >
              {hourLabel(h)}
            </Text>
            <View className="flex-1 border-t border-border" />
          </View>
        ))}
        <View style={{ left: GUTTER_PX }} className="absolute bottom-0 right-0 top-0">
          {blocks.map((b, i) => (
            <Block key={b.id} b={b} slop={slops[i]} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
