/**
 * The 30-day Trash purge (P8 §5, S6): hard-deletes what has been in the Trash past the retention
 * window. "Past" is `deleted_at < purgeBefore(now)`, the same boundary `isRestorable` draws, so an
 * item is never restorable and purgeable at once. Idempotent: a second run finds nothing left.
 *
 * Order is what keeps the FKs honest, one batch per transaction:
 * 1. expired projects: their trashed events first (`event.project_id` is SET NULL, so a project
 *    delete alone would turn them into orphan personal events), then the project row, which
 *    cascades to its tasks, comments, checklists, activity, members, plan and notifications;
 * 2. expired tasks and events that were trashed on their own.
 * Nothing here touches storage: tasks, events and projects own no files (no attachment table).
 */
import { and, count, inArray, isNotNull, lt, or } from 'drizzle-orm';
import { AUDIT_ACTIONS, audit } from '../audit';
import { event, project, task } from '../db/schema';
import { logger } from '../logger';
import { purgeBefore } from '../metrics/trash.metrics';
import type { MetricsConfig } from '../metrics/types';
import { getMetrics } from '../pm/metrics-env';
import { inTx, type Tx } from '../pm/tx';

/** Rows per transaction, so a big backlog is cleared in steps and never holds one long lock. */
export const TRASH_PURGE_BATCH = 200;

/** What one run removed; `tasks` and `events` include the ones that went with a purged project. */
export type TrashPurgeResult = { projects: number; tasks: number; events: number };

const NOTHING: TrashPurgeResult = { projects: 0, tasks: 0, events: 0 };

/** One batch of expired projects with everything that hangs on them; returns how many projects went. */
async function purgeProjectBatch(tx: Tx, cutoff: Date, into: TrashPurgeResult): Promise<number> {
  const rows = await tx
    .select({ id: project.id })
    .from(project)
    .where(and(isNotNull(project.deletedAt), lt(project.deletedAt, cutoff)))
    .orderBy(project.deletedAt)
    .limit(TRASH_PURGE_BATCH)
    // A concurrent restore holds the row lock; skipping it leaves that project for the next run.
    .for('update', { skipLocked: true });
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return 0;
  const [tasks] = await tx.select({ n: count() }).from(task).where(inArray(task.projectId, ids));
  const events = await tx
    .delete(event)
    .where(
      and(
        isNotNull(event.deletedAt),
        or(inArray(event.deletedWithProjectId, ids), inArray(event.projectId, ids)),
      ),
    )
    .returning({ id: event.id });
  await tx.delete(project).where(inArray(project.id, ids));
  into.projects += ids.length;
  into.tasks += tasks?.n ?? 0;
  into.events += events.length;
  return ids.length;
}

/** One batch of expired tasks (or events) that were trashed on their own; returns how many went. */
async function purgeOwnBatch(tx: Tx, cutoff: Date, kind: 'task' | 'event'): Promise<number> {
  const table = kind === 'task' ? task : event;
  const rows = await tx
    .select({ id: table.id })
    .from(table)
    .where(and(isNotNull(table.deletedAt), lt(table.deletedAt, cutoff)))
    .orderBy(table.deletedAt)
    .limit(TRASH_PURGE_BATCH)
    .for('update', { skipLocked: true });
  if (rows.length === 0) return 0;
  await tx.delete(table).where(
    inArray(
      table.id,
      rows.map((r) => r.id),
    ),
  );
  return rows.length;
}

/** Repeats `batch` in its own transaction until a batch comes back short. */
async function drain(batch: (tx: Tx) => Promise<number>): Promise<number> {
  let total = 0;
  for (;;) {
    const n = await inTx(batch);
    total += n;
    if (n < TRASH_PURGE_BATCH) return total;
  }
}

/**
 * Deletes every Trash item older than the retention window as of `now` (injected so tests can pick
 * the day) and returns the counts. Does not audit or log: `runTrashPurge` does, once per run.
 */
export async function purgeTrash(
  now: Date,
  metrics: MetricsConfig = getMetrics(),
): Promise<TrashPurgeResult> {
  const cutoff = purgeBefore(now, metrics);
  const result: TrashPurgeResult = { ...NOTHING };
  await drain((tx) => purgeProjectBatch(tx, cutoff, result));
  result.tasks += await drain((tx) => purgeOwnBatch(tx, cutoff, 'task'));
  result.events += await drain((tx) => purgeOwnBatch(tx, cutoff, 'event'));
  return result;
}

/**
 * One scheduled run: purge, then write a single audit entry with counts only (the retention sweep
 * is the actor; ids and titles stay out of the log). A failure is logged and never propagates.
 */
export async function runTrashPurge(now: Date = new Date()): Promise<TrashPurgeResult> {
  try {
    const result = await purgeTrash(now);
    const total = result.projects + result.tasks + result.events;
    if (total > 0) {
      logger.info(result, 'trash purged');
      void audit({
        actor: null,
        action: AUDIT_ACTIONS.TRASH_RETENTION,
        targetType: 'trash',
        summary: `Pembersihan otomatis menghapus permanen ${result.projects} proyek, ${result.tasks} tugas dan ${result.events} event dari Sampah`,
        meta: result,
      });
    }
    return result;
  } catch (err) {
    logger.warn({ err }, 'trash purge failed');
    return { ...NOTHING };
  }
}
