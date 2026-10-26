// Body of a formSheet route (prototype kit Sheet): X to close at the top left, title and sub line, the content, then the
// stacked actions. The route itself is a native formSheet (fitToContents), registered by Sesi A.
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
    <KeyboardAvoidingView
      testID={testID}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-card"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
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
    </KeyboardAvoidingView>
  );
}
