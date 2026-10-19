/** Request schemas of the task routes (S2-03/S2-04); limits come from `task/task.limits.ts`, like the form. */
import { type TSchema, t } from 'elysia';
import { SCHEDULE_GROUPS } from '../metrics/schedule';
import { PROJECT_PRIORITIES, TASK_STATUSES } from '../pm/enums';
import {
  TASK_CHECKLIST_INITIAL_MAX,
  TASK_CHECKLIST_TEXT_MAX,
  TASK_DESCRIPTION_MAX,
  TASK_LIST_SCOPES,
  TASK_SEARCH_MAX,
  TASK_SORTS,
  TASK_TITLE_MAX,
} from '../task/task.limits';
import { CursorQuery } from './app-common';

// Not `t.UnionEnum`: it silently defaults to its first value, which would turn "no filter" into a filter.
// The cast restores the literal type a mapped `t.Union` loses (it would infer `never`); runtime is unchanged.
export const oneOf = <const T extends string>(values: readonly T[]) =>
  t.Union(values.map((v) => t.Literal(v))) as unknown as TSchema & { static: T };

/** One value or several (`?status=todo&status=done`); the query layer takes arrays. */
const many = <const T extends string>(values: readonly T[]) =>
  t.Optional(t.Union([oneOf(values), t.Array(oneOf(values), { minItems: 1 })]));

export const asList = <T>(v: T | T[] | undefined): T[] | undefined =>
  v === undefined ? undefined : Array.isArray(v) ? v : [v];

/** Query of `GET /tasks`. */
export const ListQuery = t.Object({
  ...CursorQuery.properties,
  scope: t.Optional(oneOf(TASK_LIST_SCOPES)),
  projectId: t.Optional(t.String({ minLength: 1 })),
  status: many(TASK_STATUSES),
  assigneeId: t.Optional(t.String({ minLength: 1 })),
  priority: many(PROJECT_PRIORITIES),
  q: t.Optional(t.String({ maxLength: TASK_SEARCH_MAX })),
  due: t.Optional(oneOf(SCHEDULE_GROUPS)),
  sort: t.Optional(oneOf(TASK_SORTS)),
});

const Title = t.String({ minLength: 1, maxLength: TASK_TITLE_MAX });
const Description = t.Nullable(t.String({ maxLength: TASK_DESCRIPTION_MAX }));
const Day = t.Nullable(t.String({ format: 'date' }));
export const Id = t.String({ minLength: 1 });
const Priority = oneOf(PROJECT_PRIORITIES);

/** Fields that belong to later slices (tags S4, estimates S5): present = 422. */
const LATER = {
  tags: t.Optional(t.Never()),
  estimateHours: t.Optional(t.Never()),
};

/** Body of `POST /tasks`. */
export const CreateBody = t.Object(
  {
    projectId: Id,
    title: Title,
    description: t.Optional(Description),
    assigneeId: t.Optional(t.Nullable(Id)),
    priority: t.Optional(Priority),
    dueDate: t.Optional(Day),
    startDate: t.Optional(Day),
    kindId: t.Optional(Id),
    checklist: t.Optional(
      t.Array(t.String({ minLength: 1, maxLength: TASK_CHECKLIST_TEXT_MAX }), {
        maxItems: TASK_CHECKLIST_INITIAL_MAX,
      }),
    ),
    // Review stays off until S4 (KB-6): a form may send `false`, never `true`.
    needsReview: t.Optional(t.Literal(false)),
    phaseId: t.Optional(t.Nullable(Id)),
    ...LATER,
  },
  { additionalProperties: false },
);

/** Body of `PATCH /tasks/:ref`. */
export const UpdateBody = t.Object(
  {
    title: t.Optional(Title),
    description: t.Optional(Description),
    assigneeId: t.Optional(t.Nullable(Id)),
    priority: t.Optional(Priority),
    dueDate: t.Optional(Day),
    startDate: t.Optional(Day),
    kindId: t.Optional(Id),
    phaseId: t.Optional(t.Nullable(Id)),
    needsReview: t.Optional(t.Never()),
    ...LATER,
  },
  { additionalProperties: false },
);
