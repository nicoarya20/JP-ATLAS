/**
 * Read side of the deadline history and the manual condition (S5a-03): the extension list, the
 * count for the "Diperpanjang ×N" badge and the one override that is still in force.
 */
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { db } from '../db';
import { projectConditionOverride, projectDeadlineExtension, user } from '../db/schema';
import { activeOverride } from '../metrics/condition';
import type { ProjectStatus } from '../pm/enums';
import type { Executor } from '../pm/tx';
import type { ProjectHistory } from './project.dto';
import {
  type ConditionOverrideDto,
  type DeadlineExtensionDto,
  toConditionOverrideDto,
  toDeadlineExtensionDto,
} from './project-plan.dto';
import { canSeeProject } from './project-visible.query';

/** How many extensions one list call returns when the caller does not say. */
export const EXTENSIONS_LIMIT_DEFAULT = 50;

const extensionColumns = {
  id: projectDeadlineExtension.id,
  projectId: projectDeadlineExtension.projectId,
  oldDueDate: projectDeadlineExtension.oldDueDate,
  newDueDate: projectDeadlineExtension.newDueDate,
  reasonCategory: projectDeadlineExtension.reasonCategory,
  reason: projectDeadlineExtension.reason,
  extendedBy: projectDeadlineExtension.extendedBy,
  extendedByName: user.name,
  createdAt: projectDeadlineExtension.createdAt,
};

/** Newest first; `id` breaks a tie between two extensions written in the same instant. */
async function loadExtensions(exec: Executor, projectId: string, limit: number) {
  const rows = await exec
    .select(extensionColumns)
    .from(projectDeadlineExtension)
    .leftJoin(user, eq(user.id, projectDeadlineExtension.extendedBy))
    .where(eq(projectDeadlineExtension.projectId, projectId))
    .orderBy(desc(projectDeadlineExtension.createdAt), desc(projectDeadlineExtension.id))
    .limit(limit);
  return rows.map(toDeadlineExtensionDto);
}

export async function countExtensions(exec: Executor, projectId: string): Promise<number> {
  const [row] = await exec
    .select({ n: count() })
    .from(projectDeadlineExtension)
    .where(eq(projectDeadlineExtension.projectId, projectId));
  return row?.n ?? 0;
}

/** The override in force at `now` (not cleared, not expired), or null. */
export async function loadActiveOverride(
  exec: Executor,
  projectId: string,
  now: Date,
): Promise<ConditionOverrideDto | null> {
  const rows = await exec
    .select({
      id: projectConditionOverride.id,
      projectId: projectConditionOverride.projectId,
      condition: projectConditionOverride.condition,
      reason: projectConditionOverride.reason,
      setBy: projectConditionOverride.setBy,
      setByName: user.name,
      expiresAt: projectConditionOverride.expiresAt,
      clearedAt: projectConditionOverride.clearedAt,
      createdAt: projectConditionOverride.createdAt,
    })
    .from(projectConditionOverride)
    .leftJoin(user, eq(user.id, projectConditionOverride.setBy))
    .where(
      and(
        eq(projectConditionOverride.projectId, projectId),
        isNull(projectConditionOverride.clearedAt),
      ),
    );
  const active = activeOverride(rows, now);
  return active ? toConditionOverrideDto(active) : null;
}

/** The newest extension and the all-time count in one statement (`count(*) over ()` is taken before LIMIT). */
async function loadLatestExtension(exec: Executor, projectId: string) {
  const [row] = await exec
    .select({ ...extensionColumns, total: sql<number>`(count(*) over ())::int` })
    .from(projectDeadlineExtension)
    .leftJoin(user, eq(user.id, projectDeadlineExtension.extendedBy))
    .where(eq(projectDeadlineExtension.projectId, projectId))
    .orderBy(desc(projectDeadlineExtension.createdAt), desc(projectDeadlineExtension.id))
    .limit(1);
  return row ? { count: row.total, last: toDeadlineExtensionDto(row) } : { count: 0, last: null };
}

/**
 * Extension count, newest extension and the manual condition for the detail page: two statements,
 * whatever the history holds. Only an `active` project has a condition, so any other status shows
 * no override (it comes back when the project does).
 */
export async function loadProjectHistory(
  exec: Executor,
  projectId: string,
  status: ProjectStatus,
  now: Date,
): Promise<ProjectHistory> {
  const [{ count, last }, conditionOverride] = await Promise.all([
    loadLatestExtension(exec, projectId),
    status === 'active' ? loadActiveOverride(exec, projectId, now) : null,
  ]);
  return { extensionCount: count, lastExtension: last, conditionOverride };
}

/** Extensions of a project, newest first with the all-time total; null when the caller may not see it. */
export async function listExtensions(
  p: Principal,
  projectId: string,
  limit: number = EXTENSIONS_LIMIT_DEFAULT,
  exec: Executor = db,
): Promise<{ items: DeadlineExtensionDto[]; total: number } | null> {
  if (!(await canSeeProject(p, projectId, exec))) return null;
  const [items, total] = await Promise.all([
    loadExtensions(exec, projectId, limit),
    countExtensions(exec, projectId),
  ]);
  return { items, total };
}
