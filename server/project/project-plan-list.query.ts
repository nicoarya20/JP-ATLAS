/**
 * Phases and milestones of a page of projects for the list's Gantt view (`rencana=1`). Two statements
 * for any number of projects, so the list stays free of N+1 (R04 §3.7); only the short columns.
 */
import { asc, inArray } from 'drizzle-orm';
import { db } from '../db';
import { projectMilestone, projectPhase } from '../db/schema';
import type { Executor } from '../pm/tx';
import type { ProjectListPlan } from './project-plan.dto';

/**
 * Plan per project id, phases by `position` and milestones by due date. A project with neither is
 * simply absent from the map; read it with `listPlanOf`.
 */
export async function loadListPlans(
  ids: readonly string[],
  exec: Executor = db,
): Promise<Map<string, ProjectListPlan>> {
  const byProject = new Map<string, ProjectListPlan>();
  if (ids.length === 0) return byProject;
  const [phases, milestones] = await Promise.all([
    exec
      .select({
        projectId: projectPhase.projectId,
        id: projectPhase.id,
        name: projectPhase.name,
        startDate: projectPhase.startDate,
        endDate: projectPhase.endDate,
        status: projectPhase.status,
      })
      .from(projectPhase)
      .where(inArray(projectPhase.projectId, [...ids]))
      .orderBy(asc(projectPhase.position), asc(projectPhase.id)),
    exec
      .select({
        projectId: projectMilestone.projectId,
        id: projectMilestone.id,
        title: projectMilestone.title,
        dueDate: projectMilestone.dueDate,
        reachedAt: projectMilestone.reachedAt,
        phaseId: projectMilestone.phaseId,
      })
      .from(projectMilestone)
      .where(inArray(projectMilestone.projectId, [...ids]))
      .orderBy(asc(projectMilestone.dueDate), asc(projectMilestone.id)),
  ]);
  const entry = (projectId: string) => {
    let e = byProject.get(projectId);
    if (!e) {
      e = { phases: [], milestones: [] };
      byProject.set(projectId, e);
    }
    return e;
  };
  for (const { projectId, ...p } of phases) entry(projectId).phases.push(p);
  for (const { projectId, reachedAt, ...m } of milestones) {
    entry(projectId).milestones.push({
      ...m,
      reachedAt: reachedAt ? reachedAt.toISOString() : null,
    });
  }
  return byProject;
}

/** The plan of one project from a `loadListPlans` result; a fresh empty one when it has none. */
export const listPlanOf = (map: ReadonlyMap<string, ProjectListPlan>, projectId: string) =>
  map.get(projectId) ?? { phases: [], milestones: [] };
