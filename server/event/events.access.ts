/**
 * Visibility of events decided in SQL (P6 §5), the twin of `canViewEvent` in
 * `server/access/event.policy.ts`. One predicate, no N+1: a page never holds a row the viewer
 * may not see, however many events match.
 *
 * The four reachable paths are the same in both places — Admin, creator, guest list, project
 * membership — plus the non-member Project Manager's read of *project* events (P-A1 / Q7).
 * A personal event (no project) is deliberately outside that widening, so a Project Manager
 * never sees someone else's private appointment.
 */
import { and, eq, exists, inArray, isNotNull, or, type SQL, sql } from 'drizzle-orm';
import { atLeast, isPmOrAbove, levelOf } from '../access/level';
import type { Principal } from '../access/types';
import { db } from '../db';
import { event, eventParticipant, projectMember } from '../db/schema';

/** Live event: one trashed on its own or together with its project is never listed. */
export const liveEvent = sql`${event.deletedAt} IS NULL`;

/** `true` when `p` may read every event, whatever its project: Admin and Super-admin (K6). */
function readsEverything(p: Principal): boolean {
  // Membership is irrelevant: `levelOf` returns 'admin' from the account role alone.
  return atLeast(levelOf(p, null), 'admin');
}

/** EXISTS on the guest list for `p`; one correlated subquery, not a join, so it cannot duplicate rows. */
function isGuest(p: Principal): SQL {
  return exists(
    db
      .select({ one: sql`1` })
      .from(eventParticipant)
      .where(and(eq(eventParticipant.eventId, event.id), eq(eventParticipant.userId, p.id))),
  );
}

/** The events `p` belongs to through a project they are a member of, in any project role. */
function inMyProjects(p: Principal): SQL {
  return inArray(
    event.projectId,
    db
      .select({ id: projectMember.projectId })
      .from(projectMember)
      .where(eq(projectMember.userId, p.id)),
  );
}

/**
 * The WHERE fragment restricting a query to the events `p` may see, or `undefined` for a
 * principal who may see all of them (so `and()` drops the condition entirely).
 */
export function visibleEventsWhere(p: Principal): SQL | undefined {
  if (readsEverything(p)) return undefined;
  const paths: SQL[] = [eq(event.createdBy, p.id), isGuest(p), inMyProjects(p)];
  // P-A1 (Q7): a Project Manager reads every event that hangs off a project, member or not.
  if (isPmOrAbove(p)) paths.push(isNotNull(event.projectId));
  return or(...paths) as SQL;
}

/**
 * In-memory twin of `visibleEventsWhere`, used as the oracle in the parity tests (D6) and by
 * `isParticipant` callers that already hold the row. `myProjectIds` is the set of projects `p`
 * is a member of, in any role.
 */
export function matchesEventVisibility(
  p: Principal,
  row: { projectId: string | null; createdBy: string | null; isParticipant: boolean },
  myProjectIds: readonly string[],
): boolean {
  if (readsEverything(p)) return true;
  if (row.createdBy === p.id || row.isParticipant) return true;
  if (row.projectId === null) return false;
  return myProjectIds.includes(row.projectId) || isPmOrAbove(p);
}
