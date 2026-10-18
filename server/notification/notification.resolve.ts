/**
 * Closing Inbox cards (S3 I03, P5 §5.3 butir 4): a card disappears because the thing it asked for
 * happened, not because someone dismissed it. Both functions are called from the service that
 * changed the target, inside the same `tx`, so every path — session, API key and later MCP —
 * closes the card without its own code.
 */
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { notification } from '../db/schema';
import type { Executor } from '../pm/tx';
import type { NotificationKind, NotificationRef, ResolveReason } from './notification.types';

export type ResolveQuery = {
  /** The task, project, account or event whose cards are closed. */
  ref: NotificationRef;
  /** Narrow to these kinds; left out, every open card on the ref is closed. */
  kinds?: readonly NotificationKind[];
  /** Narrow to one person's card; left out, the cards of everyone on the ref are closed. */
  recipientId?: string | null;
  reason: ResolveReason;
  /** Resolve time; defaults to now. Tests pin it, services leave it out. */
  at?: Date;
};

/**
 * Marks the matching open cards resolved and returns how many were closed. Idempotent: it only
 * ever touches rows whose `resolved_at` is still NULL, so calling it twice returns n and then 0.
 * One query, carried by the partial index on `(ref_type, ref_id) WHERE resolved_at IS NULL`.
 */
export async function resolveNotifications(exec: Executor, q: ResolveQuery): Promise<number> {
  // An empty `kinds` list means "no kind matches"; sending it to SQL would be invalid `IN ()`.
  if (q.kinds && q.kinds.length === 0) return 0;
  const at = q.at ?? new Date();
  const rows = await exec
    .update(notification)
    .set({ resolvedAt: at, resolvedReason: q.reason, updatedAt: at })
    .where(
      and(
        eq(notification.refType, q.ref.type),
        eq(notification.refId, q.ref.id),
        isNull(notification.resolvedAt),
        q.kinds ? inArray(notification.kind, [...q.kinds]) : undefined,
        q.recipientId ? eq(notification.recipientId, q.recipientId) : undefined,
      ),
    )
    .returning({ id: notification.id });
  return rows.length;
}

/**
 * Removes every card a user holds for one project, used when they are taken off it: the cards are
 * deleted rather than resolved, because a former member must not keep reading the project's titles
 * in their Inbox (R12 C-INB-1). Cards of other projects and of other people are untouched.
 */
export async function dropForUserInProject(
  exec: Executor,
  userId: string,
  projectId: string,
): Promise<number> {
  const rows = await exec
    .delete(notification)
    .where(and(eq(notification.recipientId, userId), eq(notification.projectId, projectId)))
    .returning({ id: notification.id });
  return rows.length;
}
