/**
 * Read side of projects (S1-02): the list, one project's detail and its member list. At most 6
 * statements per call whatever the page size (R04 §3.7): tasks, memberships, milestones and overrides
 * are fetched for the whole page at once, never per project.
 */
import { and, asc, count, desc, eq, ilike, inArray, ne, type SQL, sql } from 'drizzle-orm';
import { projectCaps } from '../access/capabilities';
import type { RequestedListScope } from '../access/project.policy';
import { canViewProject, clampListScope, projectListScope } from '../access/project.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { profile, project, projectMember, task, user } from '../db/schema';
import type { ConditionTask } from '../metrics/condition';
import { METRICS } from '../metrics/config';
import type { MetricsConfig } from '../metrics/types';
import { PROJECT_MEMBER_ROLES, type ProjectStatus } from '../pm/enums';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';
import { loadMembership } from './membership.query';
import {
  type ProjectDetail,
  type ProjectListItem,
  type ProjectMemberItem,
  type ProjectRow,
  toDetail,
  toListItem,
} from './project.dto';
import { loadConditionInputs, planOf } from './project-condition.query';

export const PROJECT_SORTS = ['due', 'name', 'recent'] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

export type ListProjectsInput = {
  /** What the caller asked for; the real scope is never wider than the policy allows (M11). */
  scope: RequestedListScope;
  status?: ProjectStatus;
  /** Case-insensitive part of the name. */
  q?: string;
  sort?: ProjectSort;
  limit: number;
  offset: number;
  /** Injected so "today" is testable; the handler passes `new Date()`. */
  now: Date;
  metrics?: MetricsConfig;
};

const projectColumns = {
  id: project.id,
  name: project.name,
  description: project.description,
  status: project.status,
  priority: project.priority,
  leadId: project.leadId,
  leadName: user.name,
  startDate: project.startDate,
  dueDate: project.dueDate,
  originalDueDate: project.originalDueDate,
  deletedAt: project.deletedAt,
  deletedBy: project.deletedBy,
};

// Escape LIKE wildcards so a search for "100%" matches the text, not everything.
const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

const ORDER: Record<ProjectSort, SQL[]> = {
  // A missing due date sorts last: "no deadline" is the least urgent, not the most.
  due: [sql`${project.dueDate} ASC NULLS LAST`, sql`lower(${project.name})`, asc(project.id)],
  name: [sql`lower(${project.name})`, asc(project.id)],
  recent: [desc(project.updatedAt), asc(project.id)],
};

/**
 * Tasks of the given projects that still count: live and not canceled, which is exactly the
 * pool `progress()` and `computeCondition()` read. One statement for any number of projects.
 */
async function loadTasks(exec: Executor, ids: readonly string[]) {
  const byProject = new Map<string, ConditionTask[]>();
  if (ids.length === 0) return byProject;
  const rows = await exec
    .select({
      projectId: task.projectId,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      deletedAt: task.deletedAt,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      canceledAt: task.canceledAt,
      lastActivityAt: task.lastActivityAt,
      reopenCount: task.reopenCount,
    })
    .from(task)
    .where(and(inArray(task.projectId, [...ids]), isLive(task), ne(task.status, 'canceled')));
  for (const { projectId, ...t } of rows) {
    const list = byProject.get(projectId) ?? [];
    list.push(t);
    byProject.set(projectId, list);
  }
  return byProject;
}

/** One live project with its lead's name, or undefined for a missing or trashed id. */
async function loadProject(exec: Executor, id: string): Promise<ProjectRow | undefined> {
  const [row] = await exec
    .select(projectColumns)
    .from(project)
    .leftJoin(user, eq(user.id, project.leadId))
    .where(and(eq(project.id, id), isLive(project)))
    .limit(1);
  return row;
}

/**
 * Projects the caller may see, one page plus the total. Members only ever get their own projects:
 * `scope=all` from them is quietly narrowed to `mine`. Admin and Project Manager may read all.
 */
export async function listProjects(
  p: Principal,
  input: ListProjectsInput,
  exec: Executor = db,
): Promise<{ items: ProjectListItem[]; total: number }> {
  const cfg = input.metrics ?? METRICS;
  const scope = clampListScope(input.scope, projectListScope(p));
  const where = and(
    isLive(project),
    scope === 'mine'
      ? inArray(
          project.id,
          exec
            .select({ id: projectMember.projectId })
            .from(projectMember)
            .where(eq(projectMember.userId, p.id)),
        )
      : undefined,
    input.status ? eq(project.status, input.status) : undefined,
    input.q ? ilike(project.name, likePattern(input.q)) : undefined,
  );

  const [[totalRow], rows] = await Promise.all([
    exec.select({ n: count() }).from(project).where(where),
    exec
      .select(projectColumns)
      .from(project)
      .leftJoin(user, eq(user.id, project.leadId))
      .where(where)
      .orderBy(...ORDER[input.sort ?? 'due'])
      .limit(input.limit)
      .offset(input.offset),
  ]);

  const ids = rows.map((r) => r.id);
  const [memberships, tasks, plans] = await Promise.all([
    loadMembership(p.id, ids, exec),
    loadTasks(exec, ids),
    loadConditionInputs(ids, input.now, exec),
  ]);
  return {
    items: rows.map((r) =>
      toListItem(
        r,
        tasks.get(r.id) ?? [],
        memberships.get(r.id) ?? null,
        input.now,
        cfg,
        planOf(plans, r.id),
      ),
    ),
    total: totalRow?.n ?? 0,
  };
}

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
  const [tasks, plans, [live]] = await Promise.all([
    loadTasks(exec, [projectId]),
    loadConditionInputs([projectId], now, exec),
    // Canceled tasks are outside `loadTasks` but still move to the Trash with the project (S1-18 dialog).
    exec
      .select({ n: count() })
      .from(task)
      .where(and(eq(task.projectId, projectId), isLive(task))),
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
      name: user.name,
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
