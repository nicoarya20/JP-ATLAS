/**
 * SQL fragments and row-level reads for the event queries (P6 §6 E-03). Kept apart from the query
 * files, the way `server/task/task.sql.ts` sits beside `task.query.ts`, so the list, the detail and
 * the Agenda share one definition of "which events exist for this viewer" and one row mapping.
 *
 * This is the base of the slice's import chain: `events.participants`, `events.query` and
 * `events.service` all read from here and nothing here reads from them.
 */
import { and, asc, desc, eq, ilike, inArray, isNull, type SQL, sql } from 'drizzle-orm';
import type { EventSubject, Membership, Principal } from '../access/types';
import { db } from '../db';
import { event, project } from '../db/schema';
import type { CursorKey } from '../pm/keyset';
import type { Executor } from '../pm/tx';
import { loadMembership } from '../project/membership.query';
import { liveEvent } from './events.access';
import {
  EVENT_SEARCH_MAX,
  type EventRow,
  type EventTab,
  type ListEventsInput,
  type ProjectRef,
} from './events.dto';

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
// silently drop the events that belong to nobody's project.
export const onProject = eq(project.id, event.projectId);

/** A live event whose project (if any) is not itself in the Trash. */
export const listable = and(liveEvent, isNull(project.deletedAt));

/** The ISO instant of a Date for a raw `sql` fragment; a timestamptz column needs the cast (X1 D7). */
export const instant = (d: Date) => sql`${d.toISOString()}::timestamptz`;

/** `LIKE` search on the title; `%`, `_` and the escape character are literal, backslash being the Postgres default. */
function titleMatches(q: string): SQL {
  return ilike(event.title, `%${q.replace(/[\\%_]/g, '\\$&')}%`);
}

/** The half of the timeline a tab shows; both cut on `starts_at` against the same `now`. */
export function inTab(tab: EventTab, now: Date): SQL {
  return tab === 'upcoming'
    ? sql`${event.startsAt} >= ${instant(now)}`
    : sql`${event.startsAt} < ${instant(now)}`;
}

/** Keyset step in the tab's own direction: upcoming runs forwards in time, past backwards. */
export function afterCursor(tab: EventTab, key: CursorKey): SQL {
  // The cursor's sort value is always an ISO instant written by `encodeCursor`, never a Date object.
  const at = sql`${String(key.sortValue)}::timestamptz`;
  return tab === 'upcoming'
    ? sql`(${event.startsAt}, ${event.id}) > (${at}, ${key.id})`
    : sql`(${event.startsAt}, ${event.id}) < (${at}, ${key.id})`;
}

/** Row order of a tab; the id breaks ties so the keyset can never skip or repeat a row. */
export const orderFor = (tab: EventTab) =>
  tab === 'upcoming'
    ? [asc(event.startsAt), asc(event.id)]
    : [desc(event.startsAt), desc(event.id)];

/** The WHERE conditions the caller's filters add; undefined entries are dropped by `and`. */
export function filtersOf(i: ListEventsInput): (SQL | undefined)[] {
  const q = i.q?.trim().slice(0, EVENT_SEARCH_MAX);
  return [
    i.projectId ? eq(event.projectId, i.projectId) : undefined,
    i.kind?.length ? inArray(event.kind, [...i.kind]) : undefined,
    q ? titleMatches(q) : undefined,
  ];
}

/** `null` stays `null`; a Date leaves the server as an ISO string. */
export const iso = (d: Date | null) => (d === null ? null : d.toISOString());

/** The project of an event as the DTOs show it, or null for a personal event. */
export const projectRefOf = (r: EventRow): ProjectRef | null =>
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

/** One event row by id, project columns joined, with no visibility filter; callers gate it themselves. */
export async function loadEventRow(id: string, exec: Executor = db): Promise<EventRow | undefined> {
  const [row] = await exec
    .select(eventColumns)
    .from(event)
    .leftJoin(project, onProject)
    .where(eq(event.id, id));
  return row;
}

/** The viewer's membership of a project, or null for a personal event (no query needed). */
export async function membershipFor(
  p: Principal,
  projectId: string | null,
  exec: Executor = db,
): Promise<Membership> {
  if (!projectId) return null;
  return (await loadMembership(p.id, [projectId], exec)).get(projectId) ?? null;
}
