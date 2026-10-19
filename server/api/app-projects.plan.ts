/**
 * Project plan routes (`/api/app/projects/:id/...`, S5a-02): the plan read, phases (create, edit,
 * delete, reorder) and milestones (create, edit, delete, reach, unreach). Anyone who may view the
 * project reads; only its managers and Admin write (checked in the services). Not mounted here:
 * `app-projects.ts` assembles it with the scope map (S5a-04). Lists are capped per project, so no paging.
 */
import { Elysia, t } from 'elysia';
import { PHASE_STATUSES } from '../pm/enums';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import {
  MILESTONE_DESCRIPTION_MAX,
  MILESTONE_TITLE_MAX,
  PHASE_DESCRIPTION_MAX,
  PHASE_NAME_MAX,
} from '../project/project.limits';
import {
  createMilestone,
  deleteMilestone,
  setMilestoneReached,
  updateMilestone,
} from '../project/project-milestone.service';
import {
  createPhase,
  deletePhase,
  reorderPhases,
  updatePhase,
} from '../project/project-phase.service';
import { getProjectPlan } from '../project/project-plan.query';
import { isPlanLimitCode, type PlanResult } from '../project/project-plan.write';
import { IdParam, oneOf } from './app-common';
import { appContext } from './app-context';

const strict = { additionalProperties: false } as const;
const PhaseParams = t.Object({ ...IdParam.properties, phaseId: t.String({ minLength: 1 }) });
const MilestoneParams = t.Object({ ...IdParam.properties, mid: t.String({ minLength: 1 }) });
// Shape only; the services reject impossible dates such as 2026-02-30 and an end before the start.
const date = t.Nullable(t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }));
const text = (max: number) => t.Nullable(t.String({ maxLength: max }));

const PhaseFields = {
  description: t.Optional(text(PHASE_DESCRIPTION_MAX)),
  startDate: t.Optional(date),
  endDate: t.Optional(date),
};
const PhaseName = t.String({ minLength: 1, maxLength: PHASE_NAME_MAX });
const CreatePhaseBody = t.Object({ name: PhaseName, ...PhaseFields }, strict);
const UpdatePhaseBody = t.Object(
  { name: t.Optional(PhaseName), status: t.Optional(oneOf(PHASE_STATUSES)), ...PhaseFields },
  strict,
);
const ReorderBody = t.Object({ ids: t.Array(t.String({ minLength: 1 })) }, strict);

const MilestoneTitle = t.String({ minLength: 1, maxLength: MILESTONE_TITLE_MAX });
const MilestoneFields = {
  description: t.Optional(text(MILESTONE_DESCRIPTION_MAX)),
  phaseId: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
};
const dueDate = t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' });
const CreateMilestoneBody = t.Object(
  { title: MilestoneTitle, dueDate, ...MilestoneFields },
  strict,
);
const UpdateMilestoneBody = t.Object(
  { title: t.Optional(MilestoneTitle), dueDate: t.Optional(dueDate), ...MilestoneFields },
  strict,
);

export const projectPlanApi = new Elysia({ prefix: '/projects' })
  .use(appContext)
  .derive(({ status }) => ({
    /** Answers a plan write with its value, or the uniform error body (limits are 422 with their own code). */
    reply<T>(result: PlanResult<T>, created = false) {
      if (result.ok) return created ? status(201, result.value) : result.value;
      const { code, error } = result;
      if (isPlanLimitCode(code)) return status(422, { error: error ?? '', code });
      return fail(status, code, { error });
    },
  }))
  /** Phases (with task counts), milestones, the next unreached milestone and the running phase, in one call. */
  .get(
    '/:id/plan',
    async ({ actor, params, status }) =>
      (await getProjectPlan(toPrincipal(actor), params.id)) ?? fail(status, 'NOT_FOUND'),
    { params: IdParam },
  )
  /** Add a phase at the end of the list (managers, Admin); over the cap is a 422 `PHASE_LIMIT`. */
  .post(
    '/:id/phases',
    async ({ actor, body, params, reply }) =>
      reply(await createPhase(toPrincipal(actor), params.id, body), true),
    { params: IdParam, body: CreatePhaseBody },
  )
  /** Save a full new order: `ids` must be exactly this project's phases (422 otherwise). */
  .post(
    '/:id/phases/reorder',
    async ({ actor, body, params, reply }) =>
      reply(await reorderPhases(toPrincipal(actor), params.id, body.ids)),
    { params: IdParam, body: ReorderBody },
  )
  /** Edit name, description, dates or status of a phase. */
  .patch(
    '/:id/phases/:phaseId',
    async ({ actor, body, params, reply }) =>
      reply(await updatePhase(toPrincipal(actor), params.id, params.phaseId, body)),
    { params: PhaseParams, body: UpdatePhaseBody },
  )
  /** Delete a phase; its tasks stay without a phase. Answers `{ id, affectedTasks }`. */
  .delete(
    '/:id/phases/:phaseId',
    async ({ actor, params, reply }) =>
      reply(await deletePhase(toPrincipal(actor), params.id, params.phaseId)),
    { params: PhaseParams },
  )
  /** Add a milestone (managers, Admin); over the cap is a 422 `MILESTONE_LIMIT`. */
  .post(
    '/:id/milestones',
    async ({ actor, body, params, reply }) =>
      reply(await createMilestone(toPrincipal(actor), params.id, body), true),
    { params: IdParam, body: CreateMilestoneBody },
  )
  /** Edit title, description, due date or phase of a milestone. */
  .patch(
    '/:id/milestones/:mid',
    async ({ actor, body, params, reply }) =>
      reply(await updateMilestone(toPrincipal(actor), params.id, params.mid, body)),
    { params: MilestoneParams, body: UpdateMilestoneBody },
  )
  /** Delete a milestone. */
  .delete(
    '/:id/milestones/:mid',
    async ({ actor, params, reply }) =>
      reply(await deleteMilestone(toPrincipal(actor), params.id, params.mid)),
    { params: MilestoneParams },
  )
  /** Mark a milestone reached now (repeating it changes nothing). */
  .post(
    '/:id/milestones/:mid/reach',
    async ({ actor, params, reply }) =>
      reply(await setMilestoneReached(toPrincipal(actor), params.id, params.mid, true)),
    { params: MilestoneParams },
  )
  /** Take the reached mark back. */
  .post(
    '/:id/milestones/:mid/unreach',
    async ({ actor, params, reply }) =>
      reply(await setMilestoneReached(toPrincipal(actor), params.id, params.mid, false)),
    { params: MilestoneParams },
  );
