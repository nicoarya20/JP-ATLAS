/**
 * Inbox cards that point at a row a permanent delete is about to remove (S6, P8 §5).
 *
 * `notification.ref_id` is free text with no foreign key, so nothing in the database clears a card
 * when its task or event row goes. A project purge is covered: `notification.project_id` CASCADEs,
 * and every task and project event card carries it. A task or an event purged **on its own** is
 * not: its project is still alive, and a personal event's cards have `project_id IS NULL`.
 *
 * Leaving those cards behind is worse than it looks. `refNotTrashed` hides a card while its task is
 * in the Trash by asking whether a row with `deleted_at IS NOT NULL` exists; once the row is gone
 * that test passes again, so the card would come **back** into the Inbox with a button leading to a
 * 404. Both purge paths (the route and the retention sweep) call this, so they agree.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { type NotificationRefType, notification } from '../db/schema';
import type { Tx } from '../pm/tx';

/** Deletes the Inbox cards pointing at these rows; returns how many went. Call inside the purge transaction. */
export async function clearItemCards(
  tx: Tx,
  refType: Extract<NotificationRefType, 'task' | 'event'>,
  ids: readonly string[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const gone = await tx
    .delete(notification)
    .where(and(eq(notification.refType, refType), inArray(notification.refId, [...ids])))
    .returning({ id: notification.id });
  return gone.length;
}
