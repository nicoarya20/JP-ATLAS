import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import type { TabDef } from '@/navigation/tabs.config';

import type { BubbleValues } from './use-bubble';

type TabItemProps = {
  tab: TabDef;
  index: number;
  selected: boolean;
  /** The bubble sits on this tab (under the finger, or the active one at rest). */
  lit: boolean;
  values: BubbleValues;
  onActivate: () => void;
  /** Pick the tab `step` away (±1, wrapping), the prototype's arrow keys. */
  onStep: (step: 1 | -1) => void;
};

/**
 * The screen reader's way to pick a tab, since touches go to the pill's pan gesture, plus the arrow keys' stand-in.
 * Named actions rather than increment/decrement: VoiceOver offers those only on adjustable elements, not on a tab.
 */
export const TAB_ACTIONS = [
  { name: 'activate' },
  { name: 'next', label: 'Next tab' },
  { name: 'previous', label: 'Previous tab' },
] as const;
const STEP: Record<string, 1 | -1> = { next: 1, previous: -1 };

/**
 * One tab of the pill: an icon, its label for screen readers only. It takes no touches itself (the pill's pan does);
 * a double tap with a screen reader arrives as the `activate` action, and its actions offer the next and previous
 * tab. The lit icon wears the accent and grows with the bubble.
 */
export function TabItem({ tab, index, selected, lit, values, onActivate, onStep }: TabItemProps) {
  const { icon, lit: litIndex } = values;
  const grow = useAnimatedStyle(() => ({
    transform: [{ scale: litIndex.get() === index ? icon.get() : 1 }],
  }));

  return (
    <View
      testID={`tab-${tab.id}`}
      accessible
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected }}
      accessibilityActions={TAB_ACTIONS}
      onAccessibilityAction={({ nativeEvent: { actionName } }) => {
        if (actionName === 'activate') onActivate();
        else if (STEP[actionName]) onStep(STEP[actionName]);
      }}
      className="flex-1 items-center justify-center"
    >
      <Animated.View testID={`tab-${tab.id}-icon`} style={grow}>
        {/* 22 px like the prototype's TAB_ICON (the gluestack Icon types no numeric size) */}
        <Icon
          as={tab.Icon}
          className={`h-[22px] w-[22px] ${lit ? 'text-atlas' : 'text-foreground'}`}
        />
      </Animated.View>
    </View>
  );
}
