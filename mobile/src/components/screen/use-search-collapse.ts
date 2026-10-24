// Stacked screen collapse (prototype kit stacked.collapse.js), scrubbed by the scroll on the UI thread: as the content
// sheet scrolls up it pushes the search block away (the block fades and shrinks while the header's search icon fades
// in). Let go part way, the fold snaps to the nearer end like an iOS large title.
import { useCallback, useState } from 'react';
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

/** Collapsed at or past this share of the search block's height: from here the icon, not the block, can be tapped. */
export const COLLAPSED_AT = 0.5;

/** A drag that ends slower than this (px/ms) has no momentum to come, so it snaps on release. */
const RESTING_VELOCITY = 0.1;

/**
 * Tracks how far the sheet has scrolled over the search block as a 0..1 progress, and returns the scroll view's ref and
 * handler, the block's layout handler, the block and icon styles, whether the block is collapsed, and `reveal` (scroll
 * back to the top so the block is reachable again).
 */
export function useSearchCollapse() {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const height = useSharedValue(0);
  const top = useSharedValue(0);
  const [collapsed, setCollapsed] = useState(false);
  const animate = !useReducedMotion();
  const progress = useDerivedValue(() => {
    const h = height.get();
    return h ? Math.min(1, Math.max(0, top.get() / h)) : 0;
  });
  useAnimatedReaction(
    () => progress.get() >= COLLAPSED_AT,
    (now, before) => {
      if (now !== before) scheduleOnRN(setCollapsed, now);
    },
  );
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      top.set(e.contentOffset.y);
    },
    onEndDrag: (e) => {
      if (Math.abs(e.velocity?.y ?? 0) >= RESTING_VELOCITY) return;
      snap();
    },
    onMomentumEnd: () => {
      snap();
    },
  });
  // Inside the block (1 px slack for fractional offsets): to whichever end is nearer.
  function snap() {
    'worklet';
    const h = height.get();
    const y = top.get();
    if (y >= 1 && y <= h - 1) scrollTo(ref, 0, y / h < COLLAPSED_AT ? 0 : h, animate);
  }
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
  const reveal = useCallback(
    () => ref.current?.scrollTo({ y: 0, animated: animate }),
    [ref, animate],
  );
  return { ref, onScroll, onBlockLayout, blockStyle, iconStyle, collapsed, reveal };
}
