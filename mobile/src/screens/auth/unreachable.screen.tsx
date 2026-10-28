// Shown instead of the app when the server could not be asked who is signed in: no network, the
// wrong EXPO_PUBLIC_API_URL, or the API not running. Dropping someone at the sign-in screen would
// be a lie — the session may be perfectly good — so the only honest offer is to try again.
//
// It renders outside the navigator (app/_layout.tsx returns it in place of the Stack), so it uses
// no router and no safe-area hook: neither has a provider that far up.
import { View } from 'react-native';

import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { UNREACHABLE } from './auth.strings';

/** The message from the failed request, with a retry button that re-reads the session. */
export function UnreachableScreen({
  message,
  busy,
  onRetry,
}: {
  message: string;
  busy: boolean;
  onRetry: () => void;
}) {
  return (
    <View testID="screen-unreachable" className="flex-1 justify-center bg-background px-4">
      <VStack className="gap-4">
        <Text accessibilityRole="header" className="text-page font-bold">
          {UNREACHABLE.title}
        </Text>
        <Text accessibilityRole="alert" className="text-body">
          {message}
        </Text>
        <Button
          size="lg"
          onPress={onRetry}
          isDisabled={busy}
          accessibilityState={{ busy, disabled: busy }}
          testID="unreachable-retry"
        >
          {busy && <ButtonSpinner />}
          <ButtonText>{UNREACHABLE.retry}</ButtonText>
        </Button>
      </VStack>
    </View>
  );
}
