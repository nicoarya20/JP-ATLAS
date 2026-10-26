// New event / Edit form: what it holds, its option lists, what makes it saveable, and the request
// bodies it becomes. Ported from the prototype's events.new.jsx (and the due picks of
// events.outcomes.jsx); dates run from today to the end of its month, times 7:00 AM–9:00 PM every
// 15 minutes.
//
// The form holds what a person types; turning it into `POST`/`PATCH` bodies is the last three
// functions here, so the screen never builds a request itself and every limit is checked in one
// place — the same limits the server enforces (`events.wire.ts`).
import { today } from './clock';
import { monthDay } from './dates';
import { clockMinutes, dateLabel, monthOf } from './events.dates';
import {
  agendaItems,
  agendaText,
  instantOfLocal,
  kindOfType,
  locationOfMode,
  time24,
} from './events.map';
import type { EventItem, EventType } from './events.shared';
import {
  type CreateEventBody,
  EVENT_AGENDA_MAX,
  EVENT_LOCATION_TEXT_MAX,
  EVENT_MEETING_URL_MAX,
  EVENT_PARTICIPANTS_MAX,
  EVENT_TITLE_MAX,
  type UpdateEventBody,
} from './events.wire';

const FIRST_HOUR = 7;
const LAST_HOUR = 21;
const STEP_MIN = 15;

/** Location modes of the form's switch. */
export const MODES = ['In person', 'Online'] as const;

/** A guest of the form: the identity that is sent, and the name that is shown (K4). */
export type FormGuest = { userId: string; name: string };

/** What the New event / Edit form holds. `date` is ISO, `start`/`end` clock times ("2:00 PM"). */
export type EventFormFields = {
  title: string;
  date: string;
  start: string;
  end: string;
  mode: EventItem['mode'];
  /** Room or address; in-person events only. */
  place: string;
  /** Meeting link; online events only. Kept apart from `place`, as the API does (B3). */
  meetingUrl: string;
  guests: FormGuest[];
  type: EventType;
  /** Project id, or null for a personal event (B4). */
  project: string | null;
  /** The agenda box's raw text, one item per line. */
  agenda: string;
};

/** "9:00 AM" of minutes since midnight. */
const clock = (n: number) =>
  `${((Math.floor(n / 60) + 11) % 12) + 1}:${String(n % 60).padStart(2, '0')} ${n < 720 ? 'AM' : 'PM'}`;

/** Start / End options: 7:00 AM to 9:00 PM every 15 minutes (57 times). */
export const TIMES: readonly string[] = Array.from(
  { length: ((LAST_HOUR - FIRST_HOUR) * 60) / STEP_MIN + 1 },
  (_, i) => clock(FIRST_HOUR * 60 + i * STEP_MIN),
);

/**
 * Dates from today to the end of today's month.
 *
 * Computed on call, not at import: the server's clock (K1) is not there yet when this module is
 * first loaded, and a date list built before it would be the wrong month.
 */
const ahead = () => monthOf(today()).filter((d) => d >= today());

/** Date options of the form: ISO value, "Thu, Oct 8" label. */
export const formDates = () => ahead().map((value) => ({ value, label: dateLabel(value) }));

/** Due date picks of a Step 3 draft: ISO value, "Oct 9" label (a task's due label). */
export const formDueDates = () => ahead().map((value) => ({ value, label: monthDay(value) }));

export type EventCheck = {
  /** Save is allowed: a title and an end after the start, and nothing over a server limit. */
  ok: boolean;
  /** False shows "The end time must be after the start time." */
  timeOk: boolean;
  /** The first field that is too long for the server to accept, or null. */
  tooLong: 'title' | 'place' | 'meetingUrl' | 'agenda' | 'guests' | null;
};

/**
 * Checks of the form. The length limits are the server's own (`events.wire.ts`): refusing here is
 * the same answer the server would give, shown before a request instead of as a 422 after one.
 */
export function validateEvent(f: EventFormFields): EventCheck {
  const timeOk = clockMinutes(f.end) > clockMinutes(f.start);
  const tooLong =
    f.title.trim().length > EVENT_TITLE_MAX
      ? 'title'
      : f.place.trim().length > EVENT_LOCATION_TEXT_MAX
        ? 'place'
        : f.meetingUrl.trim().length > EVENT_MEETING_URL_MAX
          ? 'meetingUrl'
          : f.agenda.length > EVENT_AGENDA_MAX
            ? 'agenda'
            : f.guests.length > EVENT_PARTICIPANTS_MAX
              ? 'guests'
              : null;
  return { ok: !!f.title.trim() && timeOk && !tooLong, timeOk, tooLong };
}

/** Agenda items from the form's text, one per line; a leading "1. " numbering and blanks are dropped. */
export const agendaLines = agendaItems;

/** Fields as Save sends them: the title, place and link trimmed. */
export const savedFields = (f: EventFormFields): EventFormFields => ({
  ...f,
  title: f.title.trim(),
  place: f.mode === 'Online' ? '' : f.place.trim(),
  meetingUrl: f.mode === 'Online' ? f.meetingUrl.trim() : '',
});

/** The fields every write shares: the instants, the kind, where it is, and the agenda. */
function commonBody(
  f: EventFormFields,
): Required<Pick<UpdateEventBody, 'title' | 'startsAt' | 'endsAt'>> & UpdateEventBody {
  const saved = savedFields(f);
  return {
    title: saved.title,
    startsAt: instantOfLocal(saved.date, time24(saved.start)),
    endsAt: instantOfLocal(saved.date, time24(saved.end)),
    kind: kindOfType(saved.type),
    locationType: locationOfMode(saved.mode),
    locationText: saved.place || null,
    meetingUrl: saved.meetingUrl || null,
    agenda: agendaText(agendaItems(saved.agenda)),
  };
}

/** Body of `POST /api/app/events`; the creator is added as a guest by the server. */
export function createBodyOf(f: EventFormFields): CreateEventBody {
  return {
    ...commonBody(f),
    projectId: f.project,
    participantIds: f.guests.map((g) => g.userId).filter(Boolean),
  };
}

/**
 * Body of `PATCH /api/app/events/:id`. Neither the project nor the guest list is in it: the server
 * refuses both (`t.Never()`), because moving an event between projects would silently change who
 * can read it, and guests have routes of their own. Use `guestDiff` for those.
 */
export const updateBodyOf = (f: EventFormFields): UpdateEventBody => commonBody(f);

/** Guests to invite and to remove, to turn `before` into `after` on an existing event. */
export function guestDiff(
  before: readonly FormGuest[],
  after: readonly FormGuest[],
): { add: string[]; remove: string[] } {
  const was = new Set(before.map((g) => g.userId));
  const now = new Set(after.map((g) => g.userId));
  return {
    add: [...now].filter((id) => id && !was.has(id)),
    remove: [...was].filter((id) => id && !now.has(id)),
  };
}
