/**
 * Pure side of the event form (S7 E-10): its values, the client checks that mirror the route schema,
 * the mapping to the `POST /events` body, and the one `saveEvent` call the form makes. Limits are the
 * server's (`events.dto.ts`); the date and clock times are read in the team zone (`events-time.ts`).
 */
import {
  EVENT_AGENDA_MAX,
  EVENT_LOCATION_TEXT_MAX,
  EVENT_MEETING_URL_MAX,
  EVENT_PARTICIPANTS_MAX,
  EVENT_TITLE_MAX,
} from '@server/event/events.dto';
import { EVENT_REMINDER_OFFSETS_MIN, type EventKind } from '@server/pm/enums';
import { EVENT_FORM_COPY as C } from './event-form.copy';
import { describeEventSaveError } from './event-form-errors';
import { type CreateEventBody, createEvent, type GuestCandidate } from './events-api';
import { timeToMinutes, zonedInstant } from './events-time';

/** One choice of the Proyek select. */
export type ProjectOption = { value: string; label: string };

export type EventFormValues = {
  title: string;
  /** `YYYY-MM-DD` in the team zone, or null while nothing is picked. */
  date: string | null;
  /** `HH:mm`, or empty while nothing is typed. */
  startTime: string;
  endTime: string;
  location: string;
  participantIds: string[];
  // Stage 2 ("Tambahkan rincian"); the defaults are what the server would apply anyway.
  kind: EventKind;
  projectId: string | null;
  agenda: string;
  meetingUrl: string;
  /** Minutes before the start, from `EVENT_REMINDER_OFFSETS_MIN`. */
  reminders: number[];
};

/** Field messages keyed by form field, from the client checks or a refused save. */
export type EventFieldErrors = Partial<Record<keyof EventFormValues, string>>;

/** Fields that live behind "Tambahkan rincian"; an error on one of them opens that part. */
const DETAIL_FIELDS = ['kind', 'projectId', 'agenda', 'meetingUrl', 'reminders'] as const;
export const hasDetailError = (errors: EventFieldErrors): boolean =>
  DETAIL_FIELDS.some((f) => errors[f] !== undefined);

/** Length of the event when the end time is left for the form to fill in after the start time. */
export const DEFAULT_DURATION_MINUTES = 60;

/** A blank event on the server's `today`, with the stage-2 defaults the server applies as well. */
export const newEventValues = (today: string): EventFormValues => ({
  title: '',
  date: today,
  startTime: '',
  endTime: '',
  location: '',
  participantIds: [],
  kind: 'meeting',
  projectId: null,
  agenda: '',
  meetingUrl: '',
  reminders: [...EVENT_REMINDER_OFFSETS_MIN],
});

/** Whether `text` is an http(s) link; a `javascript:` or bare word would be rendered as a link later. */
function isWebUrl(text: string): boolean {
  try {
    const { protocol } = new URL(text);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    // `new URL` throws on anything that is not an absolute URL; that is the "not a link" answer here.
    return false;
  }
}

/** Client checks mirror the route schema; the server stays the judge (guests, project, access). */
export function validateEvent(v: EventFormValues, timeZone: string): EventFieldErrors {
  const errors: EventFieldErrors = {};
  const title = v.title.trim();
  if (!title) errors.title = C.titleRequired;
  else if (title.length > EVENT_TITLE_MAX) errors.title = C.titleTooLong(EVENT_TITLE_MAX);

  const start = timeToMinutes(v.startTime);
  const end = timeToMinutes(v.endTime);
  if (!v.date) errors.date = C.dateRequired;
  if (start === null) errors.startTime = C.startRequired;
  if (end === null) errors.endTime = C.endRequired;
  else if (start !== null && end <= start) errors.endTime = C.endBeforeStart;
  if (v.date && start !== null && zonedInstant(v.date, v.startTime, timeZone) === null)
    errors.date = C.badTime;

  if (v.location.trim().length > EVENT_LOCATION_TEXT_MAX)
    errors.location = C.locationTooLong(EVENT_LOCATION_TEXT_MAX);
  if (v.participantIds.length > EVENT_PARTICIPANTS_MAX)
    errors.participantIds = C.participantsTooMany(EVENT_PARTICIPANTS_MAX);
  if (v.agenda.trim().length > EVENT_AGENDA_MAX) errors.agenda = C.agendaTooLong(EVENT_AGENDA_MAX);
  const url = v.meetingUrl.trim();
  if (url.length > EVENT_MEETING_URL_MAX)
    errors.meetingUrl = C.meetingUrlTooLong(EVENT_MEETING_URL_MAX);
  else if (url && !isWebUrl(url)) errors.meetingUrl = C.meetingUrlBad;
  return errors;
}

/** Form values to the POST body; blanks are left out so the server applies its defaults. Null when the date or time is unusable. */
export function toCreateEventBody(v: EventFormValues, timeZone: string): CreateEventBody | null {
  const startsAt = v.date ? zonedInstant(v.date, v.startTime, timeZone) : null;
  const endsAt = v.date ? zonedInstant(v.date, v.endTime, timeZone) : null;
  if (!startsAt || !endsAt) return null;
  const location = v.location.trim();
  const meetingUrl = v.meetingUrl.trim();
  const agenda = v.agenda.trim();
  return {
    title: v.title.trim(),
    startsAt,
    endsAt,
    kind: v.kind,
    remindersMinutes: [...v.reminders].sort((a, b) => b - a),
    ...(v.projectId ? { projectId: v.projectId } : {}),
    ...(v.participantIds.length ? { participantIds: v.participantIds } : {}),
    // A link makes it an online event; a written place alone is a meeting in person.
    ...(meetingUrl || location
      ? { locationType: meetingUrl ? ('online' as const) : ('offline' as const) }
      : {}),
    ...(location ? { locationText: location } : {}),
    ...(meetingUrl ? { meetingUrl } : {}),
    ...(agenda ? { agenda } : {}),
  };
}

/** What a save came to: the new event's id, or the sentence and the fields to show. */
export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; message: string; fields: EventFieldErrors };

/** Checks, creates and maps a refusal back to fields; never throws. `create` is injectable for tests. */
export async function saveEvent(
  v: EventFormValues,
  timeZone: string,
  create: typeof createEvent = createEvent,
): Promise<SaveResult> {
  const fields = validateEvent(v, timeZone);
  const body = toCreateEventBody(v, timeZone);
  if (Object.keys(fields).length > 0 || !body) return { ok: false, message: C.checkFields, fields };
  try {
    return { ok: true, id: (await create(body)).id };
  } catch (err) {
    return { ok: false, ...describeEventSaveError(err, v.projectId !== null) };
  }
}

/** Guests of the chosen project first, then everyone else once; a person never appears twice. */
export function mergeSuggestions(
  first: readonly GuestCandidate[],
  rest: readonly GuestCandidate[],
): GuestCandidate[] {
  const seen = new Set(first.map((p) => p.id));
  return [...first, ...rest.filter((p) => !seen.has(p.id))];
}
