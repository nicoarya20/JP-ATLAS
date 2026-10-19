/**
 * Refusals shared by the task create and update writes (S2-04, H-B5): who may be the assignee, which
 * kind a task may take, and the date order. Each check reads inside the caller's
 * transaction and answers a `Refusal` the service returns as is, or null when the value is fine.
 */
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { projectMember, taskKind } from '../db/schema';
import type { PmCode } from '../pm/errors';
import { DEFAULT_TASK_KINDS } from '../pm/limits';
import type { Tx } from '../pm/tx';
import { isTaskWorkerRole, TASK_WRITE_MESSAGES } from './task.limits';

/** A refused write: the code the route answers with and, for a field problem, the sentence to show. */
export type Refusal = { ok: false; code: PmCode; error?: string };

export const invalid = (error: string): Refusal => ({ ok: false, code: 'VALIDATION', error });
export const refused = (code: PmCode): Refusal => ({ ok: false, code });

/** Refuses an assignee who is not a manager or member of the project (viewers cannot do the work). */
export async function checkWorker(
  tx: Tx,
  projectId: string,
  userId: string,
): Promise<Refusal | null> {
  const [row] = await tx
    .select({ role: projectMember.role })
    .from(projectMember)
    .where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, userId)));
  const works = isTaskWorkerRole(row?.role);
  return works ? null : invalid(TASK_WRITE_MESSAGES.assigneeNotWorker);
}

/** The given kind when it is an active kind of the project, else the project's default ("Tugas") kind. */
export async function resolveKind(
  tx: Tx,
  projectId: string,
  kindId: string | undefined,
): Promise<string | Refusal> {
  const defaultName = DEFAULT_TASK_KINDS[0]?.name ?? '';
  const [row] = await tx
    .select({ id: taskKind.id })
    .from(taskKind)
    .where(
      and(
        eq(taskKind.projectId, projectId),
        isNull(taskKind.archivedAt),
        kindId ? eq(taskKind.id, kindId) : eq(taskKind.baseKind, 'task'),
      ),
    )
    .orderBy(sql`lower(${taskKind.name}) = lower(${defaultName}) DESC`, asc(taskKind.position))
    .limit(1);
  if (row) return row.id;
  return invalid(kindId ? TASK_WRITE_MESSAGES.kindNotInProject : TASK_WRITE_MESSAGES.noDefaultKind);
}

// ISO dates compare correctly as strings.
export const startAfterDue = (start: string | null | undefined, due: string | null | undefined) =>
  Boolean(start && due && start > due);
