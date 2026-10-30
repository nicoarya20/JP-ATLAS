/** Elysia body/query schemas of `/api/app/projects/templates` (plan §6), split out of the route file. */
import { t } from 'elysia';
import { PROJECT_DRAFT_PHASES_MAX, PROJECT_DRAFT_TASKS_MAX } from '../ai/project-draft.limits';
import { TASK_DRAFT_NAME_MAX } from '../ai/task-draft.limits';
import { PROJECT_MEMBER_ROLES, PROJECT_PRIORITIES, PROJECT_TEMPLATE_SOURCES } from '../pm/enums';
import { PAGE_LIMIT_DEFAULT, PAGE_LIMIT_MAX } from '../pm/limits';
import {
  PHASE_DESCRIPTION_MAX,
  PHASE_NAME_MAX,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_NAME_MAX,
} from '../project/project.limits';
import { TASK_DESCRIPTION_MAX, TASK_TITLE_MAX } from '../task/task.limits';
import { oneOf } from './app-common';

const strict = { additionalProperties: false } as const;
const offset = t.Optional(t.Nullable(t.Integer()));
const SEARCH_MAX_LENGTH = 100;

export const TemplateListQuery = t.Object({
  q: t.Optional(t.String({ maxLength: SEARCH_MAX_LENGTH })),
  page: t.Optional(t.Numeric({ minimum: 1 })),
  limit: t.Optional(
    t.Numeric({ minimum: 1, maximum: PAGE_LIMIT_MAX, default: PAGE_LIMIT_DEFAULT }),
  ),
});

/** A task inside a template, under a phase or loose: same shape, offsets instead of absolute dates. */
const TemplateTaskInput = t.Object(
  {
    title: t.String({ minLength: 1, maxLength: TASK_TITLE_MAX }),
    description: t.Optional(t.Nullable(t.String({ maxLength: TASK_DESCRIPTION_MAX }))),
    priority: t.Optional(t.Nullable(oneOf(PROJECT_PRIORITIES))),
    kindName: t.Optional(t.Nullable(t.String({ maxLength: TASK_DRAFT_NAME_MAX }))),
    dueOffsetDays: offset,
  },
  strict,
);

const TemplatePhaseInput = t.Object(
  {
    name: t.String({ minLength: 1, maxLength: PHASE_NAME_MAX }),
    description: t.Optional(t.Nullable(t.String({ maxLength: PHASE_DESCRIPTION_MAX }))),
    startOffsetDays: offset,
    endOffsetDays: offset,
    tasks: t.Optional(t.Array(TemplateTaskInput, { maxItems: PROJECT_DRAFT_TASKS_MAX })),
  },
  strict,
);

/** Body of `POST /templates` and `PATCH /templates/:id` (replace-all, plan §6). */
export const SaveTemplateBody = t.Object(
  {
    name: t.String({ minLength: 1, maxLength: PROJECT_NAME_MAX }),
    description: t.Optional(t.Nullable(t.String({ maxLength: PROJECT_DESCRIPTION_MAX }))),
    source: oneOf(PROJECT_TEMPLATE_SOURCES),
    phases: t.Optional(t.Array(TemplatePhaseInput, { maxItems: PROJECT_DRAFT_PHASES_MAX })),
    looseTasks: t.Optional(t.Array(TemplateTaskInput, { maxItems: PROJECT_DRAFT_TASKS_MAX })),
  },
  strict,
);

/** Body of `POST /templates/:id/use` (plan §5.3): what the picker form asks for before instantiating. */
export const UseTemplateBody = t.Object(
  {
    name: t.Optional(t.String({ minLength: 1, maxLength: PROJECT_NAME_MAX })),
    startDate: t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
    leadId: t.Optional(t.String({ minLength: 1 })),
    priority: t.Optional(oneOf(PROJECT_PRIORITIES)),
    members: t.Optional(
      t.Array(
        t.Object({ userId: t.String({ minLength: 1 }), role: oneOf(PROJECT_MEMBER_ROLES) }, strict),
      ),
    ),
  },
  strict,
);
