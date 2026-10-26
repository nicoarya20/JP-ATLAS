// Events ⑩ Cancel event (prototype events.sheets.jsx CancelSheet): a required reason. The event
// stays listed, marked Canceled with the reason every guest reads on its banner; "Also create a
// replacement event" goes on to New event.
//
// The "Which one?" variant of a recurring event is gone: cancelling a single occurrence needs both
// recurrence and a `scope` on the cancel route, and the API has neither (GAP-A4/A5). Who may cancel
// is `can.cancel` — the server refuses it while impersonating, and it is not asked twice here.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Field } from '@/components/form/field';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Text } from '@/components/ui/text';
import { getEventDetail } from '@/data/events';
import { cancelEvent, eventDetailResource } from '@/data/events.api';
import { eventDate } from '@/data/events.shared';
import { EVENT_CANCEL_REASON_MAX } from '@/data/events.wire';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { SHEETS } from '../events.strings';
import { CheckRow, Note } from '../parts/event-parts';
import { SheetBusy, SheetMissing, SheetPair } from './sheet-pair';

/** The cancel sheet of the event in the route param `id`. */
export function CancelEventScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const notice = useNotice();
  const [reason, setReason] = useState('');
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const resource = eventDetailResource(id);
  const state = resource.use();
  useEffect(() => {
    void resource.ensure();
  }, [resource]);
  const d = getEventDetail(role, id);
  if (!d) return state.phase === 'failed' ? <SheetMissing /> : <SheetBusy />;
  const e = d.event;
  const allowed = d.menu.some((m) => m.action === 'cancel' && m.enabled);
  const blocked = d.menu.find((m) => m.action === 'cancel')?.reason ?? null;

  const cancel = async () => {
    setBusy(true);
    try {
      await cancelEvent(e.id, reason.trim());
      notice(SHEETS.canceled);
      router.back();
      if (replace) router.push('/events/new');
    } catch (failure) {
      // The server's own message, in Indonesian, shown as it came (K5).
      notice(failure instanceof Error ? failure.message : SHEETS.cancelFailed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <SheetFrame
      testID="event-cancel"
      title={SHEETS.cancelTitle}
      sub={`${e.title} · ${eventDate(e)}, ${e.time}`}
      actions={
        <SheetPair
          back={SHEETS.back}
          primary={busy ? SHEETS.canceling : SHEETS.cancelEvent}
          ok={!!reason.trim() && allowed && !busy}
          onPress={() => {
            void cancel();
          }}
        />
      }
    >
      <Text className="text-subhead text-foreground">
        {SHEETS.cancelLead(e.attendees.join(', '))}
      </Text>
      <Field
        label={SHEETS.reason}
        required
        multiline
        value={reason}
        placeholder={SHEETS.reasonPlaceholder}
        // The server's own limit; refused here rather than sent and answered with a 422.
        onChangeText={(text) => setReason(text.slice(0, EVENT_CANCEL_REASON_MAX))}
      />
      <Note>{SHEETS.reasonNote}</Note>
      {blocked && <Note>{blocked}</Note>}
      <CheckRow label={SHEETS.replacement} value={replace} onChange={setReplace} />
    </SheetFrame>
  );
}
