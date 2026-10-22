/**
 * Event Trash writes (P6 §6 E-07): move an event to the Trash and bring it back, the twin of
 * `server/task/task-trash.service.ts`. Both run in one `inTx` that locks the event row FOR UPDATE, so
 * two deletes (or a delete and a restore) of one event never interleave and the loser reads the
 * fresh state. Only `deleted_at`/`deleted_by` change: the guest list, the minutes and the reminder
 * claims stay, so a restored event comes back exactly as it left. An event that went with its
 * project (`deleted_with_project_id`) is not restorable on its own; the project restore brings it.
 * There is no permanent delete or purge here: both belong to S6.
 */
import { and, eq } from 'drizzle-orm';
import { canRestoreEvent, canTrashEvent } from '../access/event.policy';
import type { EventSubject, Membership, Principal } from '../access/types';
import { event, eventParticipant } from '../db/schema';
import type { MetricsConfig } from '../metrics/types';
import type { PmCode } from '../pm/errors';
import { getMetrics } from '../pm/metrics-env';
import { inTx, type Tx } from '../pm/tx';
import { loadEventRow, membershipFor, subjectOf } from './events.sql';
import { refuse } from './events.validate';

/** The event that moved, as the route and the Urungkan toast name it (`label` is the title). */
export type TrashedEvent = { kind: 'event'; id: string; label: string; projectId: string | null };

export type EventTrashResult =
  | { ok: true; value: TrashedEvent }
  | { ok: false; code: PmCode; error?: string };

type Locked = { subject: EventSubject; membership: Membership; value: TrashedEvent };

/** Locks the event row and loads what the policies read: its project's Trash state and the caller's roles. */
async function lockEvent(tx: Tx, p: Principal, id: string): Promise<Locked | null> {
  // Serialises concurrent deletes and restores of one event.
  const held = await tx.select({ id: event.id }).from(event).where(eq(event.id, id)).for('update');
  if (held.length === 0) return null;
  const row = await loadEventRow(id, tx);
  if (!row) return null;
  const guest = await tx
    .select({ userId: eventParticipant.userId })
    .from(eventParticipant)
    .where(and(eq(eventParticipant.eventId, id), eq(eventParticipant.userId, p.id)));
  return {
    subject: subjectOf(row, guest.length > 0),
    membership: await membershipFor(p, row.projectId, tx),
    value: { kind: 'event', id: row.id, label: row.title, projectId: row.projectId },
  };
}

/**
 * Sends the live event to the Trash. Allowed for whoever may change it: Admin/Super-admin, its
 * creator and a manager of its project. An event that is already in the Trash answers `NOT_FOUND`,
 * like a hidden one, so a repeated delete (a double tap) is harmless.
 */
export function trashEvent(p: Principal, id: string, now: Date): Promise<EventTrashResult> {
  return inTx(async (tx) => {
    const locked = await lockEvent(tx, p, id);
    // A concurrent delete won the lock: the event is gone for this caller too.
    if (!locked || locked.subject.deletedAt) return refuse('NOT_FOUND');
    const decision = canTrashEvent(p, locked.subject, locked.membership);
    if (!decision.ok) return refuse(decision.code);
    await tx.update(event).set({ deletedAt: now, deletedBy: p.id }).where(eq(event.id, id));
    return { ok: true, value: locked.value };
  });
}

/**
 * Brings a trashed event back with its guests and minutes. Allowed for Admin/Super-admin, the
 * creator and a manager of its project; past the retention period it is `EXPIRED`, and while its
 * project is in the Trash it is `PROJECT_IN_TRASH` (restore the project first, it brings the event).
 */
export function restoreEvent(
  p: Principal,
  id: string,
  now: Date,
  metrics: MetricsConfig = getMetrics(),
): Promise<EventTrashResult> {
  return inTx(async (tx) => {
    const locked = await lockEvent(tx, p, id);
    if (!locked) return refuse('NOT_FOUND');
    const decision = canRestoreEvent(p, locked.subject, locked.membership, now, undefined, metrics);
    if (!decision.ok) return refuse(decision.code);
    await tx
      .update(event)
      .set({ deletedAt: null, deletedBy: null, deletedWithProjectId: null })
      .where(eq(event.id, id));
    return { ok: true, value: locked.value };
  });
}
