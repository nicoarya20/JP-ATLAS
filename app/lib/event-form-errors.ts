/**
 * Maps a refused `POST /events` to what the form shows: one actionable sentence on top and a message
 * on the field that caused it. Codes come from the server's error catalog (`server/pm/errors.ts`).
 */

import type { EventFieldErrors, EventFormValues } from './event-form';
import { EVENT_FORM_COPY as C } from './event-form.copy';
import { ApiError, describeApiError } from './http';

export type SaveFailure = { message: string; fields: EventFieldErrors };

/** Body keys (`issues[].path` is "/startsAt") whose form field has another name. */
const PATH_FIELD: Record<string, keyof EventFormValues> = {
  title: 'title',
  startsAt: 'startTime',
  endsAt: 'endTime',
  projectId: 'projectId',
  participantIds: 'participantIds',
  kind: 'kind',
  locationText: 'location',
  meetingUrl: 'meetingUrl',
  agenda: 'agenda',
  remindersMinutes: 'reminders',
};

/**
 * Service refusals arrive as one sentence without a path. These are the sentences of
 * `EVENT_WRITE_MESSAGES` in `server/event/events.validate.ts` (that file opens the database, so the
 * browser bundle cannot import it); `tests/app/event-form.test.tsx` fails if they drift apart.
 */
export const SERVICE_MESSAGE_FIELD: Record<string, keyof EventFormValues> = {
  'Jam selesai harus setelah jam mulai.': 'endTime',
  'Jam mulai dan jam selesai wajib diisi.': 'startTime',
  'Ada peserta yang tidak ditemukan atau belum disetujui.': 'participantIds',
};
const BAD_INSTANT = /^Nilai (jam mulai|jam selesai) bukan tanggal yang sah\.$/;

const only = (field: keyof EventFormValues, message: string): SaveFailure => ({
  message,
  fields: { [field]: message },
});

function refusedFields(err: ApiError): EventFieldErrors {
  const fields: EventFieldErrors = {};
  for (const issue of err.issues ?? []) {
    const field = PATH_FIELD[issue.path.replace(/^\//, '').split('/')[0] ?? ''];
    if (field && !fields[field]) fields[field] = C.fieldInvalid;
  }
  const byMessage = SERVICE_MESSAGE_FIELD[err.message];
  if (byMessage) fields[byMessage] = err.message;
  const bad = BAD_INSTANT.exec(err.message);
  if (bad) fields[bad[1] === 'jam mulai' ? 'startTime' : 'endTime'] = err.message;
  return fields;
}

/** `hasProject`: a 404 on a create can only mean the picked project is hidden or gone. */
export function describeEventSaveError(err: unknown, hasProject: boolean): SaveFailure {
  if (err instanceof ApiError) {
    if (err.code === 'NOT_MEMBER') return only('projectId', C.notMember);
    if (err.code === 'PROJECT_IN_TRASH') return only('projectId', C.projectInTrash);
    if (err.code === 'NOT_FOUND' && hasProject) return only('projectId', C.projectMissing);
    if (err.status === 422) {
      const fields = refusedFields(err);
      if (Object.keys(fields).length > 0) {
        const sentence = Object.values(fields).find((m) => m !== C.fieldInvalid);
        return { message: sentence ?? C.checkFields, fields };
      }
    }
  }
  return { message: describeApiError(err), fields: {} };
}
