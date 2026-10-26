// Stacked screen collapse (prototype kit stacked.collapse.js), scrubbed by the scroll on the UI thread: as the content
// sheet scrolls up it pushes the search block away (the block fades and shrinks while the header's search icon fades
// in), then the pinned row compacts by `pinShrink` px. Let go part way, each fold snaps to its nearer end.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type Animated from 'react-native-reanimated';
import {
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Focusable } from './stacked-context';

/** Collapsed at or past this share of the search block's height: from here the icon, not the block, can be tapped. */
export const COLLAPSED_AT = 0.5;

/** A drag that ends slower than this (px/ms) has no momentum to come, so it snaps on release. */
const RESTING_VELOCITY = 0.1;

const clamp01 = (n: number) => {
  'worklet';
  return Math.min(1, Math.max(0, n));
};

/**
 * Tracks the scroll in two stretches: `progress` over the search block (0 shown .. 1 gone) and `pinned` over the pinned
 * row's shrink (0 tall .. 1 compact). Returns the scroll view's ref and handler, the block's layout handler, the block
 * and icon styles, whether the block is collapsed, `reveal` (scroll back to the top, then focus the registered field)
 * and `register` for that field.
 */
export function useSearchCollapse(pinShrink: number) {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const height = useSharedValue(0);
  const top = useSharedValue(0);
  const [collapsed, setCollapsed] = useState(false);
  const animate = !useReducedMotion();
  const field = useRef<Focusable | null>(null);
  const focusOnOpen = useRef(false);
  const progress = useDerivedValue(() => {
    const h = height.get();
    return h ? clamp01(top.get() / h) : 0;
  });
  const pinned = useDerivedValue(() => clamp01((top.get() - height.get()) / pinShrink));
  useAnimatedReaction(
    () => progress.get() >= COLLAPSED_AT,
    (now, before) => {
      if (now !== before) scheduleOnRN(setCollapsed, now);
    },
  );
  // Inside a fold (1 px slack for fractional offsets): to whichever end is nearer.
  function snap() {
    'worklet';
    const h = height.get();
    const y = top.get();
    let to = -1;
    if (y >= 1 && y <= h - 1) to = y / h < COLLAPSED_AT ? 0 : h;
    else if (y >= h + 1 && y <= h + pinShrink - 1) to = y - h < pinShrink / 2 ? h : h + pinShrink;
    if (to >= 0) scrollTo(ref, 0, to, animate);
  }
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      top.set(e.contentOffset.y);
    },
    onEndDrag: (e) => {
      if (Math.abs(e.velocity?.y ?? 0) < RESTING_VELOCITY) snap();
    },
    onMomentumEnd: () => {
      snap();
    },
  });
  const onBlockLayout = useCallback(
    (e: LayoutChangeEvent) => height.set(e.nativeEvent.layout.height),
    [height],
  );
  // The block fades out within the first third while shrinking toward the icon; the icon grows in over the second half.
  const blockStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - progress.get() * 3),
    transform: [{ scale: 1 - progress.get() * 0.4 }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, progress.get() * 2 - 1),
    transform: [{ scale: 0.6 + progress.get() * 0.4 }],
  }));
  // The block is hidden from touch and screen readers while collapsed: focus its field only once it has re-opened.
  useEffect(() => {
    if (collapsed || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    field.current?.focus();
  }, [collapsed]);
  const reveal = useCallback(() => {
    focusOnOpen.current = true;
    ref.current?.scrollTo({ y: 0, animated: animate });
  }, [ref, animate]);
  const register = useCallback((f: Focusable | null) => {
    field.current = f;
  }, []);
  return {
    ref,
    onScroll,
    onBlockLayout,
    blockStyle,
    iconStyle,
    collapsed,
    reveal,
    register,
    pinned,
  };
}
