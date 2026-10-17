/**
 * Read side of the task form (S2-11): the projects the caller may add a task to, each with its
 * active task kinds. Three queries whatever the number of projects; the policy decides, not SQL.
 */
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { atLeast, levelOf } from '../access/level';
import { canCreateTask } from '../access/task.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { project, projectMember, taskKind } from '../db/schema';
import type { TaskBaseKind } from '../pm/enums';
import type { Executor } from '../pm/tx';
import { loadMembership } from '../project/membership.query';

/** Projects offered by the form, by name; more than this is rare in a family team. */
export const TASK_FORM_PROJECT_LIMIT = 100;

export type TaskFormKind = { id: string; name: string; baseKind: TaskBaseKind };
export type TaskFormProject = { id: string; name: string; kinds: TaskFormKind[] };

/** Active kinds of the given projects in their display order, keyed by project id. */
export async function loadTaskKinds(
  projectIds: readonly string[],
  exec: Executor = db,
): Promise<Map<string, TaskFormKind[]>> {
  const byProject = new Map<string, TaskFormKind[]>();
  if (projectIds.length === 0) return byProject;
  const rows = await exec
    .select({
      projectId: taskKind.projectId,
      id: taskKind.id,
      name: taskKind.name,
      baseKind: taskKind.baseKind,
    })
    .from(taskKind)
    .where(and(inArray(taskKind.projectId, [...new Set(projectIds)]), isNull(taskKind.archivedAt)))
    .orderBy(asc(taskKind.position), asc(taskKind.id));
  for (const { projectId, ...k } of rows) {
    const list = byProject.get(projectId) ?? [];
    list.push(k);
    byProject.set(projectId, list);
  }
  return byProject;
}

/**
 * Live projects where `canCreateTask` allows the principal: every project for Admin, otherwise the
 * projects they work in as Pengelola/Anggota. A Pemantau or a non-member PM gets none (P3 §2 Tugas ⑥).
 */
export async function listTaskFormProjects(
  p: Principal,
  exec: Executor = db,
): Promise<TaskFormProject[]> {
  const columns = {
    id: project.id,
    name: project.name,
    status: project.status,
    leadId: project.leadId,
    deletedAt: project.deletedAt,
    deletedBy: project.deletedBy,
  };
  const live = sql`${project.deletedAt} IS NULL`;
  const rows = atLeast(levelOf(p, null), 'admin')
    ? await exec
        .select(columns)
        .from(project)
        .where(live)
        .orderBy(sql`lower(${project.name})`, asc(project.id))
        .limit(TASK_FORM_PROJECT_LIMIT)
    : await exec
        .select(columns)
        .from(project)
        .innerJoin(projectMember, eq(projectMember.projectId, project.id))
        .where(
          and(
            eq(projectMember.userId, p.id),
            inArray(projectMember.role, ['manager', 'member']),
            live,
          ),
        )
        .orderBy(sql`lower(${project.name})`, asc(project.id))
        .limit(TASK_FORM_PROJECT_LIMIT);
  const ids = rows.map((r) => r.id);
  const [memberships, kinds] = await Promise.all([
    loadMembership(p.id, ids, exec),
    loadTaskKinds(ids, exec),
  ]);
  return rows
    .filter((r) => canCreateTask(p, r, memberships.get(r.id) ?? null).ok)
    .map((r) => ({ id: r.id, name: r.name, kinds: kinds.get(r.id) ?? [] }));
}
