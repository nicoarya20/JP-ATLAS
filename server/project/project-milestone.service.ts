/**
 * Milestone writes of a project (S5a-02): create, edit, delete and the manual "reached" mark.
 * Same discipline as the phase service: one `inTx`, project row locked, each change recorded in
 * `project_activity`. A milestone may point at a phase of the same project; deleting that phase
 * keeps the milestone (FK SET NULL).
 */
import { and, eq, sql } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { projectMilestone, projectPhase } from '../db/schema';
import type { Tx } from '../pm/tx';
import {
  MILESTONE_DESCRIPTION_MAX,
  MILESTONE_TITLE_MAX,
  MILESTONES_PER_PROJECT,
} from './project.limits';
import { logActivity } from './project.service';
import { type MilestoneDto, toMilestoneDto } from './project-plan.dto';
import {
  cleanOptional,
  invalid,
  lengthProblem,
  managedPlan,
  PLAN_MESSAGES,
  type PlanResult,
  rangeProblem,
} from './project-plan.write';

export type CreateMilestoneInput = {
  title: string;
  description?: string | null;
  /** `YYYY-MM-DD`. */
  dueDate: string;
  phaseId?: string | null;
};

/** A partial edit; `undefined` keeps the stored value, `null` clears the description or the phase. */
export type UpdateMilestoneInput = Partial<CreateMilestoneInput>;

/** Message for a bad title, description or date, or null. */
function problemOf(input: UpdateMilestoneInput): string | null {
  if (input.title !== undefined) {
    if (!input.title.trim()) return PLAN_MESSAGES.MILESTONE_TITLE_REQUIRED;
    if (input.title.trim().length > MILESTONE_TITLE_MAX) {
      return PLAN_MESSAGES.MILESTONE_TITLE_TOO_LONG(MILESTONE_TITLE_MAX);
    }
  }
  const text = lengthProblem(input.description, MILESTONE_DESCRIPTION_MAX);
  // A one-sided range check validates the single date as a calendar date.
  return text ?? (input.dueDate === undefined ? null : rangeProblem(input.dueDate, null));
}

/** True when the phase exists in this project; another project's phase looks the same as a missing one. */
async function phaseInProject(tx: Tx, projectId: string, phaseId: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: projectPhase.id })
    .from(projectPhase)
    .where(and(eq(projectPhase.id, phaseId), eq(projectPhase.projectId, projectId)));
  return Boolean(row);
}

/** Adds a milestone (managers, Admin); more than `MILESTONES_PER_PROJECT` is a 422. */
export function createMilestone(
  p: Principal,
  projectId: string,
  input: CreateMilestoneInput,
): Promise<PlanResult<MilestoneDto>> {
  return managedPlan(p, projectId, async (tx, proj) => {
    const problem = problemOf(input);
    if (problem) return invalid(problem);
    if (input.phaseId && !(await phaseInProject(tx, proj.id, input.phaseId))) {
      return invalid(PLAN_MESSAGES.PHASE_MISSING);
    }
    const [stat] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(projectMilestone)
      .where(eq(projectMilestone.projectId, proj.id));
    if ((stat?.n ?? 0) >= MILESTONES_PER_PROJECT) {
      return {
        ok: false,
        code: 'MILESTONE_LIMIT',
        error: PLAN_MESSAGES.MILESTONE_LIMIT(MILESTONES_PER_PROJECT),
      };
    }
    const title = input.title.trim();
    const [row] = await tx
      .insert(projectMilestone)
      .values({
        projectId: proj.id,
        phaseId: input.phaseId ?? null,
        title,
        description: cleanOptional(input.description),
        dueDate: input.dueDate,
      })
      .returning();
    if (!row) throw new Error(`Milestone insert returned no row for project ${proj.id}`);
    await logActivity(tx, p, proj.id, 'milestone.created', {
      milestoneId: row.id,
      title,
      dueDate: row.dueDate,
    });
    return { ok: true, value: toMilestoneDto(row) };
  });
}

