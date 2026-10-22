/**
 * Project list (S1-02, KB-9): visibility, filters, sort, the "needs attention" filter and the optional
 * plan for the Gantt view. At most 7 statements per call whatever the page size (R04 §3.7): tasks,
 * memberships, milestones, overrides and plans are fetched for the whole page at once, never per project.
 */
import { and, asc, count, desc, eq, ilike, inArray, type SQL, sql } from 'drizzle-orm';
import type { RequestedListScope } from '../access/project.policy';
import { clampListScope, projectListScope } from '../access/project.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { profile, project, projectMember, user } from '../db/schema';
import { METRICS } from '../metrics/config';
import type { MetricsConfig } from '../metrics/types';
import type { ProjectCondition, ProjectStatus } from '../pm/enums';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';
import { loadMembership } from './membership.query';
import { type ProjectListItem, type ProjectRow, toListItem } from './project.dto';
import { loadConditionInputs, planOf } from './project-condition.query';
import { listPlanOf, loadListPlans } from './project-plan-list.query';
import { loadTasks, projectColumns } from './project-rows.query';

export const PROJECT_SORTS = ['due', 'name', 'recent'] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

/** Effective conditions the "needs attention" filter keeps: at risk, or late. */
export const ATTENTION_CONDITIONS: readonly ProjectCondition[] = ['at_risk', 'off_track'];

/**
 * Most projects the attention filter looks at. The condition is computed in code, so it needs every
 * `active` project the caller may see before it can page; the product plans for 200 (KB-11), this
 * only keeps one request from reading an unbounded table.
 */
export const ATTENTION_SCAN_LIMIT = 1000;

export type ListProjectsInput = {
  /** What the caller asked for; the real scope is never wider than the policy allows (M11). */
  scope: RequestedListScope;
  status?: ProjectStatus;
  /** Case-insensitive part of the name. */
  q?: string;
  sort?: ProjectSort;
  /** Only `active` projects whose effective condition is at risk or late; `total` counts those. */
  attention?: boolean;
  /** Give every item its phases and milestones (`plan`). */
  withPlan?: boolean;
  limit: number;
  offset: number;
  /** Injected so "today" is testable; the handler passes `new Date()`. */
  now: Date;
  metrics?: MetricsConfig;
};

// Escape LIKE wildcards so a search for "100%" matches the text, not everything.
const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

const ORDER: Record<ProjectSort, SQL[]> = {
  // A missing due date sorts last: "no deadline" is the least urgent, not the most.
  due: [sql`${project.dueDate} ASC NULLS LAST`, sql`lower(${project.name})`, asc(project.id)],
  name: [sql`lower(${project.name})`, asc(project.id)],
  recent: [desc(project.updatedAt), asc(project.id)],
};

/** List items for these rows: memberships, tasks and the condition inputs are one statement each. */
async function toItems(
  p: Principal,
  rows: readonly ProjectRow[],
  input: ListProjectsInput,
  exec: Executor,
): Promise<ProjectListItem[]> {
  const cfg = input.metrics ?? METRICS;
  const ids = rows.map((r) => r.id);
  const [memberships, tasks, plans] = await Promise.all([
    loadMembership(p.id, ids, exec),
    loadTasks(exec, ids),
    loadConditionInputs(ids, input.now, exec),
  ]);
  return rows.map((r) =>
    toListItem(
      r,
      tasks.get(r.id) ?? [],
      memberships.get(r.id) ?? null,
      input.now,
      cfg,
      planOf(plans, r.id),
    ),
  );
}

/** Adds `plan` to each item of the page when the caller asked for it; otherwise the items pass through. */
async function withPlans(
  items: ProjectListItem[],
  input: ListProjectsInput,
  exec: Executor,
): Promise<ProjectListItem[]> {
  if (!input.withPlan) return items;
  const plans = await loadListPlans(
    items.map((i) => i.id),
    exec,
  );
  return items.map((i) => ({ ...i, plan: listPlanOf(plans, i.id) }));
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
  const scope = clampListScope(input.scope, projectListScope(p));
  // Only an `active` project has a condition, so asking for attention in any other status is empty.
  if (input.attention && input.status && input.status !== 'active') return { items: [], total: 0 };
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
    input.attention ? eq(project.status, 'active') : undefined,
    input.status ? eq(project.status, input.status) : undefined,
    input.q ? ilike(project.name, likePattern(input.q)) : undefined,
  );
  const ordered = exec
    .select(projectColumns)
    .from(project)
    .leftJoin(user, eq(user.id, project.leadId))
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(where)
    .orderBy(...ORDER[input.sort ?? 'due']);

  if (input.attention) {
    // The condition is computed, not stored: work it out for every candidate, keep the ones that need
    // a look, and only then cut the page, so `total` and the pages agree.
    const candidates = await toItems(p, await ordered.limit(ATTENTION_SCAN_LIMIT), input, exec);
    const flagged = candidates.filter(
      (i) => i.condition && ATTENTION_CONDITIONS.includes(i.condition.level),
    );
    const page = flagged.slice(input.offset, input.offset + input.limit);
    return { items: await withPlans(page, input, exec), total: flagged.length };
  }

  const [[totalRow], rows] = await Promise.all([
    exec.select({ n: count() }).from(project).where(where),
    ordered.limit(input.limit).offset(input.offset),
  ]);
  const items = await withPlans(await toItems(p, rows, input, exec), input, exec);
  return { items, total: totalRow?.n ?? 0 };
}
