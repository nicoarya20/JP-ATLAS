/**
 * Read side of the task form (S2-11): the projects the caller may add a task to, each with its
 * active task kinds and phases. Four queries whatever the number of projects; the policy decides, not SQL.
 */
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { atLeast, levelOf } from '../access/level';
import { canViewProject } from '../access/project.policy';
import { canCreateTask } from '../access/task.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { project, projectMember, projectPhase, taskKind } from '../db/schema';
import type { TaskBaseKind } from '../pm/enums';
import type { Executor } from '../pm/tx';
import { loadMembership } from '../project/membership.query';
import { loadProject } from '../project/project-rows.query';

/** Projects offered by the form, by name; more than this is rare in a family team. */
export const TASK_FORM_PROJECT_LIMIT = 100;

export type TaskFormKind = { id: string; name: string; baseKind: TaskBaseKind };
export type TaskFormPhase = { id: string; name: string };
export type TaskFormProject = {
  id: string;
  name: string;
  kinds: TaskFormKind[];
  /** Phases of the project in display order, for the Tahapan picker (H-B5). */
  phases: TaskFormPhase[];
};

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

/** Phases of the given projects in their display order, keyed by project id. */
export async function loadTaskPhases(
  projectIds: readonly string[],
  exec: Executor = db,
): Promise<Map<string, TaskFormPhase[]>> {
  const byProject = new Map<string, TaskFormPhase[]>();
  if (projectIds.length === 0) return byProject;
  const rows = await exec
    .select({ projectId: projectPhase.projectId, id: projectPhase.id, name: projectPhase.name })
    .from(projectPhase)
    .where(inArray(projectPhase.projectId, [...new Set(projectIds)]))
    .orderBy(asc(projectPhase.position), asc(projectPhase.createdAt), asc(projectPhase.id));
  for (const { projectId, ...ph } of rows) {
    const list = byProject.get(projectId) ?? [];
    list.push(ph);
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
  const [memberships, kinds, phases] = await Promise.all([
    loadMembership(p.id, ids, exec),
    loadTaskKinds(ids, exec),
    loadTaskPhases(ids, exec),
  ]);
  return rows
    .filter((r) => canCreateTask(p, r, memberships.get(r.id) ?? null).ok)
    .map((r) => ({
      id: r.id,
      name: r.name,
      kinds: kinds.get(r.id) ?? [],
      phases: phases.get(r.id) ?? [],
    }));
}

/**
 * The form options of one project: its kinds and phases, the same two lists the web Edit loader
 * reads (`app/routes/app/task-edit.tsx`). `null` when the project is missing, in the Trash or
 * hidden from `p`, which the caller answers as the one 404 a hidden record shares with a missing
 * one (D8).
 *
 * Gated on `canViewProject`, not on `canCreateTask`: the Edit form of an existing task needs these
 * lists too, and a Completed or On-hold project may refuse a *new* task (Q12) while its tasks are
 * still editable. Three queries, whatever the project holds.
 */
export async function getTaskFormProject(
  p: Principal,
  projectId: string,
  exec: Executor = db,
): Promise<TaskFormProject | null> {
  const row = await loadProject(exec, projectId);
  if (!row) return null;
  const membership = (await loadMembership(p.id, [projectId], exec)).get(projectId) ?? null;
  // View first: the kinds and phases of a hidden project must never be loaded, let alone returned.
  if (!canViewProject(p, row, membership).ok) return null;
  const [kinds, phases] = await Promise.all([
    loadTaskKinds([projectId], exec),
    loadTaskPhases([projectId], exec),
  ]);
  return {
    id: row.id,
    name: row.name,
    kinds: kinds.get(projectId) ?? [],
    phases: phases.get(projectId) ?? [],
  };
}
