import { useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { BUBBLE_PAD } from '@/navigation/bubble.math';
import { DARK, LIGHT } from '@/theme/tokens';

import type { BubbleValues } from './use-bubble';

type TabBubbleProps = { n: number; values: BubbleValues };

/**
 * The lens behind the lit tab (prototype .tb-bubble): one tab wide, moved and squashed by transform only. Its lift
 * shadow is a second, pre-shadowed layer whose opacity fades in while a finger holds it (an animated shadow would
 * redraw every frame).
 */
export function TabBubble({ n, values }: TabBubbleProps) {
  const { width, pos, sx, sy, lift } = values;
  const shadow = (useColorScheme() === 'dark' ? DARK : LIGHT).shadow;

  const box = useAnimatedStyle(() => {
    const tab = Math.max(width.get() - 2 * BUBBLE_PAD, 0) / n;
    return {
      width: tab,
      transform: [{ translateX: pos.get() * tab }, { scaleX: sx.get() }, { scaleY: sy.get() }],
    };
  });
  const lifted = useAnimatedStyle(() => ({ opacity: lift.get() }));

  return (
    <Animated.View
      testID="tab-bubble"
      pointerEvents="none"
      style={[{ position: 'absolute', top: BUBBLE_PAD, bottom: BUBBLE_PAD, left: BUBBLE_PAD }, box]}
    >
      <Animated.View
        style={[{ position: 'absolute', inset: 0, boxShadow: shadow }, lifted]}
        className="rounded-full"
      />
      <Animated.View
        style={{ position: 'absolute', inset: 0 }}
        className="rounded-full bg-input/15"
      />
    </Animated.View>
  );
}
