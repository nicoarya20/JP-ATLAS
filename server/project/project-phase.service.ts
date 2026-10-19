/**
 * Phase writes of a project (S5a-02): create, edit, delete and reorder. Each runs in one `inTx` that
 * first locks the project row (see `managedPlan`), so the "at most N phases" count and the display
 * order never race. Phases are recorded in `project_activity`; no `audit()`, like other project changes.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { projectPhase, task } from '../db/schema';
import type { PhaseStatus } from '../pm/enums';
import { isLive } from '../pm/soft-delete';
import type { Tx } from '../pm/tx';
import { PHASE_DESCRIPTION_MAX, PHASE_NAME_MAX, PHASES_PER_PROJECT } from './project.limits';
import { logActivity } from './project.service';
import { type PhaseDto, toPhaseDto } from './project-plan.dto';
import { loadPhases } from './project-plan.query';
import {
  cleanOptional,
  invalid,
  lengthProblem,
  managedPlan,
  PLAN_MESSAGES,
  type PlanResult,
  rangeProblem,
} from './project-plan.write';

export type CreatePhaseInput = {
  name: string;
  description?: string | null;
  /** `YYYY-MM-DD` or null. */
  startDate?: string | null;
  endDate?: string | null;
};

/** A partial edit; `undefined` keeps the stored value, `null` clears an optional one. */
export type UpdatePhaseInput = Partial<CreatePhaseInput> & { status?: PhaseStatus };

/** A deleted phase and how many live tasks it was detached from (they stay, with no phase). */
export type PhaseDeleted = { id: string; affectedTasks: number };

/** Message for a bad name or description, or null. */
function textProblem(name: string | undefined, description: string | null | undefined) {
  if (name !== undefined) {
    if (!name.trim()) return PLAN_MESSAGES.PHASE_NAME_REQUIRED;
    if (name.trim().length > PHASE_NAME_MAX)
      return PLAN_MESSAGES.PHASE_NAME_TOO_LONG(PHASE_NAME_MAX);
  }
  return lengthProblem(description, PHASE_DESCRIPTION_MAX);
}

/**
 * Writes `ids` as the display order 0..n-1 in one statement. `position` is deliberately not UNIQUE
 * (R02), so no intermediate state can fail; the CASE keeps it to a single UPDATE.
 */
async function writeOrder(tx: Tx, projectId: string, ids: readonly string[]) {
  if (ids.length === 0) return;
  const cases = ids.map((id, i) => sql`WHEN ${id} THEN ${i}::smallint`);
  await tx
    .update(projectPhase)
    .set({ position: sql`CASE ${projectPhase.id} ${sql.join(cases, sql` `)} END` })
    .where(and(eq(projectPhase.projectId, projectId), inArray(projectPhase.id, [...ids])));
}

/** Adds a phase at the end of the list (managers, Admin); more than `PHASES_PER_PROJECT` is a 422. */
export function createPhase(
  p: Principal,
  projectId: string,
  input: CreatePhaseInput,
): Promise<PlanResult<PhaseDto>> {
  return managedPlan(p, projectId, async (tx, proj) => {
    const problem =
      textProblem(input.name, input.description) ?? rangeProblem(input.startDate, input.endDate);
    if (problem) return invalid(problem);
    const [stat] = await tx
      .select({
        n: sql<number>`count(*)::int`,
        next: sql<number>`coalesce(max(${projectPhase.position}), -1) + 1`,
      })
      .from(projectPhase)
      .where(eq(projectPhase.projectId, proj.id));
    if ((stat?.n ?? 0) >= PHASES_PER_PROJECT) {
      return {
        ok: false,
        code: 'PHASE_LIMIT',
        error: PLAN_MESSAGES.PHASE_LIMIT(PHASES_PER_PROJECT),
      };
    }
    const name = input.name.trim();
    const [row] = await tx
      .insert(projectPhase)
      .values({
        projectId: proj.id,
        name,
        description: cleanOptional(input.description),
        position: stat?.next ?? 0,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
      })
      .returning();
    if (!row) throw new Error(`Phase insert returned no row for project ${proj.id}`);
    await logActivity(tx, p, proj.id, 'phase.created', { phaseId: row.id, name });
    return { ok: true, value: toPhaseDto(row, { taskCount: 0, doneCount: 0 }) };
  });
}

/**
 * Timestamps a status move implies: `startedAt` is set the first time the phase leaves "not started"
 * and cleared when it goes back; `finishedAt` is set on "done" and cleared when it is reopened.
 */
