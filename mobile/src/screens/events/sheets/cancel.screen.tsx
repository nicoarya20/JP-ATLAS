// Events ⑩ / ⑩b Cancel event (prototype events.sheets.jsx CancelSheet / CancelRecurringSheet): a required reason, and
// for a recurring event "Which one?" (this occurrence by default). The event stays listed, marked Canceled with the
// reason; "Also create a replacement event" goes on to New event.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Field } from '@/components/form/field';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Text } from '@/components/ui/text';
import { type EventItem, eventDate, eventStart } from '@/data/events.shared';
import { cancelEvent, findEvent } from '@/data/events.store';
import { me } from '@/data/people';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { SHEETS } from '../events.strings';
import { CheckRow, Note } from '../parts/event-parts';
import { SheetMissing, SheetPair } from './sheet-pair';
import { WhichOne } from './which-one';

const ONLY_THIS = 0;

const subOf = (e: EventItem) =>
  e.repeat
    ? `${e.title} · ${e.repeat} · ${eventDate(e)} · ${eventStart(e)}`
    : `${e.title} · ${eventDate(e)}, ${eventStart(e)}`;

/** The cancel sheet of the event in the route param `id`. */
export function CancelEventScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const notice = useNotice();
  const [reason, setReason] = useState('');
  const [replace, setReplace] = useState(false);
  const [which, setWhich] = useState(ONLY_THIS);
  const e = findEvent(id);
  if (!e) return <SheetMissing />;
  const cancel = () => {
    cancelEvent(e.id, reason.trim(), me(role).name, { once: !!e.repeat && which === ONLY_THIS });
    notice(SHEETS.canceled);
    router.back();
    if (replace) router.push('/events/new');
  };
  const reasonField = (
    <Field
      label={SHEETS.reason}
      required
      multiline
      value={reason}
      placeholder={SHEETS.reasonPlaceholder}
      onChangeText={setReason}
    />
  );
  return (
    <SheetFrame
      testID="event-cancel"
      title={e.repeat ? SHEETS.cancelRecurringTitle : SHEETS.cancelTitle}
      sub={subOf(e)}
      actions={
        <SheetPair
          back={SHEETS.back}
          primary={SHEETS.cancelEvent}
          ok={!!reason.trim()}
          onPress={cancel}
        />
      }
    >
      {e.repeat ? (
        <>
          <WhichOne options={SHEETS.cancelWhich} value={which} onChange={setWhich} />
          {reasonField}
        </>
      ) : (
        <>
          <Text className="text-subhead text-foreground">
            {SHEETS.cancelLead(e.attendees.join(', '))}
          </Text>
          {reasonField}
          <Note>{SHEETS.reasonNote}</Note>
          <CheckRow label={SHEETS.replacement} value={replace} onChange={setReplace} />
        </>
      )}
    </SheetFrame>
  );
}
