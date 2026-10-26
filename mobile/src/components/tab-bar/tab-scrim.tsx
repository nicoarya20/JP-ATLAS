import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { EASE, PANEL } from './tab-bar.motion';

export const TAB_SCRIM = { close: 'Close More' } as const;

type TabScrimProps = { open: boolean; onClose: () => void };

/**
 * Dims the screen while the More panel is open (prototype .glassbar-scrim); a tap on it folds the panel. Mounted
 * always, so it fades both ways; closed, it lets touches through and is hidden from screen readers.
 */
export function TabScrim({ open, onClose }: TabScrimProps) {
  const opacity = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    opacity.set(withTiming(open ? 1 : 0, { duration: PANEL.scrimMs, easing: EASE }));
  }, [open, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      testID="tab-scrim"
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      style={[StyleSheet.absoluteFill, fade]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={TAB_SCRIM.close}
        onPress={onClose}
        className="flex-1 bg-veil"
      />
    </Animated.View>
  );
}
