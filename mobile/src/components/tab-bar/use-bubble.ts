import { useEffect, useRef, useState } from 'react';
import { usePanGesture } from 'react-native-gesture-handler';
import {
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { nearest, posAt } from '@/navigation/bubble.math';

import { BUBBLE_MS, EASE, EASE_OUT, HELD, JELLY, keyframes, POP, SPRING } from './tab-bar.motion';

/** The bubble's shared values, read by TabBubble and TabItem on the UI thread. */
export type BubbleValues = ReturnType<typeof useBubble>['values'];

type BubbleOptions = {
  n: number;
  /** Index of the selected tab. */
  active: number;
  /** A finger lifted on tab `index` (or a screen reader activated it): pick it. */
  onRelease: (index: number) => void;
};

/**
 * The tab bubble (prototype kit/tabbar.jsx GlassTabs): rests behind the active tab, jumps under a finger and follows it,
 * and on release the nearest tab is picked. Every tab change, wherever it came from, slides it there with a jelly
 * bounce (not on the first mount). Motion runs on the UI thread; JS only hears the release and the lit tab changing.
 */
export function useBubble({ n, active, onRelease }: BubbleOptions) {
  const reduced = useReducedMotion();
  const width = useSharedValue(0);
  const pos = useSharedValue(active);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const lift = useSharedValue(0);
  const icon = useSharedValue(1);
  const lit = useSharedValue(active);
  const activated = useSharedValue(false);
  const [litTab, setLitTab] = useState(active);

  useAnimatedReaction(
    () => lit.get(),
    (now, before) => {
      if (now !== before) scheduleOnRN(setLitTab, now);
    },
  );

  const slide = (to: number, ms: number, easing: typeof EASE) => {
    'worklet';
    pos.set(
      withTiming(to, {
        duration: reduced ? BUBBLE_MS.reduced : ms,
        easing: reduced ? EASE : easing,
      }),
    );
  };

  const grab = (at: number) => {
    'worklet';
    lit.set(nearest(at));
    lift.set(withTiming(1, { duration: BUBBLE_MS.shadow, easing: EASE }));
    slide(at, BUBBLE_MS.heldMove, SPRING);
    if (reduced) return;
    const lifted = { duration: BUBBLE_MS.heldScale, easing: SPRING };
    sx.set(withTiming(HELD.x, lifted));
    sy.set(withTiming(HELD.y, lifted));
    icon.set(withTiming(HELD.icon, lifted));
  };

  const follow = (at: number) => {
    'worklet';
    lit.set(nearest(at));
    slide(at, BUBBLE_MS.drag, EASE_OUT);
  };

  /** Slide to tab `to`; with `bounce`, wobble like a water drop on the way (a new bounce restarts a running one). */
  const settle = (to: number, bounce: boolean) => {
    'worklet';
    lit.set(to);
    lift.set(withTiming(0, { duration: BUBBLE_MS.shadow, easing: EASE }));
    slide(to, BUBBLE_MS.slide, SPRING);
    if (reduced) {
      sx.set(1);
      sy.set(1);
      icon.set(1);
    } else if (bounce) {
      sx.set(
        keyframes(
          JELLY.map(([at, x]) => [at, x] as const),
          BUBBLE_MS.jelly,
          EASE_OUT,
        ),
      );
      sy.set(
        keyframes(
          JELLY.map(([at, , y]) => [at, y] as const),
          BUBBLE_MS.jelly,
          EASE_OUT,
        ),
      );
      icon.set(keyframes(POP, BUBBLE_MS.pop, SPRING));
    } else {
      const back = { duration: BUBBLE_MS.release, easing: SPRING };
      sx.set(withTiming(1, back));
      sy.set(withTiming(1, back));
      icon.set(withTiming(1, { duration: BUBBLE_MS.icon, easing: SPRING }));
    }
  };

  // Every tab change slides the bubble there with a bounce, whatever caused it; not on the first mount. It runs after
  // every render (its worklets are new each render), and the ref keeps it to one slide per change.
  const shown = useRef(active);
  useEffect(() => {
    if (shown.current === active) return;
    shown.current = active;
    settle(active, true);
  });

  /** Release on tab `index` (JS): the same tab bounces in place; another one is up to onRelease. */
  const release = (index: number) => {
    if (index === active) settle(active, true);
    onRelease(index);
  };

  /** The picked tab did not become active (its press was taken over, e.g. More): back to the active tab. */
  const snapBack = () => settle(active, false);

  const at = (x: number) => {
    'worklet';
    return posAt(x, width.get(), n, pos.get());
  };

  // One pan over the pill: a touch grabs the bubble, a drag moves it, lifting picks the nearest tab. A tap that never
  // moved fails the pan (no activation) but still picks; a drag the system cancels goes back to the active tab.
  const pan = usePanGesture({
    testID: 'tab-pan',
    minDistance: 0,
    onBegin: (e) => {
      activated.set(false);
      grab(at(e.x));
    },
    onActivate: () => {
      activated.set(true);
    },
    onUpdate: (e) => {
      follow(at(e.x));
    },
    onFinalize: (e) => {
      if (e.canceled && activated.get()) scheduleOnRN(snapBack);
      // The lit tab, not the bubble's position: the bubble may still be sliding toward the finger.
      else scheduleOnRN(release, lit.get());
    },
  });

  return {
    pan,
    litTab,
    release,
    snapBack,
    onWidth: (w: number) => width.set(w),
    values: { width, pos, sx, sy, lift, icon, lit },
  };
}
