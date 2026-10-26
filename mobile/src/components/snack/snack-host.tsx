// Draws the snack from use-snack.ts above the floating tab bar: dark in both schemes (theme role `snack`), the action
// in light violet. Mounted once by app/(tabs)/_layout.tsx (Sesi A).
import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useTabBarInset } from '@/navigation/use-tab-bar-inset';
import { SPACING } from '@/theme/tokens';

import { hideSnack, SNACK_MS, useCurrentSnack } from './use-snack';

/** The current snack, or nothing; each snack hides itself after SNACK_MS. */
export function SnackHost() {
  const current = useCurrentSnack();
  const bottom = useTabBarInset() + SPACING.xs;

  useEffect(() => {
    if (!current) return;
    AccessibilityInfo.announceForAccessibility(current.message);
    const timer = setTimeout(() => hideSnack(current.id), SNACK_MS);
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;
  const act = () => {
    hideSnack(current.id);
    current.onAction?.();
  };
  return (
    <Animated.View
      key={current.id}
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(150)}
      pointerEvents="box-none"
      style={{ position: 'absolute', left: SPACING.md, right: SPACING.md, bottom }}
    >
      <HStack
        testID="snack"
        accessibilityLiveRegion="polite"
        className="min-h-11 items-center gap-3 rounded-card bg-snack px-4 py-2"
      >
        <Text className="flex-1 text-subhead text-snack-foreground">{current.message}</Text>
        {current.action && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={current.action}
            onPress={act}
            className="min-h-11 justify-center px-2 data-[active=true]:opacity-70"
          >
            <Text className="text-subhead font-semibold text-snack-action">{current.action}</Text>
          </Pressable>
        )}
      </HStack>
    </Animated.View>
  );
}