function statusStamps(cur: { startedAt: Date | null }, next: PhaseStatus, now: Date) {
  return {
    status: next,
    startedAt: next === 'not_started' ? null : (cur.startedAt ?? now),
    finishedAt: next === 'done' ? now : null,
  };
}

/** Edits name, description, dates and status of a phase of this project (managers, Admin). */
export function updatePhase(
  p: Principal,
  projectId: string,
  phaseId: string,
  input: UpdatePhaseInput,
  now: Date = new Date(),
): Promise<PlanResult<PhaseDto>> {
  return managedPlan(p, projectId, async (tx, proj) => {
    const [cur] = await tx
      .select()
      .from(projectPhase)
      .where(and(eq(projectPhase.id, phaseId), eq(projectPhase.projectId, proj.id)));
    if (!cur) return { ok: false, code: 'NOT_FOUND' };
    const problem =
      textProblem(input.name, input.description) ??
      rangeProblem(
        input.startDate === undefined ? cur.startDate : input.startDate,
        input.endDate === undefined ? cur.endDate : input.endDate,
      );
    if (problem) return invalid(problem);

    const patch: Partial<typeof projectPhase.$inferInsert> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.description !== undefined) patch.description = cleanOptional(input.description);
    if (input.startDate !== undefined) patch.startDate = input.startDate;
    if (input.endDate !== undefined) patch.endDate = input.endDate;
    const nextStatus =
      input.status !== undefined && input.status !== cur.status ? input.status : null;
    if (nextStatus) Object.assign(patch, statusStamps(cur, nextStatus, now));

    const fields = Object.keys(patch);
    if (fields.length > 0) {
      await tx.update(projectPhase).set(patch).where(eq(projectPhase.id, cur.id));
      await logActivity(tx, p, proj.id, 'phase.updated', {
        phaseId: cur.id,
        fields,
        ...(nextStatus ? { status: { from: cur.status, to: nextStatus } } : {}),
      });
    }
    const [dto] = await loadPhases(tx, proj.id, cur.id);
    if (!dto) throw new Error(`Phase ${cur.id} vanished inside its own transaction`);
    return { ok: true, value: dto };
  });
}

/**
 * Deletes a phase. Its tasks and milestones stay: the foreign keys are ON DELETE SET NULL, so they
 * simply lose the phase. The answer says how many live tasks that touched (the UI warns before, T2).
 * The remaining phases are renumbered so the order stays 0..n-1.
 */
export function deletePhase(
  p: Principal,
  projectId: string,
  phaseId: string,
): Promise<PlanResult<PhaseDeleted>> {
  return managedPlan(p, projectId, async (tx, proj) => {
    const [cur] = await tx
      .select({ id: projectPhase.id, name: projectPhase.name })
      .from(projectPhase)
      .where(and(eq(projectPhase.id, phaseId), eq(projectPhase.projectId, proj.id)));
    if (!cur) return { ok: false, code: 'NOT_FOUND' };
    const [hit] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(task)
      .where(and(eq(task.phaseId, cur.id), isLive(task)));
    const affectedTasks = hit?.n ?? 0;
    await tx.delete(projectPhase).where(eq(projectPhase.id, cur.id));
    const rest = await loadPhases(tx, proj.id);
    await writeOrder(
      tx,
      proj.id,
      rest.map((r) => r.id),
    );
    await logActivity(tx, p, proj.id, 'phase.deleted', {
      phaseId: cur.id,
      name: cur.name,
      affectedTasks,
    });
    return { ok: true, value: { id: cur.id, affectedTasks } };
  });
}

/** Saves a new display order. `ids` must be exactly this project's phases, each once; anything else is a 422. */
export function reorderPhases(
  p: Principal,
  projectId: string,
  ids: readonly string[],
): Promise<PlanResult<PhaseDto[]>> {
  return managedPlan(p, projectId, async (tx, proj) => {
    const current = await loadPhases(tx, proj.id);
    const known = new Set(current.map((c) => c.id));
    const complete =
      ids.length === current.length &&
      new Set(ids).size === ids.length &&
      ids.every((i) => known.has(i));
    if (!complete) return invalid(PLAN_MESSAGES.PHASE_REORDER);
    const unchanged = ids.every((id, i) => current[i]?.id === id);
    if (unchanged) return { ok: true, value: current };
    await writeOrder(tx, proj.id, ids);
    await logActivity(tx, p, proj.id, 'phase.reordered', { count: ids.length });
    return { ok: true, value: await loadPhases(tx, proj.id) };
  });
}
