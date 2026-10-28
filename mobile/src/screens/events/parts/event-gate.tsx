// Gate of the event write screens (Edit, Cancel event): their form starts from the event's detail, so it waits for it
// (loading, or failed with "Try again"), and a viewer the event's `can{}` does not let in is sent back to the event.
import { Redirect } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { View } from 'react-native';

import { FailedState, LoadingState } from '@/components/state/section-state';
import { eventResource } from '@/data/events.api';
import type { EventDetailWire } from '@/data/events.wire';

type EventGateProps = {
  id: string;
  /** May this viewer open the screen, by the detail's `can{}`. */
  allowed: (e: EventDetailWire) => boolean;
  children: (e: EventDetailWire) => ReactNode;
};

/** The screen once the detail is in and allows it. */
export function EventGate({ id, allowed, children }: EventGateProps) {
  const res = eventResource(id);
  const state = res.use();
  useEffect(() => {
    void res.ensure();
  }, [res]);
  const e = state.data;
  if (e) return allowed(e) ? children(e) : <Redirect href={`/events/${id}`} />;
  return (
    <View className="flex-1 bg-background px-4 pt-4">
      {state.phase === 'failed' ? (
        <FailedState
          testID="event-gate-failed"
          message={state.error?.message}
          onRetry={() => void res.reload()}
        />
      ) : (
        <LoadingState testID="event-gate-loading" />
      )}
    </View>
  );
}
