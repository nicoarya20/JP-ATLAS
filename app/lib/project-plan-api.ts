/**
 * Client for the project plan routes (`/api/app/projects/:id/plan`, phases, milestones), through Eden.
 * Errors come back as `ApiError` whose message is the plan wording, so a toast needs no extra mapping.
 */
import type { PmCode } from '@server/pm/errors';
import { MILESTONES_PER_PROJECT, PHASES_PER_PROJECT } from '@server/project/project.limits';
import type { MilestoneDto, PhaseDto } from '@server/project/project-plan.dto';
import type { ProjectPlan } from '@server/project/project-plan.query';
import { PLAN_ERROR_COPY } from '../components/projects/plan/plan.copy';
import { client } from './eden';
import { ApiError } from './http';
import { projectKeys, unwrap } from './projects-api';

export type { MilestoneDto, PhaseDto, ProjectPlan };

/** React-query key of one project's plan; under the detail key, so `projectKeys.all` refreshes it too. */
export const planKey = (id: string) => [...projectKeys.detail(id), 'plan'] as const;

/** Codes the plan routes answer, beyond the shared catalog: the two per-project caps (HTTP 422). */
type PlanCode = PmCode | 'PHASE_LIMIT' | 'MILESTONE_LIMIT';

/**
 * Plan wording for a known code. `VALIDATION` keeps the server sentence: it already names the exact
 * problem (empty name, end before start, phase not found) in Indonesian and says what to do next.
 */
const PLAN_MESSAGES: Partial<Record<PlanCode, string>> = {
  PHASE_LIMIT: PLAN_ERROR_COPY.phaseLimit(PHASES_PER_PROJECT),
  MILESTONE_LIMIT: PLAN_ERROR_COPY.milestoneLimit(MILESTONES_PER_PROJECT),
  NOT_FOUND: PLAN_ERROR_COPY.notFound,
  NOT_MANAGER: PLAN_ERROR_COPY.notAllowed,
  PROJECT_IN_TRASH: PLAN_ERROR_COPY.inTrash,
};

/** Fallback for a `VALIDATION` answer that carried no sentence of its own (a schema issue, say). */
const VALIDATION_FALLBACK = PLAN_ERROR_COPY.invalid;

/** Replaces the message of a known plan error code; anything else passes through untouched. */
export function withPlanMessage(err: unknown): unknown {
  if (!(err instanceof ApiError)) return err;
  const known = PLAN_MESSAGES[err.code as PlanCode];
  const message =
    known ?? (err.code === 'VALIDATION' && !err.hasServerMessage ? VALIDATION_FALLBACK : null);
  if (!message) return err;
  return new ApiError({
    message,
    status: err.status,
    code: err.code,
    requestId: err.requestId,
    issues: err.issues,
  });
}

/** Eden `{ data, error }` → data, or throws an `ApiError` with the plan wording. */
function unwrapPlan<T>(res: Parameters<typeof unwrap<T>>[0]): T {
  try {
    return unwrap(res);
  } catch (err) {
    throw withPlanMessage(err);
  }
}

const pathId = (id: string) => encodeURIComponent(id);
const project = (id: string) => client.api.app.projects({ id: pathId(id) });

export async function fetchProjectPlan(id: string): Promise<ProjectPlan> {
  return unwrapPlan(await project(id).plan.get());
}

// ---- Phases ----

/** POST /phases and PATCH /phases/:phaseId bodies; dates are `YYYY-MM-DD` or null. */
export type PhaseInput = {
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};
export type PhasePatch = Partial<PhaseInput> & { status?: PhaseDto['status'] };
/** What deleting a phase answers: how many tasks were detached from it. */
export type PhaseDeleted = { id: string; affectedTasks: number };

export async function createPhase(id: string, input: PhaseInput): Promise<PhaseDto> {
  return unwrapPlan(await project(id).phases.post(input));
}

export async function updatePhase(
  id: string,
  phaseId: string,
  patch: PhasePatch,
): Promise<PhaseDto> {
  return unwrapPlan(
    await project(id)
      .phases({ phaseId: pathId(phaseId) })
      .patch(patch),
  );
}

export async function deletePhase(id: string, phaseId: string): Promise<PhaseDeleted> {
  return unwrapPlan(
    await project(id)
      .phases({ phaseId: pathId(phaseId) })
      .delete(),
  );
}

/** Saves the whole new order: `ids` is every phase of the project, each once. */
export async function reorderPhases(id: string, ids: string[]): Promise<PhaseDto[]> {
  return unwrapPlan(await project(id).phases.reorder.post({ ids }));
}

// ---- Milestones ----

/** POST /milestones and PATCH /milestones/:mid bodies; `phaseId: null` clears the phase. */
export type MilestoneInput = { title: string; dueDate: string; phaseId?: string | null };
export type MilestonePatch = Partial<MilestoneInput>;

export async function createMilestone(id: string, input: MilestoneInput): Promise<MilestoneDto> {
  return unwrapPlan(await project(id).milestones.post(input));
}

export async function updateMilestone(
  id: string,
  mid: string,
  patch: MilestonePatch,
): Promise<MilestoneDto> {
  return unwrapPlan(
    await project(id)
      .milestones({ mid: pathId(mid) })
      .patch(patch),
  );
}

export async function deleteMilestone(id: string, mid: string): Promise<{ id: string }> {
  return unwrapPlan(
    await project(id)
      .milestones({ mid: pathId(mid) })
      .delete(),
  );
}

/** Marks a milestone reached now, or takes the mark back; repeating either changes nothing. */
export async function setMilestoneReached(
  id: string,
  mid: string,
  reached: boolean,
): Promise<MilestoneDto> {
  const one = project(id).milestones({ mid: pathId(mid) });
  return unwrapPlan(await (reached ? one.reach.post() : one.unreach.post()));
}
