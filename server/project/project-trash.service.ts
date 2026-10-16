/**
 * Project Trash writes (S1-05): move a project to the Trash and restore it (R02 §3.5). Each one runs
 * in one `inTx` that first locks the project row FOR UPDATE, so a delete and a restore of the same
 * project never interleave. Only tasks still live at delete time are tagged `deleted_with_project_id`;
 * a task trashed earlier on its own keeps its own Trash entry and is not restored with the project.
 * There is no permanent delete or purge here: both belong to S6.
 */
import { and, eq } from 'drizzle-orm';
import { canRestoreProject, canTrashProject } from '../access/project.policy';
import { ACCESS_RULES } from '../access/rules';
import type { Membership, Principal } from '../access/types';
import { project, task } from '../db/schema';
import type { MetricsConfig } from '../metrics/types';
import { getMetrics } from '../pm/metrics-env';
import { isLive } from '../pm/soft-delete';
import { inTx, type Tx } from '../pm/tx';
import { loadMembership } from './membership.query';
import {
  type LockedProject,
  lockProject,
  logActivity,
  refused,
  type WriteResult,
} from './project.service';

/** The project that moved and how many of its tasks moved with it. */
export type TrashChange = { id: string; tasks: number };

/** Locks the project and loads the caller's membership; `run` decides and writes in the same `tx`. */
function locked<T>(
  projectId: string,
  p: Principal,
  run: (tx: Tx, row: LockedProject, m: Membership) => Promise<WriteResult<T>>,
): Promise<WriteResult<T>> {
  return inTx(async (tx) => {
    const row = await lockProject(tx, projectId);
    if (!row) return { ok: false, code: 'NOT_FOUND' };
    const m = (await loadMembership(p.id, [projectId], tx)).get(projectId) ?? null;
    return run(tx, row, m);
  });
}

/**
 * Moves the project and its live tasks to the Trash. Allowed for Super-admin, Admin and a
 * Project Manager who manages it; a Member-manager gets `ROLE_CANNOT_TRASH` (15 Oct 2026 decision).
 */
export function trashProject(
  p: Principal,
  projectId: string,
  now: Date = new Date(),
): Promise<WriteResult<TrashChange>> {
  // Q9: deleting is destructive; refuse before opening a transaction.
  if (p.impersonating) return Promise.resolve({ ok: false, code: 'IMPERSONATING' });
  return locked(projectId, p, async (tx, row, m) => {
    const decision = canTrashProject(p, row, m);
    if (!decision.ok) return refused(decision);
    await tx.update(project).set({ deletedAt: now, deletedBy: p.id }).where(eq(project.id, row.id));
    const moved = await tx
      .update(task)
      .set({ deletedAt: now, deletedBy: p.id, deletedWithProjectId: row.id })
      .where(and(eq(task.projectId, row.id), isLive(task)))
      .returning({ id: task.id });
    await logActivity(tx, p, row.id, 'trashed', { tasks: moved.length });
    return { ok: true, value: { id: row.id, tasks: moved.length } };
  });
}

/**
 * Brings a trashed project back with exactly the tasks that went with it. Any manager of the
 * project (Member-managers too) and Admin/Super-admin may; past the retention period it is `EXPIRED`.
 */
export function restoreProject(
  p: Principal,
  projectId: string,
  now: Date = new Date(),
  metrics: MetricsConfig = getMetrics(),
): Promise<WriteResult<TrashChange>> {
  if (p.impersonating) return Promise.resolve({ ok: false, code: 'IMPERSONATING' });
  return locked(projectId, p, async (tx, row, m) => {
    const decision = canRestoreProject(p, row, m, now, ACCESS_RULES, metrics);
    if (!decision.ok) return refused(decision);
    await tx
      .update(project)
      .set({ deletedAt: null, deletedBy: null })
      .where(eq(project.id, row.id));
    const back = await tx
      .update(task)
      .set({ deletedAt: null, deletedBy: null, deletedWithProjectId: null })
      .where(eq(task.deletedWithProjectId, row.id))
      .returning({ id: task.id });
    await logActivity(tx, p, row.id, 'restored', { tasks: back.length });
    return { ok: true, value: { id: row.id, tasks: back.length } };
  });
}
