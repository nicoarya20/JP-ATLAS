/**
 * What `/api/app/events*` sends and takes (`server/event/events.dto.ts`, `server/api/app-events.schema.ts`), as the
 * app reads it. Times are ISO instants: shown through `instant.ts` in the team zone, never UTC or the phone's zone.
 */
import type { ProjectStatusWire } from './projects.wire';
import type { CapValueWire } from './tasks.wire';

export type EventKindWire = 'meeting' | 'review' | 'important' | 'team' | 'other';
export type LocationTypeWire = 'offline' | 'online';
export type NoteStatusWire = 'draft' | 'confirmed';

/** `true` = enabled; a code = shown disabled with that reason (`caps.messages.ts`); absent = hidden. */
export type EventCapsWire = Partial<
  Record<'update' | 'cancel' | 'trash' | 'manageParticipants' | 'writeNote', CapValueWire>
>;

/** A person as an event shows them: id and name only (no email, no phone). */
export type PersonRefWire = { id: string; name: string };

export type EventProjectWire = { id: string; name: string; status: ProjectStatusWire };

/** One row of `GET /events`. */
export type EventListItemWire = {
  id: string;
  title: string;
  kind: EventKindWire;
  startsAt: string;
  endsAt: string;
  locationType: LocationTypeWire | null;
  locationText: string | null;
  meetingUrl: string | null;
  /** Null: a personal event, seen by its creator and guests only. */
  project: EventProjectWire | null;
  canceledAt: string | null;
  cancelReason: string | null;
  participants: { total: number; isParticipant: boolean };
  noteStatus: NoteStatusWire | null;
  can: EventCapsWire;
};

/** A page of `GET /events` (the list, or one window of the calendar). */
export type EventsPageWire = {
  items: EventListItemWire[];
  nextCursor: string | null;
  caps: { createEvent: boolean };
};

/** `GET /events/:id`, and the answer of every write on one event. */
export type EventDetailWire = Omit<EventListItemWire, 'participants'> & {
  agenda: string | null;
  remindersMinutes: number[];
  creator: PersonRefWire | null;
  canceledBy: PersonRefWire | null;
  participants: PersonRefWire[];
  note: { body: string; status: NoteStatusWire; updatedAt: string } | null;
  createdAt: string;
  updatedAt: string;
};

/** A guest candidate of `GET /events/people`. */
export type EventPersonWire = {
  id: string;
  name: string;
  jobTitle: string | null;
  image: string | null;
};

/** The optional fields `POST /events` and `PATCH /events/:id` share. */
export type EventDetailsBody = {
  kind?: EventKindWire;
  locationType?: LocationTypeWire | null;
  locationText?: string | null;
  meetingUrl?: string | null;
  agenda?: string | null;
  remindersMinutes?: number[];
};

/** `POST /events`; the creator is always a guest, whether listed or not. */
export type CreateEventBody = EventDetailsBody & {
  title: string;
  startsAt: string;
  endsAt: string;
  projectId: string | null;
  /** Left out when there is nobody to add: the server takes one guest or more. */
  participantIds?: string[];
};

/** `PATCH /events/:id`: a key left out stays as it is; the project and the guests have no place here. */
export type UpdateEventBody = EventDetailsBody & {
  title?: string;
  startsAt?: string;
  endsAt?: string;
};

// Limits of the server's schema (`events.dto.ts`); a longer value is refused there, so the form stops at them.
export const EVENT_TITLE_MAX = 150;
export const EVENT_LOCATION_TEXT_MAX = 200;
export const EVENT_MEETING_URL_MAX = 500;
export const EVENT_AGENDA_MAX = 5000;
export const EVENT_CANCEL_REASON_MAX = 500;
export const EVENT_SEARCH_MAX = 100;
/** What a new event gets when the form sends no reminders: a day before and half an hour before. */
export const DEFAULT_REMINDERS: readonly number[] = [1440, 30];
