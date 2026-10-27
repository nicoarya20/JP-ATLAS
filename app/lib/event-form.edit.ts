/**
 * Edit side of the event form: an `EventDetail` read back into form values, the mapping to the
 * `PATCH /events/:id` body, and the one save call the form makes in edit mode. It is a file of its
 * own because `event-form.ts` (the create side plus the shared checks) is already at its size
 * budget; the checks, the values type and the error mapping are imported from there.
 */
import {
  type EventFormValues,
  type SaveResult,
  toCreateEventBody,
  validateEvent,
} from './event-form';
import { EVENT_FORM_COPY as C } from './event-form.copy';
import { describeEventSaveError } from './event-form-errors';
import { type EventDetail, type UpdateEventBody, updateEvent } from './events-api';
import { zonedParts } from './events-time';

/** An existing event as the form holds it: its date and clock times read in the team zone. */
export function editEventValues(event: EventDetail, timeZone: string): EventFormValues {
  const start = zonedParts(event.startsAt, timeZone);
  const end = zonedParts(event.endsAt, timeZone);
  return {
    title: event.title,
    date: start.date,
    startTime: start.time,
    // An event that ends the next day keeps its clock time; the one date stays the start's (E-10).
    endTime: end.time,
    location: event.locationText ?? '',
    // The guest list is not editable here (the route refuses `participantIds`), so it stays as read.
    participantIds: event.participants.map((p) => p.id),
    kind: event.kind,
    projectId: event.project?.id ?? null,
    agenda: event.agenda ?? '',
    meetingUrl: event.meetingUrl ?? '',
    reminders: [...event.remindersMinutes],
  };
}

/**
 * Form values to the PATCH body. Unlike the create body this sends every editable field, with an
 * emptied one as `null`: a key left out means "keep what is stored", so a cleared place or agenda
 * would otherwise come back. `projectId` and `participantIds` are never sent — the route declares
 * them `t.Never()` and would answer 422.
 */
export function toUpdateEventBody(v: EventFormValues, timeZone: string): UpdateEventBody | null {
  const created = toCreateEventBody(v, timeZone);
  if (!created) return null;
  const location = v.location.trim();
  const meetingUrl = v.meetingUrl.trim();
  const agenda = v.agenda.trim();
  return {
    title: created.title,
    startsAt: created.startsAt,
    endsAt: created.endsAt,
    kind: v.kind,
    remindersMinutes: created.remindersMinutes,
    // A link makes it an online event; a written place alone is a meeting in person; neither clears it.
    locationType: meetingUrl ? 'online' : location ? 'offline' : null,
    locationText: location || null,
    meetingUrl: meetingUrl || null,
    agenda: agenda || null,
  };
}

/** Checks and saves a changed event; maps a refusal back to fields. `update` is injectable for tests. */
export async function saveEventChanges(
  id: string,
  v: EventFormValues,
  timeZone: string,
  update: typeof updateEvent = updateEvent,
): Promise<SaveResult> {
  const fields = validateEvent(v, timeZone);
  const body = toUpdateEventBody(v, timeZone);
  if (Object.keys(fields).length > 0 || !body) return { ok: false, message: C.checkFields, fields };
  try {
    return { ok: true, id: (await update(id, body)).id };
  } catch (err) {
    // The project cannot change here, so a 404 is the event itself, never a project the user picked.
    return { ok: false, ...describeEventSaveError(err, false) };
  }
}
