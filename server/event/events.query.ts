/**
 * Event list, detail and Agenda reads (P6 §6 E-03). Visibility is decided in SQL
 * (`visibleEventsWhere`), so a page never holds a row the viewer may not see, and the number of
 * queries stays constant however many events match: `listEvents` costs exactly three round trips
 * (the page, the guest-list aggregate, the viewer's memberships) and `tests/event/events.query.test.ts`
 * proves it with a query counter.
 *
 * No function here calls `new Date()`: "now", "today" and the team zone arrive in an `EventClock`.
 */
import { and, asc, desc, eq, ilike, inArray, isNull, type SQL, sql } from 'drizzle-orm';
import { eventCaps } from '../access/capabilities';
import { canViewEvent } from '../access/event.policy';
import type { EventSubject, Membership, Principal } from '../access/types';
import { db } from '../db';
import { event, eventNote, project } from '../db/schema';
import { decodeCursor, encodeCursor } from '../pm/keyset';
import { PAGE_LIMIT_DEFAULT, PAGE_LIMIT_MAX } from '../pm/limits';
import type { Executor } from '../pm/tx';
import { loadMembership } from '../project/membership.query';
import { liveEvent, visibleEventsWhere } from './events.access';
import {
  AGENDA_LIMIT,
  EVENT_SEARCH_MAX,
  EVENT_TAB_DEFAULT,
} from './events.dto';
import type {
  AgendaItem,
  EventClock,
  EventDetail,
  EventDetailResult,
  EventListItem,
  EventRow,
  EventTab,
  ListEventsInput,
  ListEventsResult,
  ProjectRef,
} from './events.dto';
import { loadEventPeople, loadParticipants, loadParticipantSummaries } from './events.participants';

const clampLimit = (n: number | undefined) =>
  Math.min(Math.max(Math.trunc(n ?? PAGE_LIMIT_DEFAULT), 1), PAGE_LIMIT_MAX);

/** Every column an event read selects; the project columns come from a LEFT JOIN, so they are nullable. */
export const eventColumns = {
  id: event.id,
  title: event.title,
  kind: event.kind,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  locationType: event.locationType,
  locationText: event.locationText,
  meetingUrl: event.meetingUrl,
  agenda: event.agenda,
  remindersMinutes: event.remindersMinutes,
  canceledAt: event.canceledAt,
  cancelReason: event.cancelReason,
  canceledBy: event.canceledBy,
  createdBy: event.createdBy,
  deletedAt: event.deletedAt,
  deletedBy: event.deletedBy,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
  projectId: event.projectId,
  projectName: project.name,
  projectStatus: project.status,
  projectDeletedAt: project.deletedAt,
} as const;

// A personal event has no project row, so every read LEFT JOINs `project`: an INNER JOIN would
// silently drop events that belong to nobody's project.
const onProject = eq(project.id, event.projectId);

/** A live event whose project (if any) is not itself in the Trash. */
const listable = and(liveEvent, isNull(project.deletedAt));

/** The ISO instant of a Date for a raw `sql` fragment; a timestamptz column needs the cast (X1 D7). */
const instant = (d: Date) => sql`${d.toISOString()}::timestamptz`;

/** `LIKE` search on the title; `%`, `_` and the escape character are literal, backslash being the Postgres default. */
function titleMatches(q: string): SQL {
  return ilike(event.title, `%${q.replace(/[\\%_]/g, '\\$&')}%`);
}

/** The half of the timeline a tab shows; both cut on `starts_at` against the same `now`. */
function inTab(tab: EventTab, now: Date): SQL {
  return tab === 'upcoming'
    ? sql`${event.startsAt} >= ${instant(now)}`
    : sql`${event.startsAt} < ${instant(now)}`;
}

/** Keyset step for the tab's own direction: upcoming runs forwards in time, past backwards. */
function afterCursor(tab: EventTab, key: { sortValue: string | number | null; id: string }): SQL {
  const at = sql`${String(key.sortValue)}::timestamptz`;
  return tab === 'upcoming'
    ? sql`(${event.startsAt}, ${event.id}) > (${at}, ${key.id})`
    : sql`(${event.startsAt}, ${event.id}) < (${at}, ${key.id})`;
}

