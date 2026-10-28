// My calendar week strip (prototype profile.calendar.jsx WeekStrip + profile.calendar.swipe.js): seven day buttons,
// Sunday first. A sideways drag follows the finger; a long enough drag or a flick slides the week out and pages it,
// anything shorter springs back. Screen readers page with a Previous week / Next week action on each day: an adjustable
// strip would group the days into one element, and each day must stay reachable on its own.
import { useState } from 'react';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { CalendarDay } from '@/data/profile.calendar';
import { pageOf, START_PX } from '@/data/profile.calendar.swipe';

import { EASE } from '../../components/tab-bar/tab-bar.motion';
import { CALENDAR } from './profile.strings';

/** Slide out or back, in ms. */
const SLIDE_MS = 220;
/** A vertical move this long hands the touch to the day grid. */
const FAIL_Y_PX = 10;

/** The paging actions each day offers a screen reader. */
const PAGE_ACTIONS = [
  { name: 'previous-week', label: CALENDAR.previous },
  { name: 'next-week', label: CALENDAR.next },
];

type DayProps = { d: CalendarDay; onPick: (iso: string) => void; onPage: (step: -1 | 1) => void };

function Day({ d, onPick, onPage }: DayProps) {
  return (
    <Pressable
      testID={`week-day-${d.iso}`}
      accessibilityRole="button"
      accessibilityLabel={d.label}
      accessibilityState={{ selected: d.picked }}
      accessibilityActions={PAGE_ACTIONS}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'next-week') onPage(1);
        else if (e.nativeEvent.actionName === 'previous-week') onPage(-1);
      }}
      onPress={() => onPick(d.iso)}
      className="min-h-11 flex-1 items-center gap-1 py-1"
    >
      <Text className={`text-footnote ${d.weekend ? 'text-muted-foreground' : 'text-foreground'}`}>
        {d.letter}
      </Text>
      <View
        className={`h-9 w-9 items-center justify-center rounded-full ${d.picked ? (d.today ? 'bg-destructive' : 'bg-foreground') : ''}`}
      >
        <Text
          className={`text-body font-semibold ${d.picked ? 'text-background' : d.today ? 'text-destructive' : 'text-foreground'}`}
        >
          {String(d.num)}
        </Text>
      </View>
      <View
        className={`h-1 w-1 rounded-full ${d.marked ? 'bg-muted-foreground' : 'bg-transparent'}`}
      />
    </Pressable>
  );
}

type WeekStripProps = {
  week: CalendarDay[];
  onPick: (iso: string) => void;
  /** +1 the next week, -1 the previous one. */
  onPage: (step: -1 | 1) => void;
};

/** The swipeable week. */
export function WeekStrip({ week, onPick, onPage }: WeekStripProps) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const dx = useSharedValue(0);
  const pan = usePanGesture({
    testID: 'week-pan',
    activeOffsetX: [-START_PX, START_PX],
    failOffsetY: [-FAIL_Y_PX, FAIL_Y_PX],
    onUpdate: (e) => {
      if (!reduced) dx.set(e.translationX);
    },
    onDeactivate: (e) => {
      const step = e.canceled ? 0 : pageOf(e.translationX, e.velocityX, width);
      if (step === 0 || reduced) {
        dx.set(reduced ? 0 : withTiming(0, { duration: SLIDE_MS, easing: EASE }));
        if (step !== 0) scheduleOnRN(onPage, step);
        return;
      }
      dx.set(
        withTiming(-step * width, { duration: SLIDE_MS, easing: EASE }, (done) => {
          if (!done) return;
          dx.set(0);
          scheduleOnRN(onPage, step);
        }),
      );
    },
  });
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: dx.get() }] }));
  return (
    <GestureDetector gesture={pan}>
      <View
        testID="week-strip"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        className="overflow-hidden"
      >
        <Animated.View style={slide}>
          <HStack>
            {week.map((d) => (
              <Day key={d.iso} d={d} onPick={onPick} onPage={onPage} />
            ))}
          </HStack>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
