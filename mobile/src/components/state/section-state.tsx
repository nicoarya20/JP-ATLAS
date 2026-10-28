// What a screen shows while its `/api/app/*` data is out, and when it failed. EmptyState already covers
// "there is nothing"; these two cover "not yet" and "it went wrong". Shared by every screen that
// reads the API (Fase 2 pattern §6).
import { CloudOff } from 'lucide-react-native';

import { EmptyState } from '@/components/state/empty-state';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

export const SECTION_STATE = {
  loading: 'Loading…',
  failed: 'Could not load this',
  failedIcon: 'Failed to load',
  retry: 'Try again',
} as const;

/** A request is out and there is nothing to show yet. */
export function LoadingState({ testID }: { testID?: string }) {
  return (
    <VStack testID={testID} className="items-center gap-3 px-6 py-8">
      <Spinner accessibilityLabel={SECTION_STATE.loading} />
      <Text className="text-subhead text-muted-foreground">{SECTION_STATE.loading}</Text>
    </VStack>
  );
}

type FailedStateProps = {
  /** Why it failed, as the failure itself put it; a message from the server is shown as it came. */
  message?: string;
  /** A retry is already running: the button says so instead of accepting a second press. */
  busy?: boolean;
  onRetry: () => void;
  testID?: string;
};

/** The request failed, with the one honest offer: try it again. */
export function FailedState({ message, busy = false, onRetry, testID }: FailedStateProps) {
  return (
    <EmptyState
      testID={testID}
      icon={CloudOff}
      iconLabel={SECTION_STATE.failedIcon}
      title={SECTION_STATE.failed}
      text={message}
      action={
        <Button
          variant="outline"
          isDisabled={busy}
          accessibilityState={{ busy, disabled: busy }}
          onPress={onRetry}
        >
          {busy && <ButtonSpinner />}
          <ButtonText>{SECTION_STATE.retry}</ButtonText>
        </Button>
      }
    />
  );
}
