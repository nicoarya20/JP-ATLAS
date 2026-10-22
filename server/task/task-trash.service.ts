/**
 * Task Trash writes (S6 D1): send a task to the Trash and bring it back. Both run in one `inTx` that
 * locks the task row FOR UPDATE, so two deletes (or a delete and a restore) of one task never
 * interleave and the loser reads the fresh state. Only `deleted_at`/`deleted_by` change: the status,
 * the number and the steps stay, so a restored task comes back exactly as it left. A task that went
 * with its project (`deleted_with_project_id`) is not restorable on its own; the project restore
 * brings it. There is no permanent delete or purge here: both belong to the S6 Trash slice.
 */
import { eq } from 'drizzle-orm';
import { canViewTask } from '../access/task.policy';
import { canRestoreTask, canTrashTask } from '../access/trash.policy';
import type { Membership, Principal, TaskSubject } from '../access/types';
import { project, task } from '../db/schema';
import type { MetricsConfig } from '../metrics/types';
import type { PmCode } from '../pm/errors';
import { getMetrics } from '../pm/metrics-env';
import { inTx, type Tx } from '../pm/tx';
import { loadMembership } from '../project/membership.query';
import { resolveTaskRef } from './task-detail.query';

/** The task that moved, as the route and the audit entry name it. */
export type TrashedTask = { id: string; number: number; title: string; projectId: string };

export type TaskTrashResult =
  | { ok: true; value: TrashedTask }
  | { ok: false; code: PmCode; error?: string };

const refused = (code: PmCode): TaskTrashResult => ({ ok: false, code });

type Locked = { subject: TaskSubject; row: TrashedTask; membership: Membership };

/** Locks the task row and loads what the policies read: its project's trash state and the caller's role. */
async function lockTask(tx: Tx, p: Principal, id: string): Promise<Locked | null> {
  const [found] = await tx
    .select({
      id: task.id,
      number: task.number,
      title: task.title,
      projectId: task.projectId,
      status: task.status,
      createdBy: task.createdBy,
      assigneeId: task.assigneeId,
      reviewerId: task.reviewerId,
      needsReview: task.needsReview,
      deletedAt: task.deletedAt,
      deletedBy: task.deletedBy,
      projectDeletedAt: project.deletedAt,
    })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .where(eq(task.id, id))
    // Serialises concurrent deletes and restores of one task.
    .for('update', { of: task });
  if (!found) return null;
  const membership = (await loadMembership(p.id, [found.projectId], tx)).get(found.projectId);
  const { number, title, ...subject } = found;
  return {
    subject: { ...subject, id: found.id },
    row: { id: found.id, number, title, projectId: found.projectId },
    membership: membership ?? null,
  };
}

/**
 * Sends the live task `ref` names (number or id) to the Trash. Allowed for its creator, any manager
 * of the project and Admin/Super-admin. A task that is already in the Trash, or whose project is,
 * answers `NOT_FOUND` like any hidden task, so a repeated delete is harmless.
 */
export function trashTask(
  p: Principal,
  ref: string,
  now: Date = new Date(),
): Promise<TaskTrashResult> {
  return inTx(async (tx) => {
    const found = await resolveTaskRef(ref, tx);
    if (!found) return refused('NOT_FOUND');
    const locked = await lockTask(tx, p, found.id);
    // A concurrent delete won the lock: the task is gone for this caller too.
    if (!locked || locked.subject.deletedAt) return refused('NOT_FOUND');
    const { subject, membership, row } = locked;
    // View first: a hidden task must look missing, never "forbidden" (capabilities.ts ORDER RULE).
    if (!canViewTask(p, subject, membership).ok) return refused('NOT_FOUND');
    const decision = canTrashTask(p, subject, membership);
    if (!decision.ok) return refused(decision.code);
    await tx.update(task).set({ deletedAt: now, deletedBy: p.id }).where(eq(task.id, row.id));
    return { ok: true, value: row };
  });
}

/**
 * Brings a trashed task back by id, with the same number. Allowed for the project's managers,
 * Admin/Super-admin and whoever deleted it; past the retention period it is `EXPIRED`, and while its
 * project is in the Trash it is `PROJECT_IN_TRASH` (restore the project first).
 */
export function restoreTask(
  p: Principal,
  id: string,
  now: Date = new Date(),
  metrics: MetricsConfig = getMetrics(),
): Promise<TaskTrashResult> {
  return inTx(async (tx) => {
    const locked = await lockTask(tx, p, id);
    if (!locked) return refused('NOT_FOUND');
    const { subject, membership, row } = locked;
    const decision = canRestoreTask(p, subject, membership, now, undefined, metrics);
    if (!decision.ok) return refused(decision.code);
    await tx.update(task).set({ deletedAt: null, deletedBy: null }).where(eq(task.id, row.id));
    return { ok: true, value: row };
  });
}
