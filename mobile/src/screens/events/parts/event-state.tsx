// What an Events screen shows while the server has not answered, and when it would not. Built on
// the shared EmptyState (UX §4) rather than a loading dialect of its own, so the Events screens
// read the same as every other list in the app.
import { CalendarX, CloudOff } from 'lucide-react-native';

import { EmptyState } from '@/components/state/empty-state';
import { Button, ButtonText } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { VStack } from '@/components/ui/vstack';

import { STATE } from '../events.strings';

/** Spinner with a line under it: the first read of a screen, before anything can be drawn. */
export function EventsLoading({ testID = 'events-loading' }: { testID?: string }) {
  return (
    <VStack testID={testID} className="items-center gap-3 px-6 py-8">
      <Spinner accessibilityLabel={STATE.loading} />
    </VStack>
  );
}

/**
 * The read failed. The message is the server's own when it has one (in Indonesian, shown as it
 * came — K5); a request that never arrived says so in the app's own words and offers Try again.
 */
export function EventsFailed({
  message,
  onRetry,
  testID = 'events-failed',
}: {
  message?: string;
  onRetry: () => void;
  testID?: string;
}) {
  return (
    <EmptyState
      testID={testID}
      icon={CloudOff}
      iconLabel={STATE.failedIcon}
      title={STATE.failedTitle}
      text={message}
      action={
        <Button onPress={onRetry}>
          <ButtonText>{STATE.retry}</ButtonText>
        </Button>
      }
    />
  );
}

/** An event id the server will not give us (gone, or never visible to this account). */
export function EventGone({ testID = 'event-gone' }: { testID?: string }) {
  return (
    <EmptyState
      testID={testID}
      icon={CalendarX}
      iconLabel={STATE.goneIcon}
      title={STATE.goneTitle}
      text={STATE.goneText}
    />
  );
}
