/**
 * The shapes `/api/app/events*` sends and takes, mirrored from `server/event/events.dto.ts` and
 * `server/api/app-events.schema.ts`. Mobile cannot import `server/`, so these are a hand-kept copy;
 * `__tests__/events/events.wire.test.ts` reads the server files as text and fails when a name or a
 * limit here drifts from them.
 *
 * Nothing in here is a screen shape. The translation into what the Events screens read is
 * `events.map.ts`, and the requests are `events.api.ts`.
 */

/** `server/pm/enums.ts` EVENT_KINDS; the mobile labels for them are in `events.map.ts`. */
export const EVENT_KINDS = ['meeting', 'review', 'important', 'team', 'other'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** Where it happens; `offline` asks for a room, `online` for a link. */
export const EVENT_LOCATION_TYPES = ['offline', 'online'] as const;
export type EventLocationType = (typeof EVENT_LOCATION_TYPES)[number];

/** Minutes are editable while `draft`; `confirmed` is what the guests are told to read. */
export const EVENT_NOTE_STATUSES = ['draft', 'confirmed'] as const;
export type EventNoteStatus = (typeof EVENT_NOTE_STATUSES)[number];

/** A person as an event shows them: id and name only, never an email or a phone number (Q8). */
export type PersonRefWire = { id: string; name: string };

export type ProjectRefWire = { id: string; name: string; status: string };

/** Keys of an event's `can{}` (`EVENT_CAP_KEYS`); `restore` is deliberately not among them. */
export const EVENT_CAP_KEYS = [
  'update',
  'cancel',
  'trash',
  'manageParticipants',
  'writeNote',
] as const;
export type EventCapKey = (typeof EVENT_CAP_KEYS)[number];

/**
 * One capability: `true` = enabled, a deny code = shown but disabled with that reason, and a key
 * that is absent means the control is hidden. Read it through `events.caps.ts`, never directly.
 */
export type CapValue = true | string;

/** Sparse by design: a missing key hides its control (fail closed). */
export type EventCapsWire = Partial<Record<EventCapKey, CapValue>>;

export type EventListItemWire = {
  id: string;
  title: string;
  kind: EventKind;
  /** ISO instants; the team zone turns them into a day and a clock time (K2). */
  startsAt: string;
  endsAt: string;
  locationType: EventLocationType | null;
  locationText: string | null;
  meetingUrl: string | null;
  project: ProjectRefWire | null;
  canceledAt: string | null;
  cancelReason: string | null;
  participants: { total: number; isParticipant: boolean };
  noteStatus: EventNoteStatus | null;
  can: EventCapsWire;
};

export type EventDetailWire = Omit<EventListItemWire, 'participants'> & {
  agenda: string | null;
  remindersMinutes: number[];
  creator: PersonRefWire | null;
  canceledBy: PersonRefWire | null;
  participants: PersonRefWire[];
  note: { body: string; status: EventNoteStatus; updatedAt: string } | null;
  createdAt: string;
  updatedAt: string;
};

/** One page of `GET /events`: the rows, the keyset cursor, and the one list-level capability. */
export type EventsPageWire = {
  items: EventListItemWire[];
  nextCursor: string | null;
  caps: { createEvent: boolean };
};

/** A guest candidate from `GET /events/people`; the picker sends at most `PICKER_LIMIT_MAX`. */
export type PickerPersonWire = { id: string; name: string; jobTitle: string | null };

/** What `DELETE /events/:id` answers: the Trash entry the Undo of the snack restores. */
export type TrashedEventWire = { trash: { kind: string; id: string; label: string } };

/** The fields create and update share; the three at the top are what create insists on. */
type EventWriteFields = {
  title: string;
  startsAt: string;
  endsAt: string;
  kind?: EventKind;
  locationType?: EventLocationType | null;
  locationText?: string | null;
  meetingUrl?: string | null;
  agenda?: string | null;
  remindersMinutes?: number[];
};

/** Body of `POST /events`; `projectId: null` makes it a personal event. */
export type CreateEventBody = EventWriteFields & {
  projectId?: string | null;
  participantIds?: string[];
};

/**
 * Body of `PATCH /events/:id`: every field optional, a key left out stays as it is. `projectId` and
 * `participantIds` are refused by the server (`t.Never()`) — an event cannot change project, and
 * the guest list has routes of its own — so neither is in this type at all.
 */
export type UpdateEventBody = Partial<EventWriteFields>;

// Limits of the write bodies, from `server/event/events.dto.ts`. Kept here so the form can refuse
// what the server would refuse, in the form, rather than sending it and showing a 422.
export const EVENT_TITLE_MAX = 150;
export const EVENT_LOCATION_TEXT_MAX = 200;
export const EVENT_MEETING_URL_MAX = 500;
export const EVENT_AGENDA_MAX = 5_000;
export const EVENT_CANCEL_REASON_MAX = 500;
export const EVENT_PARTICIPANTS_MAX = 100;
/** Widest calendar window one `?from=&to=` may ask for (`EVENT_RANGE_DAYS_MAX`). */
export const EVENT_RANGE_DAYS_MAX = 92;
/** Rows per list page. The web list uses the same number; the server's own maximum is 100. */
export const EVENT_LIST_LIMIT = 30;

/** Default reminder offsets in minutes before the start (`EVENT_REMINDER_OFFSETS_MIN`). */
export const EVENT_REMINDER_OFFSETS_MIN: readonly number[] = [1440, 30];
