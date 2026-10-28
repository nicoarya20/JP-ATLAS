// Events ⑩ Cancel event (prototype events.sheets.jsx CancelSheet, T2), from the detail ⋯ for whoever the server lets
// cancel it (`can.cancel`): a required reason, which the banner and every guest's notification show. The event stays
// listed, marked Canceled; "Also create a replacement event" goes on to New event. A refusal stays on the sheet.
// Recurring events ("Which one?") wait for the server's series (E-2).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useConfirmAction } from '@/components/confirm/use-confirm-action';
import { Field } from '@/components/form/field';
import { FormError } from '@/components/form/form-error';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Text } from '@/components/ui/text';
import { eventDetailOf } from '@/data/events.detail';
import { EVENT_CANCEL_REASON_MAX, type EventDetailWire } from '@/data/events.wire';
import { cancelEvent } from '@/data/events.write';
import { writeError } from '@/screens/projects/parts/write-run';

import { SHEETS } from '../events.strings';
import { EventGate } from '../parts/event-gate';
import { CheckRow, Note } from '../parts/event-parts';
import { SheetPair } from './sheet-pair';

function Cancel({ e }: { e: EventDetailWire }) {
  const notice = useNotice();
  const [reason, setReason] = useState('');
  const [replace, setReplace] = useState(false);
  const d = eventDetailOf(e);
  const done = () => {
    notice(SHEETS.canceled);
    router.back();
    if (replace) router.push('/events/new');
  };
  const { busy, error, run } = useConfirmAction(
    () => cancelEvent(e.id, reason.trim()).then(() => undefined),
    done,
    writeError,
  );
  return (
    <SheetFrame
      testID="event-cancel"
      title={SHEETS.cancelTitle}
      sub={`${d.title} · ${d.time}`}
      actions={
        <SheetPair
          back={SHEETS.back}
          primary={SHEETS.cancelEvent}
          ok={!!reason.trim()}
          busy={busy}
          onPress={() => void run()}
        />
      }
    >
      <Text className="text-subhead text-foreground">
        {SHEETS.cancelLead(d.guests.map((g) => g.name).join(', '))}
      </Text>
      <Field
        label={SHEETS.reason}
        required
        multiline
        value={reason}
        placeholder={SHEETS.reasonPlaceholder}
        onChangeText={(t) => setReason(t.slice(0, EVENT_CANCEL_REASON_MAX))}
        disabled={busy}
        testID="cancel-reason"
      />
      <Note>{SHEETS.reasonNote}</Note>
      <CheckRow label={SHEETS.replacement} value={replace} onChange={setReplace} />
      {error && <FormError testID="cancel-error">{error}</FormError>}
    </SheetFrame>
  );
}

/** The cancel sheet of the event in the route param `id`; anyone it is not offered to goes back to it. */
export function CancelEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <EventGate id={id} allowed={(e) => e.can.cancel === true && !e.canceledAt}>
      {(e) => <Cancel e={e} />}
    </EventGate>
  );
}
