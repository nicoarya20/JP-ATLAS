/**
 * Event list, detail and Agenda reads (P6 §6 E-03). Visibility is decided in SQL
 * (`visibleEventsWhere`), so a page never holds a row the viewer may not see, and the number of
 * queries stays constant however many events match: `listEvents` costs exactly three round trips
 * (the page, the guest-list aggregate, the viewer's memberships) and `tests/event/events.query.test.ts`
 * proves it with a query counter.
 *
 * The SQL fragments and the row mapping live in `events.sql.ts`, so the list, the detail and the
 * Agenda share one definition of "which events exist for this viewer" and this file stays a reader.
 *
 * No function here calls `new Date()`: "now", "today" and the team zone arrive in an `EventClock`.
 */
import { and, asc, eq, isNull, type SQL, sql } from 'drizzle-orm';
import { eventCaps } from '../access/capabilities';
import { canViewEvent } from '../access/event.policy';
import type { Membership, Principal } from '../access/types';
import { db } from '../db';
import { event, eventNote, project } from '../db/schema';
import { decodeCursor, encodeCursor } from '../pm/keyset';
import { PAGE_LIMIT_DEFAULT, PAGE_LIMIT_MAX } from '../pm/limits';
import type { Executor } from '../pm/tx';
import { loadMembership } from '../project/membership.query';
import { visibleEventsWhere } from './events.access';
import type {
  AgendaItem,
  EventClock,
  EventDetail,
  EventDetailResult,
  EventListItem,
  ListEventsInput,
  ListEventsResult,
} from './events.dto';
import { AGENDA_LIMIT, EVENT_TAB_DEFAULT } from './events.dto';
import { loadEventPeople, loadParticipantSummaries, loadParticipants } from './events.participants';
import {
  afterCursor,
  eventColumns,
  filtersOf,
  inRange,
  instant,
  inTab,
  iso,
  listable,
  loadEventRow,
  membershipFor,
  onProject,
  orderFor,
  projectRefOf,
  subjectOf,
} from './events.sql';

const clampLimit = (n: number | undefined) =>
  Math.min(Math.max(Math.trunc(n ?? PAGE_LIMIT_DEFAULT), 1), PAGE_LIMIT_MAX);

const NO_GUESTS = { total: 0, isParticipant: false };

/**
 * One keyset page of the events `p` may see. Exactly three queries: the page itself, the guest-list
 * aggregate for the page, and the viewer's membership of the projects on it. A cursor that is
 * malformed or belongs to another list answers `BAD_CURSOR` instead of throwing.
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
    .where(
      and(
        listable,
        visibleEventsWhere(p),
        // A calendar window replaces the tab's cut on `now`: the month grid needs the whole month,
        // past days included. Without one, nothing about the list changes (A9).
        input.range ? inRange(input.range, clock.timeZone) : inTab(tab, clock.now),
        ...filtersOf(input),
        after,
      ),
    )
    .orderBy(...orderFor(tab))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const nextCursor =
    rows.length > limit && last ? encodeCursor(last.startsAt.toISOString(), last.id) : null;

  const projectIds = page.map((r) => r.projectId).filter((id): id is string => id !== null);
  // Queries 2 and 3, in parallel: the guest-list aggregate and the viewer's memberships.
  const [guests, memberships] = await Promise.all([
    loadParticipantSummaries(
      p.id,
      page.map((r) => r.id),
      exec,
    ),
    loadMembership(p.id, projectIds, exec),
  ]);

  const items = page.map((r): EventListItem => {
    const summary = guests.get(r.id) ?? NO_GUESTS;
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

/**
 * One event with its guests, minutes and `can{}`. A hidden event and a missing one give the same
 * `NOT_FOUND`, so the answer never reveals that the id exists (D8). An event in the Trash, or whose
 * project is, answers the same: the Trash page lists it from its own query, and a stale link or a
 * back button must not open a deleted event as if it were live (E-07).
 */
export async function getEvent(
  p: Principal,
  id: string,
  exec: Executor = db,
): Promise<EventDetailResult> {
  const row = await loadEventRow(id, exec);
  if (!row || row.deletedAt || row.projectDeletedAt) return { ok: false, code: 'NOT_FOUND' };
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
 * invited) that have not ended yet and start before the end of tomorrow. The day boundary is computed by Postgres
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
        // Cut on `ends_at`, like the list's "Akan datang" tab: a meeting in progress is still on the agenda.
        sql`${event.endsAt} > ${instant(clock.now)}`,
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
