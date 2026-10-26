// Body of a formSheet route (prototype kit Sheet): X to close at the top left, title and sub line, the content, then the
// stacked actions. The route itself is a native formSheet (fitToContents), registered by Sesi A.
//
// The ScrollView is the root on purpose: react-native-screens sizes a formSheet's scroll view to the sheet, and only
// keeps its origin when it is the screen's first view. Wrapped (it was in a KeyboardAvoidingView), it falls back to
// `setFrame:screen.frame` and takes the sheet's offset on screen, so the content sat below the sheet and the sheet
// looked empty (react-native-screens 4.30, RNSScreen.mm correctScrollViewFrame). The keyboard is handled by the
// scroll view's own insets instead.
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

export const SHEET_FRAME = { close: 'Close' } as const;

type SheetFrameProps = {
  title?: string;
  sub?: string;
  /** Closes the sheet; defaults to going back, which dismisses the formSheet route. */
  onClose?: () => void;
  /** Buttons stacked at the bottom (main action first, like the prototype). */
  actions?: ReactNode;
  children?: ReactNode;
  testID?: string;
};

/** Sheet layout that keeps its inputs above the keyboard and its actions above the home indicator. */
export function SheetFrame({
  title,
  sub,
  onClose = router.back,
  actions,
  children,
  testID,
}: SheetFrameProps) {
  const { bottom } = useSafeAreaInsets();
  return (
    <ScrollView
      testID={testID}
      className="bg-card"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerClassName="gap-4 px-4 pt-3"
      contentContainerStyle={{ paddingBottom: bottom + 16 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={SHEET_FRAME.close}
        onPress={onClose}
        className="-ml-2 h-11 w-11 items-center justify-center rounded-full data-[active=true]:bg-muted"
      >
        <Icon as={X} size="xl" className="text-foreground" />
      </Pressable>
      {(title || sub) && (
        <VStack className="gap-1">
          {title && (
            <Text accessibilityRole="header" className="text-section font-semibold">
              {title}
            </Text>
          )}
          {sub && <Text className="text-subhead text-muted-foreground">{sub}</Text>}
        </VStack>
      )}
      {children}
      {actions && <VStack className="gap-2">{actions}</VStack>}
    </ScrollView>
  );
}
