/** Project write routes (`/api/app/projects`): create, edit, change status and hand over the Lead (S1-03). */
import { Elysia, t } from 'elysia';
import { PROJECT_MEMBER_ROLES, PROJECT_PRIORITIES, PROJECT_STATUSES } from '../pm/enums';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import {
  PROJECT_CREATE_MEMBERS_MAX,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_INITIAL_STATUSES,
  PROJECT_NAME_MAX,
} from '../project/project.limits';
import { getProjectDetail } from '../project/project.query';
import {
  createProject,
  setProjectLead,
  setProjectStatus,
  updateProject,
  type WriteResult,
} from '../project/project.service';
import { IdParam, oneOf } from './app-common';
import { appContext } from './app-context';

const strict = { additionalProperties: false } as const;
const name = t.String({ minLength: 1, maxLength: PROJECT_NAME_MAX });
const description = t.Optional(t.Nullable(t.String({ maxLength: PROJECT_DESCRIPTION_MAX })));
// Shape only; the service rejects impossible dates such as 2026-02-30 and years outside
// CALENDAR_YEAR_MIN..CALENDAR_YEAR_MAX, with an Indonesian message a shape error cannot give (PD-01).
const date = t.Optional(t.Nullable(t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })));
const userId = t.String({ minLength: 1 });

// Unknown keys (`createdBy`, `deletedAt`, `id`, ...) are a 422: nothing outside this list is ever written.
const CreateBody = t.Object(
  {
    name,
    description,
    status: t.Optional(oneOf(PROJECT_INITIAL_STATUSES)),
    priority: t.Optional(oneOf(PROJECT_PRIORITIES)),
    leadId: t.Optional(userId),
    startDate: date,
    dueDate: date,
    members: t.Optional(
      t.Array(t.Object({ userId, role: oneOf(PROJECT_MEMBER_ROLES) }, strict), {
        maxItems: PROJECT_CREATE_MEMBERS_MAX,
      }),
    ),
    tasksNeedReviewDefault: t.Optional(t.Boolean()),
  },
  strict,
);

// The Lead and the status have their own routes, so `leadId` and `status` are unknown keys here.
const UpdateBody = t.Object(
  {
    name: t.Optional(name),
    description,
    priority: t.Optional(oneOf(PROJECT_PRIORITIES)),
    startDate: date,
    dueDate: date,
  },
  strict,
);

const StatusBody = t.Object({ status: oneOf(PROJECT_STATUSES) }, strict);
const LeadBody = t.Object({ userId }, strict);

export const projectWriteApi = new Elysia()
  .use(appContext)
  .derive(({ actor, status }) => ({
    /** Answers a write with the fresh project detail, or its uniform error body. */
    async reply(result: WriteResult<{ id: string }>, created = false) {
      if (!result.ok) return fail(status, result.code, { error: result.error });
      const detail = await getProjectDetail(toPrincipal(actor), result.value.id, new Date());
      if (!detail) return fail(status, 'NOT_FOUND');
      return created ? status(201, detail) : detail;
    },
  }))
  /** Create a project (Project Manager and above); the caller and the Lead become managers. */
  .post(
    '/',
    async ({ actor, body, reply }) => reply(await createProject(toPrincipal(actor), body), true),
    {
      body: CreateBody,
    },
  )
  /** Edit name, description, priority and dates (managers, Admin). */
  .patch(
    '/:id',
    async ({ actor, body, params, reply }) =>
      reply(await updateProject(toPrincipal(actor), params.id, body)),
    { params: IdParam, body: UpdateBody },
  )
  /** Move the project to any of the five statuses. */
  .post(
    '/:id/status',
    async ({ actor, body, params, reply }) =>
      reply(await setProjectStatus(toPrincipal(actor), params.id, body.status)),
    { params: IdParam, body: StatusBody },
  )
  /** Make another manager the Lead ("Pengelola utama"); session only, never an API key. */
  .put(
    '/:id/lead',
    async ({ actor, body, params, reply }) =>
      reply(await setProjectLead(toPrincipal(actor), params.id, body.userId)),
    { params: IdParam, body: LeadBody },
  );
