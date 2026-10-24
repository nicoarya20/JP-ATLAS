// Detail and form screen header (prototype kit NavBar): a chevron back on the left (a down chevron named "Cancel" on a
// modal screen, which slides down when it leaves), the title in the middle, an optional slot on the right (⋯ menu).
import { router } from 'expo-router';
import { ChevronDown, ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

export const DETAIL_HEADER = { back: 'Back', cancel: 'Cancel' } as const;

type DetailHeaderProps = {
  title?: string;
  sub?: string;
  /** Opened as a modal route (stack-presentation MODAL): down chevron "Cancel" and no status bar inset on iOS. */
  modal?: boolean;
  /** Draw the chevron; off for a root screen. */
  back?: boolean;
  onBack?: () => void;
  /** Right side, e.g. an ActionMenu. */
  right?: ReactNode;
  testID?: string;
};

/** Header bar for a pushed or modal screen; the chevron pops the route by default. */
export function DetailHeader({
  title = '',
  sub,
  modal = false,
  back = true,
  onBack,
  right,
  testID,
}: DetailHeaderProps) {
  const inset = useSafeAreaInsets().top;
  // An iOS modal is a page sheet below the status bar; everywhere else the header starts under it.
  const top = modal && Platform.OS === 'ios' ? 0 : inset;
  return (
    <HStack
      testID={testID}
      className="min-h-14 items-center bg-card px-1"
      style={{ paddingTop: top }}
    >
      <View className="w-14 items-start">
        {back && (
          <Pressable
            testID="detail-back"
            accessibilityRole="button"
            accessibilityLabel={modal ? DETAIL_HEADER.cancel : DETAIL_HEADER.back}
            onPress={onBack ?? (() => router.back())}
            className="h-11 w-11 items-center justify-center"
          >
            <Icon as={modal ? ChevronDown : ChevronLeft} size="xl" className="text-atlas" />
          </Pressable>
        )}
      </View>
      <VStack className="flex-1 items-center">
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          className="text-headline font-semibold text-foreground"
        >
          {title}
        </Text>
        {sub ? (
          <Text numberOfLines={1} className="text-footnote text-muted-foreground">
            {sub}
          </Text>
        ) : null}
      </VStack>
      <View className="w-14 items-end">{right}</View>
    </HStack>
  );
}
