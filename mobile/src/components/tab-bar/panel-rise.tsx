import { type ReactNode, useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { BUBBLE_MS, EASE, PANEL, SPRING } from './tab-bar.motion';
import { usePanel } from './tab-panel';

type PanelRiseProps = {
  /** Order in the panel: child i floats in 28 ms after child i − 1. */
  i: number;
  children: ReactNode;
};

/**
 * A child of the unfolding panel (prototype .tb-rise): it floats up into place one after another as the panel opens,
 * and drops back together, faster, as it folds. Reduced motion: only a short fade.
 */
export function PanelRise({ i, children }: PanelRiseProps) {
  const { open, reduced } = usePanel();
  const opacity = useSharedValue(open ? 1 : 0);
  const y = useSharedValue(open || reduced ? 0 : PANEL.rise.y);
  const scale = useSharedValue(open || reduced ? 1 : PANEL.rise.scale);

  useEffect(() => {
    if (reduced) {
      y.set(0);
      scale.set(1);
      opacity.set(withTiming(open ? 1 : 0, { duration: BUBBLE_MS.reduced, easing: EASE }));
      return;
    }
    if (open) {
      const after = PANEL.rise.delayMs + i * PANEL.rise.stepMs;
      const move = { duration: PANEL.rise.moveMs, easing: SPRING };
      opacity.set(
        withDelay(after, withTiming(1, { duration: PANEL.rise.opacityMs, easing: EASE })),
      );
      y.set(withDelay(after, withTiming(0, move)));
      scale.set(withDelay(after, withTiming(1, move)));
    } else {
      const move = { duration: PANEL.rise.closeMoveMs, easing: EASE };
      opacity.set(withTiming(0, { duration: PANEL.rise.closeOpacityMs, easing: EASE }));
      y.set(withTiming(PANEL.rise.y, move));
      scale.set(withTiming(PANEL.rise.scale, move));
    }
  }, [open, reduced, i, opacity, y, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: y.get() }, { scale: scale.get() }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
