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
};

/** The screen reader's way to pick a tab, since touches go to the pill's pan gesture. */
const ACTIVATE = [{ name: 'activate' }] as const;

/**
 * One tab of the pill: an icon, its label for screen readers only. It takes no touches itself (the pill's pan does);
 * a double tap with a screen reader arrives as the `activate` action. The lit icon wears the accent and grows with
 * the bubble.
 */
export function TabItem({ tab, index, selected, lit, values, onActivate }: TabItemProps) {
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
      accessibilityActions={ACTIVATE}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate') onActivate();
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
