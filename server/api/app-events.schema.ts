/**
 * Request schemas of the event routes (S7 E-06). Every limit comes from `event/events.dto.ts`, the
 * same constants the form will read, so a field can never accept more than the service stores.
 * Bodies are closed (`additionalProperties: false`): a key Elysia does not know is dropped before
 * the handler runs, and the Could-class fields (E-13 outcomes, E-16 recurrence) answer 422 instead,
 * so a client written against a later slice fails loudly rather than silently losing data.
 */
import { t } from 'elysia';
import {
  EVENT_AGENDA_MAX,
  EVENT_CANCEL_REASON_MAX,
  EVENT_LOCATION_TEXT_MAX,
  EVENT_MEETING_URL_MAX,
  EVENT_NOTE_BODY_MAX,
  EVENT_PARTICIPANTS_MAX,
  EVENT_REMINDER_MINUTES_MAX,
  EVENT_REMINDERS_MAX,
  EVENT_SEARCH_MAX,
  EVENT_TABS,
  EVENT_TITLE_MAX,
} from '../event/events.dto';
import { EVENT_KINDS, EVENT_LOCATION_TYPES, EVENT_NOTE_STATUSES } from '../pm/enums';
import { CursorQuery, oneOf } from './app-common';

// Mirrors `app-tasks.schema.ts`: each route module decodes its own query, so neither module's
// filters can change under the other.
/** One value or several (`?kind=meeting&kind=review`); the query layer takes arrays. */
const many = <const T extends string>(values: readonly T[]) =>
  t.Optional(t.Union([oneOf(values), t.Array(oneOf(values), { minItems: 1 })]));

export const asList = <T>(v: T | T[] | undefined): T[] | undefined =>
  v === undefined ? undefined : Array.isArray(v) ? v : [v];

/** Row id in a path or a body (`crypto.randomUUID()` text, never numeric). */
export const Id = t.String({ minLength: 1 });

/** Path of the guest routes: the event, and the person being removed from its list. */
export const ParticipantParams = t.Object({ id: Id, userId: Id });

/** An ISO instant from the client; the service parses it and refuses an unusable one with 422. */
const Instant = t.String({ format: 'date-time', minLength: 1 });

/** Length of a `YYYY-MM-DD` day, so a huge `?from=` is dropped before it reaches the parser. */
const ISO_DAY_LENGTH = 10;

const Title = t.String({ minLength: 1, maxLength: EVENT_TITLE_MAX });
const Kind = oneOf(EVENT_KINDS);
const LocationType = t.Nullable(oneOf(EVENT_LOCATION_TYPES));
const LocationText = t.Nullable(t.String({ maxLength: EVENT_LOCATION_TEXT_MAX }));
const MeetingUrl = t.Nullable(t.String({ maxLength: EVENT_MEETING_URL_MAX }));
const Agenda = t.Nullable(t.String({ maxLength: EVENT_AGENDA_MAX }));
const Reminders = t.Array(t.Integer({ minimum: 0, maximum: EVENT_REMINDER_MINUTES_MAX }), {
  maxItems: EVENT_REMINDERS_MAX,
});
const Guests = t.Array(Id, { minItems: 1, maxItems: EVENT_PARTICIPANTS_MAX });

/** Fields that belong to the Could-class slices (E-13 outcomes, E-16 series): present = 422. */
const LATER = {
  seriesId: t.Optional(t.Never()),
  recurrence: t.Optional(t.Never()),
  outcomes: t.Optional(t.Never()),
};

/** The optional fields create and update share; stage 2 of the form fills them, or nobody does. */
const DETAILS = {
  kind: t.Optional(Kind),
  locationType: t.Optional(LocationType),
  locationText: t.Optional(LocationText),
  meetingUrl: t.Optional(MeetingUrl),
  agenda: t.Optional(Agenda),
  remindersMinutes: t.Optional(Reminders),
};

/**
 * Query of `GET /events`. `from`/`to` are the optional calendar window of A9: both or neither, and
 * `parseEventRange` in the handler decides their width and order, so the message a too-wide range
 * gets is the uniform 422 the rest of the API speaks rather than a schema hint.
 */
export const ListQuery = t.Object({
  ...CursorQuery.properties,
  tab: t.Optional(oneOf(EVENT_TABS)),
  kind: many(EVENT_KINDS),
  projectId: t.Optional(Id),
  q: t.Optional(t.String({ maxLength: EVENT_SEARCH_MAX })),
  from: t.Optional(t.String({ maxLength: ISO_DAY_LENGTH })),
  to: t.Optional(t.String({ maxLength: ISO_DAY_LENGTH })),
});

/** Query of `GET /events/people`, the guest picker; same shape as the team picker it delegates to. */
export const PeopleQuery = t.Object({
  q: t.Optional(t.String({ maxLength: EVENT_SEARCH_MAX })),
  projectId: t.Optional(Id),
});

/** Body of `POST /events`; stage 1 of the form sends the first three fields and nothing else. */
export const CreateBody = t.Object(
  {
    title: Title,
    startsAt: Instant,
    endsAt: Instant,
    // Null makes it a personal event: no project, visible to its creator and guests only.
    projectId: t.Optional(t.Nullable(Id)),
    participantIds: t.Optional(Guests),
    ...DETAILS,
    ...LATER,
  },
  { additionalProperties: false },
);

/** Body of `PATCH /events/:id`; every field optional, a key left out stays as it is. */
export const UpdateBody = t.Object(
  {
    title: t.Optional(Title),
    startsAt: t.Optional(Instant),
    endsAt: t.Optional(Instant),
    // An event cannot be moved between projects: its guest list and visibility hang off the project
    // it was created in, so moving it would silently change who can read it.
    projectId: t.Optional(t.Never()),
    participantIds: t.Optional(t.Never()),
    ...DETAILS,
    ...LATER,
  },
  { additionalProperties: false },
);

/** Body of `POST /events/:id/cancel`; the reason is what every guest reads on the banner. */
export const CancelBody = t.Object(
  { reason: t.String({ minLength: 1, maxLength: EVENT_CANCEL_REASON_MAX }) },
  { additionalProperties: false },
);

/** Body of `POST /events/:id/participants`. */
export const InviteBody = t.Object({ userIds: Guests }, { additionalProperties: false });

/** Body of `PUT /events/:id/note`; an empty body is a legitimate "clear the minutes". */
export const NoteBody = t.Object(
  {
    body: t.String({ maxLength: EVENT_NOTE_BODY_MAX }),
    status: t.Optional(oneOf(EVENT_NOTE_STATUSES)),
    // The version the writer loaded; null or absent means "there were no minutes when I opened this".
    baseUpdatedAt: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
  },
  { additionalProperties: false },
);
