/**
 * Guest list of an event: who is on it, and the batched lookups the reads need once per page
 * rather than once per row (P6 §6 E-03), so the query count stays constant however long the list.
 *
 * Nothing here ever selects `user.email` or `profile.phone`: a guest list is shown to everyone who
 * can open the event, so it carries ids and display names only (Q8).
 *
 * A leaf module on purpose: it reads and writes `event_participant` and nothing else, so
 * `events.query.ts` may import it without a cycle. The guarded `addParticipants` /
 * `removeParticipant` entry points live in `events.service.ts`, where the event row is loaded.
 */
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import { eventParticipant, profile, user } from '../db/schema';
import type { Executor, Tx } from '../pm/tx';
import type { PersonRef } from './events.dto';

/** Aggregate of one event's guest list: how many, and whether the viewer is one of them. */
export type ParticipantSummary = { total: number; isParticipant: boolean };

const EMPTY_SUMMARY: ParticipantSummary = { total: 0, isParticipant: false };

/**
 * Display names for `ids` in one query; the profile name wins over the sign-in name when filled in.
 * Mirrors `loadPeople` of the task slice deliberately rather than importing it: the two slices own
 * their own reads, and this one must stay provably free of contact columns.
 */
export async function loadEventPeople(
  ids: readonly (string | null)[],
  exec: Executor = db,
): Promise<Map<string, PersonRef>> {
  const wanted = [...new Set(ids.filter((id): id is string => id !== null))];
  const found = new Map<string, PersonRef>();
  if (wanted.length === 0) return found;
  const rows = await exec
    .select({
      id: user.id,
      name: sql<string>`coalesce(nullif(btrim(${profile.displayName}), ''), ${user.name})`,
    })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(inArray(user.id, wanted));
  for (const r of rows) found.set(r.id, r);
  return found;
}

/**
 * Guest-list aggregate for a whole page in one query: the head count per event and whether
 * `viewerId` is on each list. `bool_or` does the membership test in the database, so the page
 * needs no second round trip and no row-by-row lookup.
 */
export async function loadParticipantSummaries(
  viewerId: string,
  eventIds: readonly string[],
  exec: Executor = db,
): Promise<Map<string, ParticipantSummary>> {
  const ids = [...new Set(eventIds)];
  const out = new Map<string, ParticipantSummary>();
  // `IN ()` is invalid SQL, and an empty page needs no round trip anyway.
  if (ids.length === 0) return out;
  const rows = await exec
    .select({
      eventId: eventParticipant.eventId,
      total: sql<number>`count(*)::int`,
      mine: sql<boolean>`bool_or(${eventParticipant.userId} = ${viewerId})`,
    })
    .from(eventParticipant)
    .where(inArray(eventParticipant.eventId, ids))
    .groupBy(eventParticipant.eventId);
  for (const r of rows) out.set(r.eventId, { total: r.total, isParticipant: r.mine });
  // An event nobody is on yet is absent from the aggregate, not missing from the page.
  for (const id of ids) if (!out.has(id)) out.set(id, { ...EMPTY_SUMMARY });
  return out;
}

/** The guest list of one event as the detail shows it, ordered oldest invite first. */
export async function loadParticipants(eventId: string, exec: Executor = db): Promise<PersonRef[]> {
  const rows = await exec
    .select({
      id: user.id,
      name: sql<string>`coalesce(nullif(btrim(${profile.displayName}), ''), ${user.name})`,
    })
    .from(eventParticipant)
    .innerJoin(user, eq(user.id, eventParticipant.userId))
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(eq(eventParticipant.eventId, eventId))
    .orderBy(eventParticipant.addedAt, user.id);
  return rows;
}

/** Inserts guests, skipping the ones already on the list; returns the ids that were new (they get the invitation card). */
export async function inviteOnto(
  tx: Tx,
  eventId: string,
  userIds: readonly string[],
  addedBy: string,
): Promise<string[]> {
  const wanted = [...new Set(userIds)];
  if (wanted.length === 0) return [];
  const inserted = await tx
    .insert(eventParticipant)
    .values(wanted.map((userId) => ({ eventId, userId, addedBy })))
    // Re-inviting someone is a no-op, not an error: two organisers may add the same person.
    .onConflictDoNothing()
    .returning({ userId: eventParticipant.userId });
  return inserted.map((r) => r.userId);
}
