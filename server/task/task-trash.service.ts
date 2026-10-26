/**
 * Task Trash writes (S6 D1): send a task to the Trash and bring it back. Both run in one `inTx` that
 * locks the task row FOR UPDATE, so two deletes (or a delete and a restore) of one task never
 * interleave and the loser reads the fresh state. Only `deleted_at`/`deleted_by` change: the status,
 * the number and the steps stay, so a restored task comes back exactly as it left. A task that went
 * with its project (`deleted_with_project_id`) is not restorable on its own; the project restore
 * brings it. There is no permanent delete or purge here: both belong to the S6 Trash slice.
 *
 * Both writes also leave a `task_activity` row, so the task's own history tells why it vanished and
 * came back instead of staying silent; the audit entry the route writes is unchanged and still the
 * super-admin's record.
 *
 * DECISION (26 Oct 2026) — a task that goes with its project (`deleted_with_project_id`) gets NO
 * history row of its own, in either direction. Its story is told once, on the project: the project
 * timeline already carries `trashed`/`restored` with the task count (`project/project-trash.service.ts`),
 * and a project holding hundreds of tasks would otherwise insert one row per task inside the single
 * transaction that deletes it. The two directions stay consistent: neither the cascade delete nor the
 * cascade restore writes task rows, so a task never shows one half of the pair.
 */
import { eq } from 'drizzle-orm';
import { canViewTask } from '../access/task.policy';
import { canRestoreTask, canTrashTask } from '../access/trash.policy';
import type { Membership, Principal, TaskSubject } from '../access/types';
import { project, task, taskActivity } from '../db/schema';
import type { MetricsConfig } from '../metrics/types';
import type { PmCode } from '../pm/errors';
import { getMetrics } from '../pm/metrics-env';
import { inTx, type Tx } from '../pm/tx';
import { loadMembership } from '../project/membership.query';
import { TASK_ACTIVITY } from './task.limits';
import { resolveTaskRef } from './task-detail.query';
import { loadPeople } from './task.lookup.query';

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

type TrashAction = typeof TASK_ACTIVITY.trash | typeof TASK_ACTIVITY.restore;

/**
 * Appends the Trash line to the task's timeline on `tx`, the same transaction that moves
 * `deleted_at`/`deleted_by`, so history can never record a move that rolled back (or miss one that
 * went through). The display name is read here instead of taken from the route: `actor_name` is only
 * read once the account is gone, and this is the label the timeline shows while it is still there.
 * The payload carries the task number alone — the sentence needs nothing else, and the title is
 * already on the page the row is read from.
 */
async function logTrashActivity(
  tx: Tx,
  p: Principal,
  row: TrashedTask,
  action: TrashAction,
  now: Date,
): Promise<void> {
  const name = (await loadPeople([p.id], tx)).get(p.id)?.name ?? null;
  await tx.insert(taskActivity).values({
    taskId: row.id,
    actorId: p.id,
    actorName: name,
    action,
    payload: { number: row.number },
    // Same stamp as `deleted_at`, so the row sorts where the move happened.
    createdAt: now,
  });
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
    await logTrashActivity(tx, p, row, TASK_ACTIVITY.trash, now);
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
    await logTrashActivity(tx, p, row, TASK_ACTIVITY.restore, now);
    return { ok: true, value: row };
  });
}
