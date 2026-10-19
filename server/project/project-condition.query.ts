/**
 * Milestones and manual overrides for the project condition (L5-02). Two statements for any number of
 * projects, so list and detail stay free of N+1 (R04 §3.7).
 */
import { and, gt, inArray, isNull, or } from 'drizzle-orm';
import { db } from '../db';
import { projectConditionOverride, projectMilestone } from '../db/schema';
import type { ConditionMilestone } from '../metrics/condition';
import type { Executor } from '../pm/tx';
import {
  type ConditionOverrideInput,
  type ConditionPlanInput,
  NO_CONDITION_PLAN,
} from './project-plan.dto';

/**
 * Plan input per project id; a project with none is simply absent from the map.
 * Overrides already cleared by hand or expired at `now` are left out in SQL: they can never apply again,
 * so a project with years of history still returns a handful of rows.
 */
export async function loadConditionInputs(
  ids: readonly string[],
  now: Date,
  exec: Executor = db,
): Promise<Map<string, ConditionPlanInput>> {
  const byProject = new Map<string, ConditionPlanInput>();
  if (ids.length === 0) return byProject;
  const [milestones, overrides] = await Promise.all([
    exec
      .select({
        projectId: projectMilestone.projectId,
        dueDate: projectMilestone.dueDate,
        reachedAt: projectMilestone.reachedAt,
      })
      .from(projectMilestone)
      .where(inArray(projectMilestone.projectId, [...ids])),
    exec
      .select({
        projectId: projectConditionOverride.projectId,
        condition: projectConditionOverride.condition,
        reason: projectConditionOverride.reason,
        createdAt: projectConditionOverride.createdAt,
        expiresAt: projectConditionOverride.expiresAt,
        clearedAt: projectConditionOverride.clearedAt,
      })
      .from(projectConditionOverride)
      .where(
        and(
          inArray(projectConditionOverride.projectId, [...ids]),
          isNull(projectConditionOverride.clearedAt),
          or(
            isNull(projectConditionOverride.expiresAt),
            gt(projectConditionOverride.expiresAt, now),
          ),
        ),
      ),
  ]);
  const entry = (projectId: string) => {
    let e = byProject.get(projectId) as
      | { milestones: ConditionMilestone[]; overrides: ConditionOverrideInput[] }
      | undefined;
    if (!e) {
      e = { milestones: [], overrides: [] };
      byProject.set(projectId, e);
    }
    return e;
  };
  for (const { projectId, ...m } of milestones) entry(projectId).milestones.push(m);
  for (const { projectId, ...o } of overrides) entry(projectId).overrides.push(o);
  return byProject;
}

/** The plan input of one project from a `loadConditionInputs` result. */
export const planOf = (map: ReadonlyMap<string, ConditionPlanInput>, projectId: string) =>
  map.get(projectId) ?? NO_CONDITION_PLAN;
