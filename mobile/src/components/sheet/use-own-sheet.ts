// Motion of a sheet that draws its own panel (OWN_SHEET, src/navigation/stack-presentation.ts): it slides up over a
// fading dim when the route opens, follows a finger dragging it down, rides above the keyboard, and slides away before
// the route goes, whatever removes the route (its X, the dim, a swipe, a button's router.back() or router.replace()).
import { usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { usePanGesture } from 'react-native-gesture-handler';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

// The prototype's sheet curves, shared with the tab bar: FAB_EASE is an iOS sheet curve, the panel's close is quicker.
import { EASE, FAB_EASE, PANEL, PANEL_CLOSE_EASE } from '@/components/tab-bar/tab-bar.motion';

import { useKeyboardHeight } from './use-keyboard-height';

/** Timings in ms, and when a drag down closes the sheet. */
export const OWN_SHEET_MOTION = {
  openMs: 420,
  closeMs: 280,
  /** Back into place after a drag that did not close it. */
  backMs: 220,
  dimMs: PANEL.scrimMs,
  /** A drag past this share of the panel's height closes it... */
  closeShare: 0.3,
  /** ...and so does a flick down faster than this, in pt/s. */
  closeVelocity: 900,
  /** Smallest gap kept above the panel (prototype .react-cupertino-ui-bottom-sheet__content max-height). */
  topGap: 52,
} as const;

const OPEN = { duration: OWN_SHEET_MOTION.openMs, easing: FAB_EASE };
const CLOSE = { duration: OWN_SHEET_MOTION.closeMs, easing: PANEL_CLOSE_EASE };
const BACK = { duration: OWN_SHEET_MOTION.backMs, easing: FAB_EASE };
const DIM = { duration: OWN_SHEET_MOTION.dimMs, easing: EASE };
const INSTANT = { duration: 0 };

/** The panel's and the dim's animated styles, the drag gesture for its grab area, and its size limits. */
export function useOwnSheet(onClose: () => void) {
  const { height: screen } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const kb = useKeyboardHeight();

  // y = how far the panel sits below its place (it starts off screen); h = its measured height.
  const y = useSharedValue(screen);
  const h = useSharedValue(screen);
  const dim = useSharedValue(0);
  const lift = useSharedValue(kb.height);

  // biome-ignore lint/correctness/useExhaustiveDependencies: opens once, on mount; the shared values are stable.
  useEffect(() => {
    y.set(withTiming(0, reduced ? INSTANT : OPEN));
    dim.set(withTiming(1, DIM));
  }, []);

  useEffect(() => {
    lift.set(withTiming(kb.height, { duration: kb.duration }));
  }, [kb, lift]);

  // Hold the route's removal until the panel is gone, then let it through.
  const [leaving, setLeaving] = useState(false);
  const repeat = useRef<() => void>(undefined);
  const leave = () => {
    setLeaving(true);
    repeat.current?.();
  };
  const gone = (finished?: boolean) => {
    'worklet';
    if (finished) scheduleOnRN(leave);
  };
  usePreventRemove(!leaving, (e) => {
    repeat.current = e.repeat;
    dim.set(withTiming(0, reduced ? INSTANT : CLOSE));
    y.set(withTiming(h.get(), reduced ? INSTANT : CLOSE, gone));
  });

  // Drag the grab area down: the panel follows (never above its place); far or fast enough closes it.
  const pan = usePanGesture({
    testID: 'sheet-pan',
    activeOffsetY: [-10, 10],
    onUpdate: (e) => {
      y.set(Math.max(0, e.translationY));
    },
    // onDeactivate, not onFinalize: it only follows an active drag, so a tap on the X never snaps the closing panel back.
    onDeactivate: (e) => {
      const far = e.translationY > h.get() * OWN_SHEET_MOTION.closeShare;
      const fast = e.velocityY > OWN_SHEET_MOTION.closeVelocity;
      if (!e.canceled && (far || fast)) scheduleOnRN(onClose);
      else y.set(withTiming(0, BACK));
    },
  });

  const panel = useAnimatedStyle(() => ({
    bottom: lift.get(),
    transform: [{ translateY: y.get() }],
  }));
  const veil = useAnimatedStyle(() => ({ opacity: dim.get() }));

  return {
    pan,
    panel,
    veil,
    onHeight: (height: number) => h.set(height),
    /** Tallest the panel may grow: below the status bar, above the keyboard. */
    maxHeight: screen - Math.max(OWN_SHEET_MOTION.topGap, top + 8) - kb.height,
    /** Room under the content: the home indicator, unless the keyboard covers it. */
    padBottom: (kb.height > 0 ? 0 : bottom) + 16,
  };
}
