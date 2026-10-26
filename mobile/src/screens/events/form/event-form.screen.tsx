// Events ③a / ③b New event and the Edit form (prototype events.new.jsx EventForm), a modal over the
// tabs: the short form, "Add more details" (open at once with param details=1 or when editing),
// Cancel and Save at the bottom. With param `event` it edits that event.
//
// New sends one `POST`. Edit sends a `PATCH` and, when the guest list changed, one call per guest
// added or removed: the server refuses `participantIds` on a `PATCH` (`t.Never()`), so the guest
// routes are the only way. Save shows a spinner while that is in flight and says what happened
// either way (UX §2, §3); a failure leaves the form open with what was typed still in it.
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronUp, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { getEventForm } from '@/data/events';
import {
  addEventGuests,
  createEvent,
  eventDetailResource,
  removeEventGuest,
  updateEvent,
} from '@/data/events.api';
import {
  createBodyOf,
  type EventFormFields,
  guestDiff,
  updateBodyOf,
  validateEvent,
} from '@/data/events.form';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { FORM } from '../events.strings';
import { EventPage } from '../parts/event-page';
import { Box, Note, Two } from '../parts/event-parts';
import { EventGone, EventsFailed, EventsLoading } from '../parts/event-state';
import { EventBasics } from './event-basics';
import { EventDetails } from './event-details';

/** The New event / Edit event modal. */
export function EventFormScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { event, details } = useLocalSearchParams<{ event?: string; details?: string }>();
  // One resource per id; a new event has none, and `ensure()` on a resource already fresh is free.
  const resource = eventDetailResource(event ?? '');
  const state = resource.use();
  useEffect(() => {
    if (event) void resource.ensure();
  }, [event, resource]);

  const form = getEventForm(role, event);
  const [f, setF] = useState<EventFormFields | undefined>(form?.fields);
  const [more, setMore] = useState(!!details || !!event);
  const [saving, setSaving] = useState(false);
  const notice = useNotice();

  // The Edit form opens before its event has been read, so the fields arrive a frame later.
  useEffect(() => {
    if (form && !f) setF(form.fields);
  }, [form, f]);

  if (!form || !f) {
    const body =
      state.phase !== 'failed' ? (
        <EventsLoading />
      ) : state.error?.status === 404 ? (
        <EventGone />
      ) : (
        <EventsFailed
          message={state.error?.message}
          onRetry={() => {
            void resource.reload();
          }}
        />
      );
    return (
      <EventPage testID="event-form" modal title={FORM.editTitle}>
        {body}
      </EventPage>
    );
  }

  const set = (patch: Partial<EventFormFields>) => setF((x) => x && { ...x, ...patch });
  const { ok } = validateEvent(f);

  const save = async () => {
    setSaving(true);
    try {
      if (event) {
        await updateEvent(event, updateBodyOf(f));
        const { add, remove } = guestDiff(form.fields.guests, f.guests);
        for (const userId of add) await addEventGuests(event, [userId]);
        for (const userId of remove) await removeEventGuest(event, userId);
        notice(FORM.updated);
        router.back();
        return;
      }
      const made = await createEvent(createBodyOf(f));
      notice(FORM.saved);
      router.back();
      router.push(`/events/${made.id}`);
    } catch (failure) {
      // The server's own message, in Indonesian, shown as it came (K5); the form stays open.
      notice(failure instanceof Error ? failure.message : FORM.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const foot = (
    <Two>
      <Button variant="outline" isDisabled={saving} onPress={() => router.back()}>
        <ButtonText>{FORM.cancel}</ButtonText>
      </Button>
      <Button
        testID="event-save"
        isDisabled={!ok || saving || form.save !== 'enabled'}
        onPress={() => {
          void save();
        }}
      >
        <ButtonText>{saving ? FORM.saving : FORM.save}</ButtonText>
      </Button>
    </Two>
  );
  return (
    <EventPage testID="event-form" modal title={event ? FORM.editTitle : FORM.newTitle} foot={foot}>
      {form.saveReason && <Note>{form.saveReason}</Note>}
      <EventBasics f={f} set={set} creatorId={form.creatorId} editing={form.editing} />
      {more ? (
        <>
          <Button variant="link" className="self-start" onPress={() => setMore(false)}>
            <ButtonIcon as={ChevronUp} />
            <ButtonText>{FORM.less}</ButtonText>
          </Button>
          <EventDetails f={f} set={set} editing={form.editing} />
        </>
      ) : (
        <>
          <Box>{FORM.autoSet}</Box>
          <Button variant="link" className="self-start" onPress={() => setMore(true)}>
            <ButtonIcon as={Plus} />
            <ButtonText>{FORM.more}</ButtonText>
          </Button>
        </>
      )}
    </EventPage>
  );
}
