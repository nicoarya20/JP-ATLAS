// ClickUp-style stacked tab screen (prototype kit StackedScreen: Home, Tasks, Projects, Events): a header on surface, the
// search block under it, and the content as a rounded canvas sheet laid over both. Scrolling the sheet up pushes the
// search block away into a header icon (use-search-collapse).
import { Search } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useTabBarInset } from '@/navigation/use-tab-bar-inset';
import { SPACING } from '@/theme/tokens';

import { useSearchCollapse } from './use-search-collapse';

export const STACKED_SCREEN = { search: 'Search' } as const;

/** The search block and the sheet edge (or pinned row); index 1 sticks under the header. */
const STICKY = [1];

type StackedScreenProps = {
  /** Large title on the left of the header. */
  title: string;
  /** After the search icon on the right (Home's avatar). */
  aside?: ReactNode;
  /** The search block's content (a SearchField or SearchFilter). */
  find?: ReactNode;
  /** What the header icon does once the block is collapsed; default: scroll back to the block. */
  onFind?: () => void;
  /** First row of the sheet that sticks with its rounded edge under the header (Home's chips, Tasks' switches). */
  pinned?: ReactNode;
  children: ReactNode;
  testID?: string;
};

/** Tab screen with the stacked header; only one of the search block and the header icon is reachable at a time. */
export function StackedScreen({
  title,
  aside,
  find,
  onFind,
  pinned,
  children,
  testID,
}: StackedScreenProps) {
  const top = useSafeAreaInsets().top;
  const bottom = useTabBarInset() + SPACING.md;
  const { ref, onScroll, onBlockLayout, blockStyle, iconStyle, collapsed, reveal } =
    useSearchCollapse();
  const edge = 'rounded-t-3xl border-t border-border bg-background';
  return (
    <View testID={testID} className="flex-1 bg-card">
      <HStack
        className="items-center justify-between px-4 pb-3"
        style={{ paddingTop: top + SPACING.xs }}
      >
        <Text accessibilityRole="header" className="text-page font-bold text-foreground">
          {title}
        </Text>
        <HStack className="items-center gap-2">
          {find && (
            <Animated.View
              style={iconStyle}
              pointerEvents={collapsed ? 'auto' : 'none'}
              accessibilityElementsHidden={!collapsed}
              importantForAccessibility={collapsed ? 'auto' : 'no-hide-descendants'}
            >
              <Pressable
                testID="stacked-find"
                accessibilityRole="button"
                accessibilityLabel={STACKED_SCREEN.search}
                onPress={onFind ?? reveal}
                className="h-11 w-11 items-center justify-center"
              >
                <Icon as={Search} size="xl" className="text-foreground" />
              </Pressable>
            </Animated.View>
          )}
          {aside}
        </HStack>
      </HStack>
      <Animated.ScrollView
        testID="stacked-scroll"
        ref={ref}
        onScroll={onScroll}
        scrollEventThrottle={16}
        stickyHeaderIndices={STICKY}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        className="flex-1"
      >
        <Animated.View
          testID="stacked-find-block"
          onLayout={onBlockLayout}
          style={[blockStyle, { transformOrigin: 'top right' }]}
          pointerEvents={collapsed ? 'none' : 'auto'}
          accessibilityElementsHidden={collapsed}
          importantForAccessibility={collapsed ? 'no-hide-descendants' : 'auto'}
          className="px-4 pb-4"
        >
          {find}
        </Animated.View>
        {pinned ? (
          <View testID="stacked-pinned" className={`${edge} px-4 pb-2 pt-4`}>
            {pinned}
          </View>
        ) : (
          <View className={`${edge} h-3`} />
        )}
        <View className="flex-1 gap-4 bg-background px-4 pt-1" style={{ paddingBottom: bottom }}>
          {children}
        </View>
      </Animated.ScrollView>
    </View>
  );
}
