/**
 * Shapes the event reads return and the inputs the queries take (P6 §5). Explicit DTOs, not table
 * rows: nothing here carries the Could-class columns (series, outcomes), so E-13/E-16 can add them
 * later without changing what exists (expand-only). Dates leave the server as ISO strings.
 *
 * A participant is only ever `{ id, name }`: an event guest list must never carry an email address
 * or a phone number (Q8), and `tests/event/events.query.test.ts` asserts that.
 */
import type { Caps, EventCapKey } from '../access/capabilities';
import type { IsoDate } from '../metrics/types';
import type { EventKind, EventLocationType, EventNoteStatus } from '../pm/enums';
import type { ProjectStatus } from '../pm/enums';

/** A person as an event shows them: id and name only, never email or phone (Q8). */
export type PersonRef = { id: string; name: string };

/**
 * "Now", "today" and the team zone are injected so day boundaries are testable (R03 D9) and no
 * query calls `new Date()` itself. The zone is what turns "today and tomorrow" into instants.
 */
export type EventClock = {
  now: Date;
  today: IsoDate;
  /** IANA zone of the team (`APP_TIME_ZONE`); the Agenda window is cut on local midnight. */
  timeZone: string;
};

/** Which half of the list to show; the cut is on `starts_at` against `now`. */
export const EVENT_TABS = ['upcoming', 'past'] as const;
export type EventTab = (typeof EVENT_TABS)[number];

/** The list opens on what is still to come: the past is a tab you choose, not a default. */
export const EVENT_TAB_DEFAULT: EventTab = 'upcoming';

/** Longest search text honoured; anything beyond is cut, so a huge `q` cannot build a huge LIKE. */
export const EVENT_SEARCH_MAX = 100;

/** Rows the Beranda Agenda widget shows at most (R10 H3). */
export const AGENDA_LIMIT = 4;

export type ListEventsInput = {
  /** Defaults to `upcoming`. */
  tab?: EventTab;
  kind?: readonly EventKind[];
  projectId?: string;
  /** Free text matched against the title. */
  q?: string;
  limit?: number;
  cursor?: string;
};

export type ProjectRef = { id: string; name: string; status: ProjectStatus };

export interface EventListItem {
  id: string;
  title: string;
  kind: EventKind;
  /** ISO instants, so the client formats them in the team zone without guessing. */
  startsAt: string;
  endsAt: string;
  locationType: EventLocationType | null;
  locationText: string | null;
  meetingUrl: string | null;
  project: ProjectRef | null;
  canceledAt: string | null;
  cancelReason: string | null;
  /** How many guests the event has, and whether the viewer is one of them. */
  participants: { total: number; isParticipant: boolean };
  /** Absent when the event has no minutes yet, so the UI can show "Belum ada". */
  noteStatus: EventNoteStatus | null;
  can: Caps<EventCapKey>;
}

export type ListEventsResult =
  | { ok: true; items: EventListItem[]; nextCursor: string | null }
  // The keyset decoder calls this VALIDATION (422); the list route maps it to the 400 `BAD_CURSOR` of R04.
  | { ok: false; code: 'BAD_CURSOR' };

export interface EventDetail extends Omit<EventListItem, 'participants'> {
  agenda: string | null;
  remindersMinutes: number[];
  creator: PersonRef | null;
  canceledBy: PersonRef | null;
  participants: PersonRef[];
  note: { body: string; status: EventNoteStatus; updatedAt: string } | null;
  createdAt: string;
  updatedAt: string;
}

// `NOT_VISIBLE` is the policy's own code; it is not in `PM_API_CODES`, so the service reports a
// hidden event as `NOT_FOUND` (404) — the same answer a missing one gives (D8). E-06 keeps that.
/** Reading one event: either the detail, or the 404 a hidden event and a missing one share. */
export type EventDetailResult = { ok: true; event: EventDetail } | { ok: false; code: 'NOT_FOUND' };

/** One entry of the Beranda Agenda widget: the smallest slice that renders a line. */
export interface AgendaItem {
  id: string;
  title: string;
  kind: EventKind;
  startsAt: string;
  endsAt: string;
  locationType: EventLocationType | null;
  project: ProjectRef | null;
}

/** The columns every event read selects (see `eventColumns` in `events.query.ts`). */
export type EventRow = {
  id: string;
  title: string;
  kind: EventKind;
  startsAt: Date;
  endsAt: Date;
  locationType: EventLocationType | null;
  locationText: string | null;
  meetingUrl: string | null;
  agenda: string | null;
  remindersMinutes: number[];
  canceledAt: Date | null;
  cancelReason: string | null;
  canceledBy: string | null;
  createdBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  projectId: string | null;
  projectName: string | null;
  projectStatus: ProjectStatus | null;
  projectDeletedAt: Date | null;
};
