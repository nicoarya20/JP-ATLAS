/**
 * Loads what the task detail writes (S2-06: checklist, comments, timeline) decide on: the policy
 * subject and the caller's membership. A missing, trashed or hidden task all come back as null,
 * so every caller answers the same `NOT_FOUND` (IDOR, C-ACC-3).
 */
import { eq } from 'drizzle-orm';
import { canViewTask } from '../access/task.policy';
import type { Membership, Principal, TaskSubject } from '../access/types';
import { task } from '../db/schema';
import type { Executor } from '../pm/tx';
import { loadMembership } from '../project/membership.query';
import { resolveTaskRef } from './task-detail.query';

export type TaskAccess = { subject: TaskSubject; m: Membership };

/**
 * The task `ref` names when `p` may see it. `lock` takes the row lock (FOR UPDATE) so writes that
 * count or reorder the task's children serialize per task instead of racing past a limit.
 */
export async function loadTaskAccess(
  p: Principal,
  ref: string,
  exec: Executor,
  lock = false,
): Promise<TaskAccess | null> {
  const found = await resolveTaskRef(ref, exec);
  if (!found) return null;
  const query = exec
    .select({
      id: task.id,
      projectId: task.projectId,
      status: task.status,
      createdBy: task.createdBy,
      assigneeId: task.assigneeId,
      reviewerId: task.reviewerId,
      needsReview: task.needsReview,
      deletedAt: task.deletedAt,
      deletedBy: task.deletedBy,
    })
    .from(task)
    .where(eq(task.id, found.id));
  const [row] = lock ? await query.for('update') : await query;
  if (!row) return null;
  // `resolveTaskRef` only finds live tasks in live projects, so the project trash stamp is null.
  const subject: TaskSubject = { ...row, projectDeletedAt: null };
  const m = (await loadMembership(p.id, [row.projectId], exec)).get(row.projectId) ?? null;
  return canViewTask(p, subject, m).ok ? { subject, m } : null;
}

/** Bumps the task's `last_activity_at` (drives the "Mandek" label) after a checklist or comment write. */
export async function touchTask(exec: Executor, taskId: string, now: Date): Promise<void> {
  await exec.update(task).set({ lastActivityAt: now }).where(eq(task.id, taskId));
}
