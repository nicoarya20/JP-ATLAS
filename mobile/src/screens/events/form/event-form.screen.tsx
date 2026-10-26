// Events ③a / ③b New event and the Edit form (prototype events.new.jsx EventForm), a modal over the tabs: the short
// form, "Add more details" (open at once with param details=1 or when editing), Cancel and Save at the bottom. With
// param `event` it edits that event. Save: New opens the new event, Edit goes back to its detail.
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronUp, Plus } from 'lucide-react-native';
import { useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { getEventForm } from '@/data/events';
import { agendaLines, savedFields, validateEvent } from '@/data/events.form';
import { addEvent, type EventFields, editEvent } from '@/data/events.store';
import { me } from '@/data/people';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { FORM } from '../events.strings';
import { EventMissing, EventPage } from '../parts/event-page';
import { Box, Two } from '../parts/event-parts';
import { EventBasics } from './event-basics';
import { EventDetails } from './event-details';

/** The New event / Edit event modal. */
export function EventFormScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { event, details } = useLocalSearchParams<{ event?: string; details?: string }>();
  const form = getEventForm(role, event);
  const [f, setF] = useState<EventFields | undefined>(form?.fields);
  const [agenda, setAgenda] = useState(() => form?.fields.agenda.join('\n') ?? '');
  const [more, setMore] = useState(!!details || !!event);
  const notice = useNotice();
  if (!form || !f) return <EventMissing />;
  const set = (patch: Partial<EventFields>) => setF((x) => x && { ...x, ...patch });
  const { ok } = validateEvent(f);
  const name = me(role).name;
  const save = () => {
    const fields = savedFields({ ...f, agenda: agendaLines(agenda) });
    router.back();
    if (event) {
      editEvent(event, fields, name);
      notice(FORM.updated);
      return;
    }
    const id = addEvent(fields, name);
    notice(FORM.saved);
    router.push(`/events/${id}`);
  };
  const foot = (
    <Two>
      <Button variant="outline" onPress={() => router.back()}>
        <ButtonText>{FORM.cancel}</ButtonText>
      </Button>
      <Button isDisabled={!ok} onPress={save}>
        <ButtonText>{FORM.save}</ButtonText>
      </Button>
    </Two>
  );
  return (
    <EventPage testID="event-form" modal title={event ? FORM.editTitle : FORM.newTitle} foot={foot}>
      <EventBasics f={f} set={set} creator={form.creator} />
      {more ? (
        <>
          <Button variant="link" className="self-start" onPress={() => setMore(false)}>
            <ButtonIcon as={ChevronUp} />
            <ButtonText>{FORM.less}</ButtonText>
          </Button>
          <EventDetails f={f} set={set} agenda={agenda} onAgenda={setAgenda} />
        </>
      ) : (
        <>
          <Box>{FORM.autoSet(f.repeat)}</Box>
          <Button variant="link" className="self-start" onPress={() => setMore(true)}>
            <ButtonIcon as={Plus} />
            <ButtonText>{FORM.more}</ButtonText>
          </Button>
        </>
      )}
    </EventPage>
  );
}
