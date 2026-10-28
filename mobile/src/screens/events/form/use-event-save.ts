// Save of the event form: a new event is created and opened; an edit sends only what changed, then the guests who
// join and those who leave. Busy while it runs, and why it failed stays on the form (UX §2–§3). Taking guests off
// is confirmed first (T2): they stop seeing the event.
import { router } from 'expo-router';

import { useConfirmAction } from '@/components/confirm/use-confirm-action';
import { useNotice } from '@/components/notice/use-notice';
import { writeError } from '@/components/state/write-error';
import { teamTimeZone } from '@/data/clock';
import { createBody, type EventForm, guestChange, updateBody } from '@/data/events.form';
import { createEvent, saveEvent } from '@/data/events.write';

import { FORM } from '../events.strings';

/** `{ busy, error, run, leaving }`: `leaving` names the guests an edit takes off (empty on a new event). */
export function useEventSave(id: string | undefined, was: EventForm, now: EventForm) {
  const notice = useNotice();
  const change = id ? guestChange(was.guests, now.guests) : null;
  const save = async () => {
    const timeZone = teamTimeZone();
    if (!id || !change) {
      const made = await createEvent(createBody(now, timeZone));
      router.back();
      notice(FORM.saved);
      router.push(`/events/${made.id}`);
      return;
    }
    await saveEvent(id, updateBody(was, now, timeZone), change);
    router.back();
    notice(FORM.updated);
  };
  const action = useConfirmAction(save, () => undefined, writeError);
  const leaving = change ? was.guests.filter((g) => change.remove.includes(g.id)) : [];
  return { ...action, save, leaving };
}
