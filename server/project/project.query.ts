/**
 * Read side of projects: one project's detail and its member list. The list lives in
 * `project-list.query.ts` and is re-exported here, so callers keep one import path (S1-02).
 */
import { and, count, eq } from 'drizzle-orm';
import { projectCaps } from '../access/capabilities';
import { canViewProject } from '../access/project.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { profile, projectMember, task, user } from '../db/schema';
import { METRICS } from '../metrics/config';
import type { MetricsConfig } from '../metrics/types';
import { PROJECT_MEMBER_ROLES } from '../pm/enums';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';
import { displayNameSql } from '../profile/profile.name';
import { loadMembership } from './membership.query';
import { type ProjectDetail, type ProjectMemberItem, toDetail } from './project.dto';
import { loadConditionInputs, planOf } from './project-condition.query';
import { loadProjectHistory } from './project-deadline.query';
import { loadProject, loadTasks } from './project-rows.query';

export {
  ATTENTION_CONDITIONS,
  ATTENTION_SCAN_LIMIT,
  type ListProjectsInput,
  listProjects,
  PROJECT_SORTS,
  type ProjectSort,
} from './project-list.query';

/** Detail with `can{}`, or null when the project is missing, trashed or hidden from the caller (D8: same 404). */
export async function getProjectDetail(
  p: Principal,
  projectId: string,
  now: Date,
  exec: Executor = db,
  cfg: MetricsConfig = METRICS,
): Promise<ProjectDetail | null> {
  const row = await loadProject(exec, projectId);
  if (!row) return null;
  const membership = (await loadMembership(p.id, [projectId], exec)).get(projectId) ?? null;
  // View first: `can{}` of a hidden project must never be computed, let alone returned.
  if (!canViewProject(p, row, membership).ok) return null;
  const [tasks, plans, [live], history] = await Promise.all([
    loadTasks(exec, [projectId]),
    loadConditionInputs([projectId], now, exec),
    // Canceled tasks are outside `loadTasks` but still move to the Trash with the project (S1-18 dialog).
    exec
      .select({ n: count() })
      .from(task)
      .where(and(eq(task.projectId, projectId), isLive(task))),
    loadProjectHistory(exec, projectId, row.status, now),
  ]);
  const can = projectCaps(p, row, membership);
  return toDetail(
    row,
    tasks.get(projectId) ?? [],
    membership,
    can,
    now,
    cfg,
    live?.n ?? 0,
    planOf(plans, projectId),
    history,
  );
}

const ROLE_RANK = new Map<string, number>(PROJECT_MEMBER_ROLES.map((r, i) => [r, i]));

/** Members of a project, managers first then by name; null when the caller may not see the project. */
export async function listProjectMembers(
  p: Principal,
  projectId: string,
  exec: Executor = db,
): Promise<ProjectMemberItem[] | null> {
  const row = await loadProject(exec, projectId);
  if (!row) return null;
  const mine = (await loadMembership(p.id, [projectId], exec)).get(projectId) ?? null;
  if (!canViewProject(p, row, mine).ok) return null;
  const rows = await exec
    .select({
      userId: user.id,
      name: displayNameSql,
      image: user.image,
      jobTitle: profile.jobTitle,
      role: projectMember.role,
      joinedAt: projectMember.createdAt,
    })
    .from(projectMember)
    .innerJoin(user, eq(user.id, projectMember.userId))
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(eq(projectMember.projectId, projectId));
  return rows
    .sort(
      (a, b) =>
        (ROLE_RANK.get(a.role) ?? 0) - (ROLE_RANK.get(b.role) ?? 0) ||
        a.name.localeCompare(b.name) ||
        a.userId.localeCompare(b.userId),
    )
    .map((r) => ({ ...r, isLead: r.userId === row.leadId, joinedAt: r.joinedAt.toISOString() }));
}
