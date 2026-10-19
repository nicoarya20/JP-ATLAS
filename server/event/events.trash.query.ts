/**
 * Read side of the event Trash (P6 §6 E-07), the twin of `server/task/task-trash.query.ts`: which
 * trashed events the caller may see and how one Trash row looks. An event that went with its
 * project (`deleted_with_project_id`) is not a row of its own: the project row stands for it. An
 * event trashed before its project stays a row, flagged `blockedBy` while the project is in the
 * Trash. The page query (`server/trash/trash.list.query.ts`) picks the ids; this file turns them
 * into rows in three statements (events, the caller's memberships, the guest flag) whatever the
 * page size.
 */
import { and, eq, inArray, isNotNull, isNull, or, type SQL } from 'drizzle-orm';
import { buildCaps } from '../access/capabilities';
import { canRestoreEvent } from '../access/event.policy';
import { canPurge, type TrashItemCaps, trashListScope } from '../access/trash.policy';
import type { EventSubject, Principal } from '../access/types';
import { db } from '../db';
import { event, project, projectMember, user } from '../db/schema';
import { METRICS } from '../metrics/config';
import { isoDateIn } from '../metrics/dates';
import { lastRestorableDate } from '../metrics/trash.metrics';
import type { IsoDate, MetricsConfig } from '../metrics/types';
import type { EventKind } from '../pm/enums';
import type { Executor } from '../pm/tx';
import { loadMembership } from '../project/membership.query';
import { loadParticipantSummaries } from './events.participants';

/** One trashed event as the Trash page shows it; dates are decided by the server. */
export type TrashEventItem = {
  kind: 'event';
  id: string;
  title: string;
  /** The event's own kind (meeting, review…); `kind` above is the Trash discriminator. */
  eventKind: EventKind;
  /** ISO instant the event was to start. */
  startsAt: string;
  /** Null for a personal event. */
  project: { id: string; name: string } | null;
  /** Set while the event's project is in the Trash: the event only comes back after the project does. */
  blockedBy: { projectId: string; name: string } | null;
  /** ISO instant of the delete. */
  deletedAt: string;
  /** Id and name only (Q8); null when the deleting account no longer exists. */
  deletedBy: { id: string; name: string } | null;
  /** Last calendar day (team zone) the event may still be restored. */
  restorableUntil: IsoDate;
  can: TrashItemCaps;
};

/**
 * SQL twin of who may restore: Admin/Super-admin see every one; anyone else sees what they
 * deleted, what they created and the events of projects they manage, so a listed row and its
 * restore button never disagree.
 */
export function trashEventWhere(p: Principal, exec: Executor): SQL {
  const own = and(isNotNull(event.deletedAt), isNull(event.deletedWithProjectId)) as SQL;
  const scope = trashListScope(p);
  if (scope.kind === 'all') return own;
  const managed = exec
    .select({ id: projectMember.projectId })
    .from(projectMember)
    .where(and(eq(projectMember.userId, scope.userId), eq(projectMember.role, 'manager')));
  return and(
    own,
    or(
      eq(event.deletedBy, scope.userId),
      eq(event.createdBy, scope.userId),
      inArray(event.projectId, managed),
    ),
  ) as SQL;
}

/** The Trash rows of these event ids (already scoped by the caller's page query), keyed by id. */
export async function hydrateTrashEvents(
  p: Principal,
  ids: readonly string[],
  now: Date,
  metrics: MetricsConfig = METRICS,
  exec: Executor = db,
): Promise<Map<string, TrashEventItem>> {
  const out = new Map<string, TrashEventItem>();
  if (ids.length === 0) return out;
  const rows = await exec
    .select({
      id: event.id,
      title: event.title,
      eventKind: event.kind,
      startsAt: event.startsAt,
      createdBy: event.createdBy,
      canceledAt: event.canceledAt,
      deletedAt: event.deletedAt,
      deletedBy: event.deletedBy,
      deletedByName: user.name,
      projectId: event.projectId,
      projectName: project.name,
      projectDeletedAt: project.deletedAt,
    })
    .from(event)
    .leftJoin(project, eq(project.id, event.projectId))
    .leftJoin(user, eq(user.id, event.deletedBy))
    .where(and(inArray(event.id, [...ids]), isNotNull(event.deletedAt)));
  const [memberships, guests] = await Promise.all([
    loadMembership(
      p.id,
      rows.flatMap((r) => (r.projectId ? [r.projectId] : [])),
      exec,
    ),
    loadParticipantSummaries(p.id, ids, exec),
  ]);
  for (const r of rows) {
    // The `where` above already excludes live rows; the guard only narrows the type.
    if (!r.deletedAt) continue;
    const subject: EventSubject = {
      id: r.id,
      projectId: r.projectId,
      createdBy: r.createdBy,
      canceledAt: r.canceledAt,
      deletedAt: r.deletedAt,
      deletedBy: r.deletedBy,
      projectDeletedAt: r.projectDeletedAt,
      isParticipant: guests.get(r.id)?.isParticipant ?? false,
    };
    const m = r.projectId ? (memberships.get(r.projectId) ?? null) : null;
    const hasProject = r.projectId !== null && r.projectName !== null;
    out.set(r.id, {
      kind: 'event',
      id: r.id,
      title: r.title,
      eventKind: r.eventKind,
      startsAt: r.startsAt.toISOString(),
      project: hasProject ? { id: r.projectId as string, name: r.projectName as string } : null,
      blockedBy:
        hasProject && r.projectDeletedAt
          ? { projectId: r.projectId as string, name: r.projectName as string }
          : null,
      deletedAt: r.deletedAt.toISOString(),
      deletedBy: r.deletedBy && r.deletedByName ? { id: r.deletedBy, name: r.deletedByName } : null,
      restorableUntil: lastRestorableDate(isoDateIn(r.deletedAt, metrics.TIME_ZONE), metrics),
      can: buildCaps({
        restore: canRestoreEvent(p, subject, m, now, undefined, metrics),
        purge: canPurge(p),
      }),
    });
  }
  return out;
}
