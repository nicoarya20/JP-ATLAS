// Events ③a / ③b New event and the Edit form (prototype events.new.jsx EventForm), a modal over the tabs: the short
// form, "Add more details" (open at once with param details=1 or when editing), Cancel and Save at the bottom. With
// param `event` it edits that event, for whoever its `can.update` lets; New event is for whoever whoami's
// `caps.createEvent` lets. Anyone else goes back. Save: New opens the new event, Edit goes back to its detail.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ChevronUp, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ConfirmDialog } from '@/components/confirm/confirm-dialog';
import { FormError } from '@/components/form/form-error';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Button, ButtonIcon, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { teamTimeZone } from '@/data/clock';
import { PERSONAL } from '@/data/events.detail';
import { blankEvent, checkEvent, type EventForm, eventFormOf } from '@/data/events.form';
import { reminderLabel } from '@/data/events.time';
import { DEFAULT_REMINDERS, type EventDetailWire, type PersonRefWire } from '@/data/events.wire';
import { whoamiResource } from '@/data/whoami.api';
import { writeError } from '@/screens/projects/parts/write-run';

import { FORM } from '../events.strings';
import { EventGate } from '../parts/event-gate';
import { EventPage } from '../parts/event-page';
import { Box, Two } from '../parts/event-parts';
import { EventBasics } from './event-basics';
import { EventDetails } from './event-details';
import { EventGuests } from './event-guests';
import { useEventSave } from './use-event-save';

type FormBodyProps = {
  /** The event being edited; undefined for a new one. */
  id?: string;
  was: EventForm;
  creator: PersonRefWire | null;
  reminders: readonly number[];
  lockedProject?: string;
  details: boolean;
};

function FormBody({ id, was, creator, reminders, lockedProject, details }: FormBodyProps) {
  const [f, setF] = useState(was);
  const [more, setMore] = useState(details || !!id);
  const [asking, setAsking] = useState(false);
  const set = (patch: Partial<EventForm>) => setF((x) => ({ ...x, ...patch }));
  const { busy, error, run, save, leaving } = useEventSave(id, was, f);
  const reminder = reminderLabel(reminders);
  const press = () => (leaving.length ? setAsking(true) : void run());
  const foot = (
    <>
      {error && <FormError testID="event-save-error">{error}</FormError>}
      <Two>
        <Button variant="outline" isDisabled={busy} onPress={() => router.back()}>
          <ButtonText>{FORM.cancel}</ButtonText>
        </Button>
        <Button
          testID="event-save"
          isDisabled={!checkEvent(f).ok || busy}
          accessibilityState={{ busy, disabled: !checkEvent(f).ok || busy }}
          onPress={press}
        >
          {busy && <ButtonSpinner />}
          <ButtonText>{FORM.save}</ButtonText>
        </Button>
      </Two>
    </>
  );
  return (
    <EventPage testID="event-form" modal title={id ? FORM.editTitle : FORM.newTitle} foot={foot}>
      <EventBasics f={f} set={set} editing={!!id} />
      <EventGuests f={f} set={set} creator={creator} />
      {more ? (
        <>
          <Button variant="link" className="self-start" onPress={() => setMore(false)}>
            <ButtonIcon as={ChevronUp} />
            <ButtonText>{FORM.less}</ButtonText>
          </Button>
          <EventDetails f={f} set={set} lockedProject={lockedProject} reminder={reminder} />
        </>
      ) : (
        <>
          <Box>{FORM.autoSet(reminder)}</Box>
          <Button variant="link" className="self-start" onPress={() => setMore(true)}>
            <ButtonIcon as={Plus} />
            <ButtonText>{FORM.more}</ButtonText>
          </Button>
        </>
      )}
      <ConfirmDialog
        open={asking}
        onClose={() => setAsking(false)}
        title={FORM.removeTitle(leaving.length)}
        message={FORM.removeMessage(leaving.map((g) => g.name).join(', '))}
        confirmLabel={FORM.removeConfirm}
        onConfirm={save}
        danger
        errorText={writeError}
        testID="event-remove-guests"
      />
    </EventPage>
  );
}

function EditForm({ e, details }: { e: EventDetailWire; details: boolean }) {
  return (
    <FormBody
      id={e.id}
      was={eventFormOf(e, teamTimeZone())}
      creator={e.creator}
      reminders={e.remindersMinutes}
      lockedProject={e.project?.name ?? PERSONAL}
      details={details}
    />
  );
}

/** New event, once whoami says this viewer may create one. */
function NewForm({ details }: { details: boolean }) {
  const state = whoamiResource.use();
  useEffect(() => {
    void whoamiResource.ensure();
  }, []);
  const me = state.data;
  if (!me) {
    return (
      <View className="flex-1 bg-background px-4 pt-4">
        {state.phase === 'failed' ? (
          <FailedState
            testID="event-form-failed"
            message={state.error?.message}
            onRetry={() => void whoamiResource.reload()}
          />
        ) : (
          <LoadingState testID="event-form-loading" />
        )}
      </View>
    );
  }
  if (!me.caps.createEvent) return <Redirect href="/events" />;
  return (
    <FormBody
      was={blankEvent()}
      creator={{ id: me.userId, name: me.name }}
      reminders={DEFAULT_REMINDERS}
      details={details}
    />
  );
}

/** The New event / Edit event modal. */
export function EventFormScreen() {
  const { event, details } = useLocalSearchParams<{ event?: string; details?: string }>();
  if (!event) return <NewForm details={!!details} />;
  return (
    <EventGate id={event} allowed={(e) => e.can.update === true && !e.canceledAt}>
      {(e) => <EditForm e={e} details={!!details} />}
    </EventGate>
  );
}