const orderFor = (tab: EventTab) =>
  tab === 'upcoming' ? [asc(event.startsAt), asc(event.id)] : [desc(event.startsAt), desc(event.id)];

/** The WHERE conditions the caller's filters add; undefined entries are dropped by `and`. */
function filtersOf(i: ListEventsInput): (SQL | undefined)[] {
  const q = i.q?.trim().slice(0, EVENT_SEARCH_MAX);
  return [
    i.projectId ? eq(event.projectId, i.projectId) : undefined,
    i.kind?.length ? inArray(event.kind, [...i.kind]) : undefined,
    q ? titleMatches(q) : undefined,
  ];
}

const iso = (d: Date | null) => (d === null ? null : d.toISOString());

const projectRefOf = (r: EventRow): ProjectRef | null =>
  r.projectId && r.projectName && r.projectStatus
    ? { id: r.projectId, name: r.projectName, status: r.projectStatus }
    : null;

/** The policy's view of a row; `isParticipant` is the one guest fact the pure policy needs. */
export function subjectOf(r: EventRow, isParticipant: boolean): EventSubject {
  return {
    id: r.id,
    projectId: r.projectId,
    createdBy: r.createdBy,
    canceledAt: r.canceledAt,
    deletedAt: r.deletedAt,
    deletedBy: r.deletedBy,
    projectDeletedAt: r.projectDeletedAt,
    isParticipant,
  };
}

/**
 * One keyset page of the events `p` may see. Exactly three queries: the page itself, the guest-list
 * aggregate for the page, and the viewer's membership of the projects on it. A cursor that is
 * malformed or belongs to the other tab answers `BAD_CURSOR` instead of throwing.
 */
export async function listEvents(
  p: Principal,
  input: ListEventsInput,
  clock: EventClock,
  exec: Executor = db,
): Promise<ListEventsResult> {
  const tab = input.tab ?? EVENT_TAB_DEFAULT;
  const limit = clampLimit(input.limit);
  let after: SQL | undefined;
  if (input.cursor !== undefined) {
    const cursor = decodeCursor(input.cursor);
    // The sort value is always an ISO instant, so a number or null is a cursor from another list.
    if (!cursor.ok || typeof cursor.key.sortValue !== 'string')
      return { ok: false, code: 'BAD_CURSOR' };
    after = afterCursor(tab, cursor.key);
  }

  // Query 1: the page. One extra row tells whether another page exists without a count query.
  const rows = await exec
    .select({ ...eventColumns, noteStatus: eventNote.status })
    .from(event)
    .leftJoin(project, onProject)
    // The minutes are one row per event (unique index), so this join cannot duplicate a page row.
    .leftJoin(eventNote, eq(eventNote.eventId, event.id))
    .where(and(listable, visibleEventsWhere(p), inTab(tab, clock.now), ...filtersOf(input), after))
    .orderBy(...orderFor(tab))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const nextCursor =
    rows.length > limit && last ? encodeCursor(last.startsAt.toISOString(), last.id) : null;

  const projectIds = page.map((r) => r.projectId).filter((id): id is string => id !== null);
  // Queries 2 and 3, in parallel: the guest-list aggregate and the viewer's memberships.
  const [guests, memberships] = await Promise.all([
    loadParticipantSummaries(p.id, page.map((r) => r.id), exec),
    loadMembership(p.id, projectIds, exec),
  ]);

  const items = page.map((r): EventListItem => {
    const summary = guests.get(r.id) ?? { total: 0, isParticipant: false };
    const m: Membership = r.projectId ? (memberships.get(r.projectId) ?? null) : null;
    return {
      id: r.id,
      title: r.title,
      kind: r.kind,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
      locationType: r.locationType,
      locationText: r.locationText,
      meetingUrl: r.meetingUrl,
      project: projectRefOf(r),
      canceledAt: iso(r.canceledAt),
      cancelReason: r.cancelReason,
      participants: summary,
      noteStatus: r.noteStatus ?? null,
      can: eventCaps(p, subjectOf(r, summary.isParticipant), m),
    };
  });
  return { ok: true, items, nextCursor };
}

