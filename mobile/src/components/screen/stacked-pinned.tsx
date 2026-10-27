// Pinned row of a StackedScreen (prototype .stk-pin): takes over the sheet's rounded top edge and sticks with it under
// the header. It keeps its tall height in the flow while its visible part compacts with the scroll, so each pixel
// scrolled lifts the content one pixel and the row's bottom folds up by one: the content never jumps.
import type { ReactNode } from 'react';
import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { SPACING } from '@/theme/tokens';

import { PinnedProgressContext } from './stacked-context';

/** The row's top padding shrinks from md to sm as it compacts (prototype .stk-pin-in). */
export const PIN_PAD_SHRINK = SPACING.md - SPACING.sm;

/** Rounded corner depth: the surface fill behind the corners (prototype 24 px radius). */
const CORNER = SPACING.lg;

type StackedPinnedProps = { progress: SharedValue<number>; children: ReactNode };

/** Sticky rounded row; children read the compaction with usePinnedProgress(). */
export function StackedPinned({ progress, children }: StackedPinnedProps) {
  const [tall, setTall] = useState<number | undefined>(undefined);
  const pad = useAnimatedStyle(() => ({
    paddingTop: SPACING.md - PIN_PAD_SHRINK * progress.get(),
  }));
  // Only the tall form sets the row's height in the flow; compact layouts must not shrink it.
  const measure = (e: LayoutChangeEvent) => {
    if (progress.get() === 0) setTall(e.nativeEvent.layout.height);
  };
  return (
    <View testID="stacked-pinned" pointerEvents="box-none" style={{ height: tall }}>
      <View className="absolute inset-x-0 top-0 bg-card" style={{ height: CORNER }} />
      <Animated.View
        onLayout={measure}
        style={pad}
        className="rounded-t-3xl bg-background px-4 pb-2"
      >
        <PinnedProgressContext.Provider value={progress}>{children}</PinnedProgressContext.Provider>
      </Animated.View>
    </View>
  );
}