/** Edits title, description, due date and phase of a milestone of this project (managers, Admin). */
export function updateMilestone(
  p: Principal,
  projectId: string,
  milestoneId: string,
  input: UpdateMilestoneInput,
): Promise<PlanResult<MilestoneDto>> {
  return managedPlan(p, projectId, async (tx, proj) => {
    const [cur] = await tx
      .select()
      .from(projectMilestone)
      .where(and(eq(projectMilestone.id, milestoneId), eq(projectMilestone.projectId, proj.id)));
    if (!cur) return { ok: false, code: 'NOT_FOUND' };
    const problem = problemOf(input);
    if (problem) return invalid(problem);
    if (input.phaseId && !(await phaseInProject(tx, proj.id, input.phaseId))) {
      return invalid(PLAN_MESSAGES.PHASE_MISSING);
    }

    const patch: Partial<typeof projectMilestone.$inferInsert> = {};
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.description !== undefined) patch.description = cleanOptional(input.description);
    if (input.dueDate !== undefined) patch.dueDate = input.dueDate;
    if (input.phaseId !== undefined) patch.phaseId = input.phaseId;
    const fields = Object.keys(patch);
    if (fields.length === 0) return { ok: true, value: toMilestoneDto(cur) };
    const [row] = await tx
      .update(projectMilestone)
      .set(patch)
      .where(eq(projectMilestone.id, cur.id))
      .returning();
    if (!row) throw new Error(`Milestone ${cur.id} vanished inside its own transaction`);
    await logActivity(tx, p, proj.id, 'milestone.updated', { milestoneId: cur.id, fields });
    return { ok: true, value: toMilestoneDto(row) };
  });
}

/** Deletes a milestone of this project (managers, Admin). */
export function deleteMilestone(
  p: Principal,
  projectId: string,
  milestoneId: string,
): Promise<PlanResult<{ id: string }>> {
  return managedPlan(p, projectId, async (tx, proj) => {
    const [gone] = await tx
      .delete(projectMilestone)
      .where(and(eq(projectMilestone.id, milestoneId), eq(projectMilestone.projectId, proj.id)))
      .returning({ id: projectMilestone.id, title: projectMilestone.title });
    if (!gone) return { ok: false, code: 'NOT_FOUND' };
    await logActivity(tx, p, proj.id, 'milestone.deleted', {
      milestoneId: gone.id,
      title: gone.title,
    });
    return { ok: true, value: { id: gone.id } };
  });
}

/**
 * Marks the milestone reached now, or takes the mark back. Asking for the state it already has is
 * a no-op that still answers with the milestone, so a double tap on a slow phone does no harm.
 */
export function setMilestoneReached(
  p: Principal,
  projectId: string,
  milestoneId: string,
  reached: boolean,
  now: Date = new Date(),
): Promise<PlanResult<MilestoneDto>> {
  return managedPlan(p, projectId, async (tx, proj) => {
    const [cur] = await tx
      .select()
      .from(projectMilestone)
      .where(and(eq(projectMilestone.id, milestoneId), eq(projectMilestone.projectId, proj.id)));
    if (!cur) return { ok: false, code: 'NOT_FOUND' };
    if (Boolean(cur.reachedAt) === reached) return { ok: true, value: toMilestoneDto(cur) };
    const [row] = await tx
      .update(projectMilestone)
      .set({ reachedAt: reached ? now : null })
      .where(eq(projectMilestone.id, cur.id))
      .returning();
    if (!row) throw new Error(`Milestone ${cur.id} vanished inside its own transaction`);
    await logActivity(tx, p, proj.id, reached ? 'milestone.reached' : 'milestone.unreached', {
      milestoneId: cur.id,
      title: cur.title,
    });
    return { ok: true, value: toMilestoneDto(row) };
  });
}
