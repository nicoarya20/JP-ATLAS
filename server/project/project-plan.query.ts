/**
 * Read side of the project plan (S5a-02): phases with their task counts, milestones, and the two
 * "where are we" picks the Summary card shows. Phases and milestones are capped per project
 * (`PHASES_PER_PROJECT`, `MILESTONES_PER_PROJECT`), so the lists are returned whole, not paged.
 * Task counts come from one grouped query for all phases, never one query per phase.
 */
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import { canViewProject } from '../access/project.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { project, projectMilestone, projectPhase, task } from '../db/schema';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';
import { loadMembership } from './membership.query';
import {
  type MilestoneDto,
  type PhaseDto,
  type PhaseRow,
  toMilestoneDto,
  toPhaseDto,
} from './project-plan.dto';

/** What `GET /projects/:id/plan` answers: one call for the Phases tab and the Summary card. */
export type ProjectPlan = {
  phases: PhaseDto[];
  milestones: MilestoneDto[];
  nextMilestone: MilestoneDto | null;
  currentPhase: PhaseDto | null;
};

/**
 * Phases of a project in display order (or just `onlyId`), each with the tasks that point at it.
 * Counted tasks are live and not canceled, the same pool as project progress; `doneCount` is the done ones.
 */
export async function loadPhases(
  exec: Executor,
  projectId: string,
  onlyId?: string,
): Promise<PhaseDto[]> {
  const rows: PhaseRow[] = await exec
    .select()
    .from(projectPhase)
    .where(
      onlyId
        ? and(eq(projectPhase.projectId, projectId), eq(projectPhase.id, onlyId))
        : eq(projectPhase.projectId, projectId),
    )
    .orderBy(asc(projectPhase.position), asc(projectPhase.createdAt), asc(projectPhase.id));
  if (rows.length === 0) return [];
  const counts = await exec
    .select({
      phaseId: task.phaseId,
      total: sql<number>`count(*)::int`,
      done: sql<number>`(count(*) filter (where ${task.status} = 'done'))::int`,
    })
    .from(task)
    .where(
      and(
        inArray(
          task.phaseId,
          rows.map((r) => r.id),
        ),
        isLive(task),
        ne(task.status, 'canceled'),
      ),
    )
    .groupBy(task.phaseId);
  const byPhase = new Map(counts.map((c) => [c.phaseId, c]));
  return rows.map((r) =>
    toPhaseDto(r, {
      taskCount: byPhase.get(r.id)?.total ?? 0,
      doneCount: byPhase.get(r.id)?.done ?? 0,
    }),
  );
}

/** Milestones of a project, earliest due date first (ties: oldest first, then id, so the order is stable). */
export async function loadMilestones(exec: Executor, projectId: string): Promise<MilestoneDto[]> {
  const rows = await exec
    .select()
    .from(projectMilestone)
    .where(eq(projectMilestone.projectId, projectId))
    .orderBy(
      asc(projectMilestone.dueDate),
      asc(projectMilestone.createdAt),
      asc(projectMilestone.id),
    );
  return rows.map(toMilestoneDto);
}

/** The earliest milestone not yet reached; one already past its date still counts, so a missed one shows first. */
export function pickNextMilestone(milestones: readonly MilestoneDto[]): MilestoneDto | null {
  return milestones.find((m) => m.reachedAt === null) ?? null;
}

/** The running phase that comes first in the display order; null when none is in progress. */
export function pickCurrentPhase(phases: readonly PhaseDto[]): PhaseDto | null {
  return phases.find((p) => p.status === 'in_progress') ?? null;
}

/**
 * The plan of one project, or null when it is missing, in the Trash or hidden from the caller (D8: all
 * three answer the same 404). Anyone who may view the project may read its plan.
 */
export async function getProjectPlan(p: Principal, projectId: string): Promise<ProjectPlan | null> {
  const [row] = await db
    .select({
      id: project.id,
      status: project.status,
      leadId: project.leadId,
      deletedAt: project.deletedAt,
      deletedBy: project.deletedBy,
    })
    .from(project)
    .where(eq(project.id, projectId));
  if (!row || row.deletedAt) return null;
  const membership = (await loadMembership(p.id, [projectId])).get(projectId) ?? null;
  if (!canViewProject(p, row, membership).ok) return null;
  const [phases, milestones] = await Promise.all([
    loadPhases(db, projectId),
    loadMilestones(db, projectId),
  ]);
  return {
    phases,
    milestones,
    nextMilestone: pickNextMilestone(milestones),
    currentPhase: pickCurrentPhase(phases),
  };
}
