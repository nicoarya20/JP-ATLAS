/**
 * The server's event DTOs translated into what the Events screens read. Pure: no request, no store,
 * no device clock — the only outside value it takes is the team zone and today's date, both from the
 * server's clock (K1), so the whole mapping is testable without a network.
 *
 * Why a layer of its own: the screens were written against the prototype's `EventItem` (a day, a
 * time tile, a range and a place as text), while the API sends ISO instants, enum values and a
 * `can{}`. Keeping the translation in one pure place means a wrong label is a unit-test failure
 * rather than something you only see on a phone.
 *
 * Instants are turned into a day and a clock time in the **team zone** and never in UTC or the
 * device zone: an event at 06:00 WIB reads as the day before in UTC (K2).
 */
import { today } from './clock';
import type { Cancellation, EventItem, EventType } from './events.shared';
import type {
  EventCapsWire,
  EventDetailWire,
  EventKind,
  EventListItemWire,
  EventLocationType,
  EventNoteStatus,
  PersonRefWire,
} from './events.wire';
import { instantDate, instantParts, instantTime } from './instant';
import type { EventStatus } from './sample/events';
import { type PersonIdentity, someSamePerson } from './viewer';

/**
 * An event as the Events screens see it: the shape they already read, plus what only the server can
 * say — the capabilities, the guest count, the minutes status and the real identities.
 *
 * The identity fields exist because people are matched by `userId` (K4) while the labels stay names:
 * `attendees` is what is drawn, `attendeeIds` is what `samePerson()` is given.
 */
export type ServerEvent = EventItem & {
  /** What the viewer may do with this event; read through `events.caps.ts`. */
  can: EventCapsWire;
  /** Guests in all, and whether the viewer is one of them (the list sends counts, not names). */
  participantsTotal: number;
  isParticipant: boolean;
  /** Who canceled it, and why; the list rows carry no canceller, so `by` is empty there. */
  /** Minutes: null = none written yet. */
  noteStatus: EventNoteStatus | null;
  /** Online events only; kept apart from `place` so the link can be opened (B3). */
  meetingUrl: string | null;
  /** Name of the project, or null for a personal event (B4). */
  projectName: string | null;
  /** `userId` of the creator, for `samePerson()`; the label is `creator`. */
  creatorId: string | null;
  /** `userId` per guest, in the same order as `attendees`. */
  attendeeIds: string[];
  /** The instants as the server sent them; kept so sorting never goes through a label. */
  startsAt: string;
  endsAt: string;
};

/** The detail adds the minutes body, the reminders and the full timestamps. */
export type ServerEventDetail = ServerEvent & {
  remindersMinutes: number[];
  note: { body: string; status: EventNoteStatus; updatedAt: string } | null;
  createdAt: string;
  updatedAt: string;
  /** Instant the event was canceled, or null. */
  canceledAt: string | null;
};

/** `kind` of the API ↔ the type label the screens show. One-to-one, both ways. */
export const KIND_TO_TYPE: Record<EventKind, EventType> = {
  meeting: 'Meeting',
  review: 'Review',
  important: 'Important',
  team: 'Team event',
  other: 'Other',
};

const TYPE_TO_KIND = Object.fromEntries(
  Object.entries(KIND_TO_TYPE).map(([kind, type]) => [type, kind]),
) as Record<EventType, EventKind>;

/** The `kind` to send for a type label picked in the form. */
export const kindOfType = (type: EventType): EventKind => TYPE_TO_KIND[type];

/** `locationType` of the API ↔ the form's switch. A null type is shown as the in-person default. */
export const modeOfLocation = (type: EventLocationType | null): EventItem['mode'] =>
  type === 'online' ? 'Online' : 'In person';

export const locationOfMode = (mode: EventItem['mode']): EventLocationType =>
  mode === 'Online' ? 'online' : 'offline';

const pad = (n: number) => String(n).padStart(2, '0');