/** One event row by id, project columns joined, with no visibility filter; callers gate it themselves. */
export async function loadEventRow(id: string, exec: Executor = db): Promise<EventRow | undefined> {
  const [row] = await exec
    .select(eventColumns)
    .from(event)
    .leftJoin(project, onProject)
    .where(eq(event.id, id));
  return row;
}

/** The `EventSubject` of a row for one principal, resolving the viewer's own guest flag. */
export async function eventSubjectOf(
  p: Principal,
  row: EventRow,
  exec: Executor = db,
): Promise<EventSubject> {
  const guests = await loadParticipantSummaries(p.id, [row.id], exec);
  return subjectOf(row, guests.get(row.id)?.isParticipant ?? false);
}

/** The viewer's membership of a project, or null for a personal event. */
export async function membershipFor(
  p: Principal,
  projectId: string | null,
  exec: Executor = db,
): Promise<Membership> {
  if (!projectId) return null;
  return (await loadMembership(p.id, [projectId], exec)).get(projectId) ?? null;
}

/**
 * One event with its guests, minutes and `can{}`. A hidden event and a missing one give the same
 * `NOT_FOUND`, so the answer never reveals that the id exists (D8).
 */
export async function getEvent(
  p: Principal,
  id: string,
  exec: Executor = db,
): Promise<EventDetailResult> {
  const row = await loadEventRow(id, exec);
  if (!row) return { ok: false, code: 'NOT_FOUND' };
  const [guests, m, participants, note] = await Promise.all([
    loadParticipantSummaries(p.id, [id], exec),
    membershipFor(p, row.projectId, exec),
    loadParticipants(id, exec),
    exec.select().from(eventNote).where(eq(eventNote.eventId, id)),
  ]);
  const subject = subjectOf(row, guests.get(id)?.isParticipant ?? false);
  if (!canViewEvent(p, subject, m).ok) return { ok: false, code: 'NOT_FOUND' };

  const people = await loadEventPeople([row.createdBy, row.canceledBy], exec);
  const noteRow = note[0];
  const detail: EventDetail = {
    id: row.id,
    title: row.title,
    kind: row.kind,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    locationType: row.locationType,
    locationText: row.locationText,
    meetingUrl: row.meetingUrl,
    agenda: row.agenda,
    remindersMinutes: row.remindersMinutes,
    project: projectRefOf(row),
    canceledAt: iso(row.canceledAt),
    cancelReason: row.cancelReason,
    creator: row.createdBy ? (people.get(row.createdBy) ?? null) : null,
    canceledBy: row.canceledBy ? (people.get(row.canceledBy) ?? null) : null,
    participants,
    noteStatus: noteRow?.status ?? null,
    note: noteRow
      ? { body: noteRow.body, status: noteRow.status, updatedAt: noteRow.updatedAt.toISOString() }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    can: eventCaps(p, subject, m),
  };
  return { ok: true, event: detail };
}

/**
 * The Agenda widget of the Beranda: at most four of my own events (mine = I created it or I am
 * invited) starting between `now` and the end of tomorrow. The day boundary is computed by Postgres
 * from `clock.today` and the team zone, so a local midnight is never guessed in JavaScript.
 */
export async function agendaFor(
  p: Principal,
  clock: EventClock,
  exec: Executor = db,
): Promise<AgendaItem[]> {
  const endOfTomorrow = sql`((${clock.today}::date + 2) AT TIME ZONE ${clock.timeZone})`;
  const rows = await exec
    .select(eventColumns)
    .from(event)
    .leftJoin(project, onProject)
    .where(
      and(
        listable,
        isNull(event.canceledAt),
        // "My" agenda, not the project's: being a member of a project does not put its every
        // meeting on my personal list, or four slots would fill with meetings I am not in.
        sql`(${event.createdBy} = ${p.id} OR EXISTS (
          SELECT 1 FROM "event_participant" ep
          WHERE ep."event_id" = ${event.id} AND ep."user_id" = ${p.id}))`,
        sql`${event.startsAt} >= ${instant(clock.now)}`,
        sql`${event.startsAt} < ${endOfTomorrow}`,
      ),
    )
    .orderBy(asc(event.startsAt), asc(event.id))
    .limit(AGENDA_LIMIT);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    locationType: r.locationType,
    project: projectRefOf(r),
  }));
}
