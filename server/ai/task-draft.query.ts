/**
 * Read side of "Tulis saja": the permission to draft in a project (the same decision as creating a
 * task there) and what the matcher needs from it: the project's workers and active task kinds.
 */
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { canCreateTask } from '../access/task.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { project, projectMember, user } from '../db/schema';
import type { PmCode } from '../pm/errors';
import { loadMembership } from '../project/membership.query';
import { TASK_WORKER_ROLES } from '../task/task.limits';
import { loadTaskKinds } from '../task/task-form.query';
import { TASK_DRAFT_MEMBERS_MAX } from './task-draft.limits';
import { cleanName, type DraftMember } from './task-draft.members';

export type DraftContext = {
  members: DraftMember[];
  kinds: Array<{ id: string; name: string }>;
};

export type DraftContextResult = ({ ok: true } & DraftContext) | { ok: false; code: PmCode };

/** Pengelola and Anggota of the project by name; a Pemantau cannot do the work, so is not offered. */
async function loadWorkers(projectId: string): Promise<DraftMember[]> {
  const rows = await db
    .select({ id: user.id, name: user.name })
    .from(projectMember)
    .innerJoin(user, eq(user.id, projectMember.userId))
    .where(
      and(
        eq(projectMember.projectId, projectId),
        inArray(projectMember.role, [...TASK_WORKER_ROLES]),
      ),
    )
    .orderBy(sql`lower(${user.name})`, asc(user.id))
    .limit(TASK_DRAFT_MEMBERS_MAX);
  return rows.map((r) => ({ id: r.id, name: cleanName(r.name) })).filter((m) => m.name.length > 0);
}

/**
 * Whether `p` may draft tasks in `projectId` and, if so, the people and kinds to match against.
 * Refusals use the codes of task creation: 404 for a project the caller cannot see, 403 for a
 * Pemantau, 409 for a project in the Trash or closed to task writes.
 */
export async function loadDraftContext(
  p: Principal,
  projectId: string,
): Promise<DraftContextResult> {
  const [proj] = await db
    .select({
      id: project.id,
      status: project.status,
      leadId: project.leadId,
      deletedAt: project.deletedAt,
      deletedBy: project.deletedBy,
    })
    .from(project)
    .where(eq(project.id, projectId));
  if (!proj) return { ok: false, code: 'NOT_FOUND' };
  const membership = (await loadMembership(p.id, [proj.id])).get(proj.id) ?? null;
  const allowed = canCreateTask(p, proj, membership);
  if (!allowed.ok) return { ok: false, code: allowed.code };
  const [members, kinds] = await Promise.all([loadWorkers(proj.id), loadTaskKinds([proj.id])]);
  return {
    ok: true,
    members,
    kinds: (kinds.get(proj.id) ?? []).map((k) => ({ id: k.id, name: k.name })),
  };
}
