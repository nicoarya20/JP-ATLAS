/**
 * Event form (S7 E-10): owns the values, the stage, the write and the way out. After a save
 * it releases the unsaved-changes guard first and only then goes to the event, as the task form
 * does, or the leave would be asked about again.
 *
 * Two modes. Without `eventId` it creates (`POST /events`). With one it changes that event
 * (`PATCH /events/:id`) and `locked` reads out the project and the guests the route refuses to
 * take; stage 2 opens straight away then, because an edit is as likely to be about the agenda or
 * the reminders as about the time.
 */
import { useForm } from '@mantine/form';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { notify } from '~/components/ui/notify';
import {
  type EventFormValues,
  hasDetailError,
  type ProjectOption,
  saveEvent,
  validateEvent,
} from '~/lib/event-form';
import { EVENT_FORM_COPY as COPY } from '~/lib/event-form.copy';
import { saveEventChanges } from '~/lib/event-form.edit';
import { eventHref, eventKeys } from '~/lib/events-api';
import { useUnsavedGuard } from '~/lib/use-unsaved-guard';
import type { EventFormLocked } from './EventFormLocked';
import { EventFormView } from './EventFormView';

type Props = {
  initial: EventFormValues;
  projects: readonly ProjectOption[];
  /** The team zone (`APP_TIME_ZONE`) the typed date and times are read in. */
  timeZone: string;
  cancelTo: string;
  /** Edit mode: the event being changed. Absent means a new event is being created. */
  eventId?: string;
  /** Edit mode: what to read out where the project select and the guest picker would be. */
  locked?: EventFormLocked;
};

export function EventForm({ initial, projects, timeZone, cancelTo, eventId, locked }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [more, setMore] = useState(eventId !== undefined);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  // Fields with their own rule are checked when the user leaves them; the time pair waits for Simpan,
  // so tabbing past an empty end time does not shout before the start time is typed.
  const form = useForm<EventFormValues>({
    initialValues: initial,
    validate: (v) => validateEvent(v, timeZone),
    validateInputOnBlur: ['title', 'location', 'meetingUrl'],
  });
  useUnsavedGuard(savedId === null && form.isDirty());

  useEffect(() => {
    if (savedId) navigate(eventHref(savedId));
  }, [savedId, navigate]);

  const submit = form.onSubmit(
    async (values) => {
      setSaving(true);
      setServerError(null);
      const res = eventId
        ? await saveEventChanges(eventId, values, timeZone)
        : await saveEvent(values, timeZone);
      if (res.ok) {
        // `saving` stays on until the page leaves, so the button cannot be pressed twice meanwhile.
        const title = values.title.trim();
        notify.success(eventId ? COPY.savedEdit(title) : COPY.saved(title));
        void queryClient.invalidateQueries({ queryKey: eventKeys.all });
        setSavedId(res.id);
        return;
      }
      setSaving(false);
      form.setErrors(res.fields);
      setServerError(res.message);
      // A refused field may sit in the folded part; open it so the message is seen.
      if (hasDetailError(res.fields)) setMore(true);
    },
    (errors) => {
      if (hasDetailError(errors)) setMore(true);
    },
  );

  return (
    <EventFormView
      form={form}
      projects={projects}
      more={more}
      onToggleMore={() => setMore((open) => !open)}
      saving={saving}
      serverError={serverError}
      cancelTo={cancelTo}
      locked={locked}
      onSubmit={submit}
    />
  );
}
