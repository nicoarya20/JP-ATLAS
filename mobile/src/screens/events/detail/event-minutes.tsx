// The event's minutes (prototype events.detail.jsx Minutes). What the server has is read here: the
// status pill and, when there are notes, their text.
//
// Writing them is not offered. The prototype's three buttons were Type (which opened the Outcomes
// wizard), Photo and Voice; the recording and outcomes flow has no server side at all (GAP-A8), and
// the one real write that does exist (`PUT /events/:id/note`) needs a plain minutes editor this app
// does not have yet. Showing buttons that cannot finish the job would be worse than saying so.

import { StatusPill } from '@/components/status/status-pill';
import { Text } from '@/components/ui/text';
import type { ServerEventDetail } from '@/data/events.map';

import { DETAIL } from '../events.strings';
import { EvSec, Note } from '../parts/event-parts';

const LABEL = {
  draft: DETAIL.minutesDraft,
  confirmed: DETAIL.minutesConfirmed,
} as const;

/** The Minutes section: its status, then the notes themselves when there are any. */
export function EventMinutes({ event: e }: { event: ServerEventDetail }) {
  const status = e.noteStatus ? LABEL[e.noteStatus] : DETAIL.noneYet;
  return (
    <EvSec title={DETAIL.minutes} tag={<StatusPill status={status} />}>
      {e.note?.body ? (
        <Text testID="event-minutes-body" className="text-subhead text-foreground">
          {e.note.body}
        </Text>
      ) : null}
      <Note>{DETAIL.minutesReadOnly}</Note>
    </EvSec>
  );
}
