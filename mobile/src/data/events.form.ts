/**
 * New event / Edit form (map `phase2-map-events.md` §3): its fields, the checks Save waits for, and the bodies sent to
 * `POST /events` and `PATCH /events/:id`. Times are the team's (K1): the form's day and clock time become the instant
 * the server stores through `zonedInstant`, and an edit sends only what changed.
 */
import { today } from './clock';
import { daysBetween, monthDay } from './dates';
import { addDays, clockMinutes, monthOf } from './events.dates';
import { KINDS } from './events.query';
import { type EventType, TYPES } from './events.shared';
import { clockOf, dayAndClock, zonedInstant } from './events.time';
import type {
  CreateEventBody,
  EventDetailWire,
  PersonRefWire,
  UpdateEventBody,
} from './events.wire';
import type { GuestChange } from './events.write';

const FIRST_HOUR = 7;
const LAST_HOUR = 21;
const STEP_MIN = 15;
const DEFAULT_START = '9:00 AM';
const DEFAULT_END = '10:00 AM';

/** Location modes of the form's switch. */
export const MODES = ['In person', 'Online'] as const;
export type EventMode = (typeof MODES)[number];

/** Start / End options: 7:00 AM to 9:00 PM every 15 minutes (57 times). */
export const TIMES: readonly string[] = Array.from(
  { length: ((LAST_HOUR - FIRST_HOUR) * 60) / STEP_MIN + 1 },
  (_, i) => clockOf(FIRST_HOUR * 60 + i * STEP_MIN),
);

/** Time picks; an edited event at a time off the list (6:30 AM) keeps its own time on top. */
export const timeOptions = (current: string) =>
  (TIMES.includes(current) ? TIMES : [current, ...TIMES]).map((t) => ({ value: t, label: t }));

/** Due date picks of a Step 3 draft (sample outcomes): from today to the end of its month, "Oct 9" labels. */
export const dueDates = () => {
  const from = today();
  return monthOf(from)
    .filter((d) => d >= from)
    .map((value) => ({ value, label: monthDay(value) }));
};

export type EventForm = {
  title: string;
  /** First day, ISO, in the team's zone. */
  date: string;
  start: string;
  end: string;
  /** Days from the first day to the last: 0 unless an event already ran past midnight. */
  span: number;
  mode: EventMode;
  place: string;
  link: string;
  /** Guests besides the creator, who is always one. */
  guests: PersonRefWire[];
  type: EventType;
  /** Null: a personal event. Fixed once the event exists (E-8). */
  projectId: string | null;
  agenda: string;
};

/** A new event: today 9–10 AM in person, personal until a project is picked. */
export const blankEvent = (): EventForm => ({
  title: '',
  date: today(),
  start: DEFAULT_START,
  end: DEFAULT_END,
  span: 0,
  mode: MODES[0],
  place: '',
  link: '',
  guests: [],
  type: TYPES[0],
  projectId: null,
  agenda: '',
});

/** The Edit form of event e; the creator is left out of the guests, as on a new event. */
export function eventFormOf(e: EventDetailWire, timeZone: string): EventForm {
  const from = dayAndClock(e.startsAt, timeZone);
  const to = dayAndClock(e.endsAt, timeZone);
  return {
    title: e.title,
    date: from.date,
    start: from.clock,
    end: to.clock,
    span: daysBetween(from.date, to.date),
    mode: e.locationType === 'online' ? 'Online' : 'In person',
    place: e.locationText ?? '',
    link: e.meetingUrl ?? '',
    guests: e.participants.filter((p) => p.id !== e.creator?.id),
    type: TYPES[KINDS.indexOf(e.kind)] ?? TYPES[0],
    projectId: e.project?.id ?? null,
    agenda: e.agenda ?? '',
  };
}

export type EventCheck = {
  /** Save is allowed. */
  ok: boolean;
  titleOk: boolean;
  /** False shows "The end time must be after the start time." */
  timeOk: boolean;
  /** False shows that a meeting link starts with http:// or https://. */
  linkOk: boolean;
};

const HTTP = /^https?:\/\/\S+$/i;

/** Save waits for a title, an end after the start, and a usable meeting link (the server's own rules). */
export function checkEvent(f: EventForm): EventCheck {
  const titleOk = !!f.title.trim();
  const timeOk = f.span > 0 || clockMinutes(f.end) > clockMinutes(f.start);
  const link = f.link.trim();
  const linkOk = f.mode !== 'Online' || !link || HTTP.test(link);
  return { ok: titleOk && timeOk && linkOk, titleOk, timeOk, linkOk };
}

/** The fields create and edit both send, as the server takes them. */
function fieldsOf(f: EventForm, timeZone: string): Required<UpdateEventBody> {
  const online = f.mode === 'Online';
  return {
    title: f.title.trim(),
    startsAt: zonedInstant(f.date, f.start, timeZone),
    endsAt: zonedInstant(addDays(f.date, f.span), f.end, timeZone),
    kind: KINDS[TYPES.indexOf(f.type)] ?? KINDS[0],
    locationType: online ? 'online' : 'offline',
    locationText: online ? null : f.place.trim() || null,
    meetingUrl: online ? f.link.trim() || null : null,
    agenda: f.agenda.trim() || null,
    // Not on the form (shown, not picked): an edit never sends them, a new event gets the server's default.
    remindersMinutes: [],
  };
}

/** `POST /events` of form f. */
export function createBody(f: EventForm, timeZone: string): CreateEventBody {
  const { remindersMinutes: _, ...fields } = fieldsOf(f, timeZone);
  const ids = f.guests.map((g) => g.id);
  return { ...fields, projectId: f.projectId, ...(ids.length ? { participantIds: ids } : {}) };
}

/** `PATCH /events/:id` of an edit from `was` to `now`: only the keys whose value changed. */
export function updateBody(was: EventForm, now: EventForm, timeZone: string): UpdateEventBody {
  const before = fieldsOf(was, timeZone);
  const after = fieldsOf(now, timeZone);
  const keys = Object.keys(after) as (keyof UpdateEventBody)[];
  const changed = keys.filter(
    (k) => k !== 'remindersMinutes' && JSON.stringify(before[k]) !== JSON.stringify(after[k]),
  );
  return Object.fromEntries(changed.map((k) => [k, after[k]])) as UpdateEventBody;
}

/** Who an edit adds to the guest list and who it takes off. */
export function guestChange(
  was: readonly PersonRefWire[],
  now: readonly PersonRefWire[],
): GuestChange {
  const had = new Set(was.map((g) => g.id));
  const has = new Set(now.map((g) => g.id));
  return {
    add: now.filter((g) => !had.has(g.id)).map((g) => g.id),
    remove: was.filter((g) => !has.has(g.id)).map((g) => g.id),
  };
}
