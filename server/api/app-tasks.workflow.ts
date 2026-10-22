/**
 * Task workflow routes (S2-05): `POST /tasks/:ref/<action>` for the six steps of `ENABLED_TASK_ACTIONS`.
 * Each answers `{ task, can }` built from the updated row, so the UI can redraw the buttons without a
 * reload. The review steps (`request-review`, `approve`, `return`) are not registered until S4 (404).
 */
import { Elysia, t } from 'elysia';
import { TASK_CANCEL_CATEGORIES } from '../pm/enums';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { requestClock } from '../task/task.clock';
import { type EnabledTaskAction, TASK_CANCEL_NOTE_MAX } from '../task/task.limits';
import { applyTransition, type TransitionInput } from '../task/task-workflow.service';
import { appContext } from './app-context';
import { Id, oneOf } from './app-tasks.schema';

type Actor = { user: { id: string; name: string } } & Parameters<typeof toPrincipal>[0];
type StatusFn = Parameters<typeof fail>[0];

const Params = t.Object({ ref: Id });
// The length rule (3-200 characters) is the policy's, so an empty or short reason answers REASON_REQUIRED.
const ReopenBody = t.Object({ reason: t.Optional(t.String()) });
const CancelBody = t.Object({
  category: oneOf(TASK_CANCEL_CATEGORIES),
  note: t.Optional(t.String({ maxLength: TASK_CANCEL_NOTE_MAX })),
});

/** Runs one step for the caller and maps a refusal to the uniform error body. */
async function run(
  actor: Actor,
  ref: string,
  step: EnabledTaskAction,
  input: TransitionInput,
  status: StatusFn,
) {
  const author = { principal: toPrincipal(actor), name: actor.user.name };
  const r = await applyTransition(author, ref, step, input, requestClock());
  return r.ok ? { task: r.task, can: r.can } : fail(status, r.code);
}

export const taskWorkflowApi = new Elysia({ prefix: '/tasks' })
  .use(appContext)
  /** Mulai kerjakan: todo → in_progress; an unassigned task becomes the caller's. */
  .post('/:ref/start', ({ actor, params, status }) => run(actor, params.ref, 'start', {}, status), {
    params: Params,
  })
  /** Batal mulai: in_progress → todo. */
  .post(
    '/:ref/unstart',
    ({ actor, params, status }) => run(actor, params.ref, 'unstart', {}, status),
    { params: Params },
  )
  /** Tandai selesai: from todo (T-A4) or in_progress; a task that needs review answers REVIEW_REQUIRED. */
  .post(
    '/:ref/complete',
    ({ actor, params, status }) => run(actor, params.ref, 'complete', {}, status),
    { params: Params },
  )
  /** Buka lagi: done → in_progress with a reason. */
  .post(
    '/:ref/reopen',
    ({ actor, body, params, status }) =>
      run(actor, params.ref, 'reopen', { reason: body.reason }, status),
    { params: Params, body: ReopenBody },
  )
  /** Batalkan tugas: needs a category, and a note when the category is "other". */
  .post(
    '/:ref/cancel',
    ({ actor, body, params, status }) => run(actor, params.ref, 'cancel', body, status),
    { params: Params, body: CancelBody },
  )
  /** Pulihkan: canceled → todo. */
  .post(
    '/:ref/uncancel',
    ({ actor, params, status }) => run(actor, params.ref, 'uncancel', {}, status),
    { params: Params },
  );
