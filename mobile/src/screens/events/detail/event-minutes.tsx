// The minutes of an event, as the server keeps them: their state and text, or "None yet". Read-only on the phone: the
// minutes editor (`PUT /events/:id/note`) and the record / outcomes flow are not built (E-1: removed, gap doc).
import { StatusPill } from '@/components/status/status-pill';
import { Text } from '@/components/ui/text';
import { type EventDetailView, NONE_YET } from '@/data/events.detail';

import { DETAIL } from '../events.strings';
import { EvSec, Note } from '../parts/event-parts';

/** The Minutes section. */
export function EventMinutes({ minutes }: { minutes: EventDetailView['minutes'] }) {
  return (
    <EvSec title={DETAIL.minutes} tag={<StatusPill status={minutes?.status ?? NONE_YET} />}>
      {minutes?.body ? (
        <Text testID="event-minutes" className="text-subhead text-foreground">
          {minutes.body}
        </Text>
      ) : (
        <Note>{DETAIL.noMinutes}</Note>
      )}
    </EvSec>
  );
}