/** "14:00" (24 h, team zone) → "2:00"; midnight is "12:00", as the prototype's tile shows it. */
export function hour12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`Not a 24-hour clock time (HH:mm): ${hhmm}`);
  }
  return `${((h + 11) % 12) + 1}:${pad(m)}`;
}

/** "AM" before noon, "PM" from noon; of a 24-hour time. */
export const meridiem = (hhmm: string): 'AM' | 'PM' =>
  Number(hhmm.slice(0, 2)) < 12 ? 'AM' : 'PM';

/** "2:00 PM" of a 24-hour team-zone time. */
export const clockLabel = (hhmm: string): string => `${hour12(hhmm)} ${meridiem(hhmm)}`;

/** "2:00–3:00 PM", or "11:00 AM–12:00 PM" when the range crosses noon. */
export function rangeLabel(start: string, end: string): string {
  const both = meridiem(start) === meridiem(end);
  return both ? `${hour12(start)}–${clockLabel(end)}` : `${clockLabel(start)}–${clockLabel(end)}`;
}

/** Agenda items from the server's one text field (and from the form's box), one per line. */
export const agendaItems = (text: string | null | undefined): string[] =>
  (text ?? '')
    .split('\n')
    .map((a) => a.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

/** The agenda text to send for the items a form holds. Empty list = no agenda, which is null. */
export const agendaText = (items: readonly string[]): string | null =>
  items.length ? items.join('\n') : null;

/** Written place of an event: the room, or nothing for an online one (its link is a fact of its own). */
const placeOf = (dto: Pick<EventListItemWire, 'locationType' | 'locationText'>): string =>
  dto.locationType === 'online' ? 'Online' : (dto.locationText ?? '');

/**
 * Location line of an event. Kept apart from `eventWhere` in `events.shared.ts`: that one assumes a
 * place is always written, which a server event need not have.
 */
export function eventWhereLine(e: ServerEvent): string {
  if (e.mode === 'Online') return 'Online';
  return e.place ? `${e.mode} · ${e.place}` : e.mode;
}

/**
 * Status pill of an event. `past` is the server's own verdict when the row came from the `past` tab
 * (it cuts on `endsAt` against *now*); without it the day is compared against the server's `today`,
 * which is the finest truth the clock carries (it has a day, not an instant) — so an event that
 * ended earlier today still reads as happening today, not as done.
 */
function statusOf(
  dto: EventListItemWire,
  past: boolean | undefined,
  timeZone?: string,
): EventStatus {
  if (past !== undefined) return past ? 'Done' : 'Upcoming';
  return instantDate(dto.endsAt, timeZone) < today() ? 'Done' : 'Upcoming';
}

const cancellationOf = (
  dto: Pick<EventListItemWire, 'canceledAt' | 'cancelReason'>,
  by: PersonRefWire | null,
): Cancellation | undefined =>
  dto.canceledAt ? { reason: dto.cancelReason ?? '', by: by?.name ?? '' } : undefined;

export type MapOptions = {
  /** The server put this row in the `past` tab (or in `upcoming`); leave out for a calendar read. */
  past?: boolean;
  /** Team zone; defaults to the server clock's. Only tests pass it. */
  timeZone?: string;
  /**
   * Who is signed in, for "am I a guest" on a detail (K4). Passed in rather than read from the
   * session so this module stays pure, and matched with `someSamePerson()` rather than by hand.
   */
  who?: PersonIdentity;
};

/** One list row as the cards, groups and calendar read it. */
export function toServerEvent(dto: EventListItemWire, options: MapOptions = {}): ServerEvent {
  const { timeZone } = options;
  const start = instantTime(dto.startsAt, timeZone);
  const end = instantTime(dto.endsAt, timeZone);
  return {
    id: dto.id,
    title: dto.title,
    startsAt: dto.startsAt,
    endsAt: dto.endsAt,
    date: instantDate(dto.startsAt, timeZone),
    time: hour12(start),
    range: rangeLabel(start, end),
    place: placeOf(dto),
    mode: modeOfLocation(dto.locationType),
    type: KIND_TO_TYPE[dto.kind],
    status: statusOf(dto, options.past, timeZone),
    attendees: [],
    attendeeIds: [],
    creator: '',
    creatorId: null,
    canceled: cancellationOf(dto, null),
    project: dto.project?.id,
    projectName: dto.project?.name ?? null,
    can: dto.can,
    participantsTotal: dto.participants.total,
    isParticipant: dto.participants.isParticipant,
    noteStatus: dto.noteStatus,
    meetingUrl: dto.meetingUrl,
  };
}

/**
 * One event's detail. The guest list is ordered with the creator first, as the prototype shows it,
 * and `attendees`/`attendeeIds` stay index-aligned so a label is never read off the wrong person.
 */
export function toServerEventDetail(
  dto: EventDetailWire,
  options: MapOptions = {},
): ServerEventDetail {
  const base = toServerEvent({ ...dto, participants: { total: 0, isParticipant: false } }, options);
  const guests = dto.creator
    ? [dto.creator, ...dto.participants.filter((p) => p.id !== dto.creator?.id)]
    : [...dto.participants];
  return {
    ...base,
    attendees: guests.map((p) => p.name),
    attendeeIds: guests.map((p) => p.id),
    creator: dto.creator?.name ?? '',
    creatorId: dto.creator?.id ?? null,
    canceled: cancellationOf(dto, dto.canceledBy),
    participantsTotal: guests.length,
    isParticipant: options.who
      ? someSamePerson(
          guests.map((p) => p.id),
          options.who,
        )
      : false,
    agenda: agendaItems(dto.agenda),
    updated: instantDate(dto.updatedAt, options.timeZone),
    remindersMinutes: dto.remindersMinutes,
    note: dto.note,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    canceledAt: dto.canceledAt,
  };
}

/**
 * The instant a wall-clock day and time in the team zone stands for — the inverse of
 * `instantTime`/`instantDate`, which the form needs to send `startsAt`/`endsAt`.
 *
 * Two passes, not one: the offset of a zone depends on the instant, so the wanted wall time is
 * first read as if it were UTC, the real zone offset of that guess is measured, and the guess is
 * moved by the difference. A second pass settles the case where the correction itself crosses an
 * offset change. Done this way there is no table of zone rules here and no `new Date()` of the
 * device's own: every value comes from the day, the time and the server's zone.
 *
 * Belongs in `src/data/instant.ts` with the rest of the instant helpers; it is here because that
 * file is shared foundation this wave may not change (see the hand-over).
 */
export function instantOfLocal(date: string, time24: string, timeZone?: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time24.split(':').map(Number);
  if ([year, month, day, hour, minute].some((n) => n === undefined || Number.isNaN(n))) {
    throw new Error(`Not a date and a 24-hour time: ${date} ${time24}`);
  }
  const wanted = Date.UTC(year as number, (month as number) - 1, day, hour, minute);
  let guess = wanted;
  for (let pass = 0; pass < 2; pass += 1) {
    const got = instantParts(new Date(guess).toISOString(), timeZone);
    const reads = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute);
    if (reads === wanted) break;
    guess += wanted - reads;
  }
  return new Date(guess).toISOString();
}

/** "2:00 PM" (as the form's pickers hold it) back to the 24-hour time the conversion takes. */
export function time24(label: string): string {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim());
  if (!m) throw new Error(`Not a clock time (h:mm AM/PM): ${label}`);
  const base = Number(m[1]) % 12;
  const hour = m[3]?.toUpperCase() === 'PM' ? base + 12 : base;
  return `${pad(hour)}:${m[2]}`;
}

/** Reminder offsets as one line: "1 day & 30 min before", "No reminder" for an empty list (B7). */
export function remindersLabel(minutes: readonly number[]): string {
  if (!minutes.length) return 'No reminder';
  const one = (m: number) => {
    if (m % 1440 === 0) return `${m / 1440} day${m === 1440 ? '' : 's'}`;
    if (m % 60 === 0) return `${m / 60} hour${m === 60 ? '' : 's'}`;
    return `${m} min`;
  };
  return `${minutes.map(one).join(' & ')} before`;
}
