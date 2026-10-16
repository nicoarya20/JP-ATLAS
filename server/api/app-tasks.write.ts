/**
 * Task write routes (S2-04): `POST /tasks` and `PATCH /tasks/:ref`, mounted inside `tasksApi` so they
 * share its `/tasks` prefix. Bodies are closed: unknown keys are dropped by Elysia before the handler
 * runs, and the S4-S5 fields (`needsReview: true`, `tags`, `phaseId`, `estimateHours`) answer 422.
 * There is no delete route: the Trash for tasks ships in S6 (X1-Q1).
 */
import { Elysia, t } from 'elysia';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { requestClock } from '../task/task.clock';
import { createTask, type TaskWriteResult, updateTask } from '../task/task.service';
import { appContext } from './app-context';
import { CreateBody, Id, UpdateBody } from './app-tasks.schema';

type Actor = { user: { id: string; name: string } } & Parameters<typeof toPrincipal>[0];
const authorOf = (actor: Actor) => ({ principal: toPrincipal(actor), name: actor.user.name });

export const taskWriteApi = new Elysia()
  .use(appContext)
  /** Creates a task in a project the caller works in; answers 201 with the task detail. */
  .post(
    '/',
    async ({ actor, body, status }) => {
      const { needsReview: _off, ...input } = body;
      const r: TaskWriteResult = await createTask(authorOf(actor), input, requestClock());
      if (!r.ok) return fail(status, r.code, r.error ? { error: r.error } : {});
      return status(201, r.task);
    },
    { body: CreateBody },
  )
  /** Changes some fields of a task the caller may edit; answers the updated task detail. */
  .patch(
    '/:ref',
    async ({ actor, body, params, status }) => {
      const r = await updateTask(authorOf(actor), params.ref, body, requestClock());
      return r.ok ? r.task : fail(status, r.code, r.error ? { error: r.error } : {});
    },
    { params: t.Object({ ref: Id }), body: UpdateBody },
  );
