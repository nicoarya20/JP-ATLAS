/**
 * `POST /api/app/tasks/draft` ("Tulis saja ✦", A1), mounted inside `tasksApi` for the `/tasks`
 * prefix. It proposes draft tasks from a story and saves nothing; the contract is in
 * `ai/task-draft.types.ts`. Without a provider key it answers 503 `AI_DISABLED`, so the app boots
 * and the form keeps working.
 */
import { Elysia, t } from 'elysia';
import { TASK_DRAFT_CODES, TASK_DRAFT_MESSAGES } from '../ai/task-draft.limits';
import { draftTasks } from '../ai/task-draft.service';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { requestClock } from '../task/task.clock';
import { appContext } from './app-context';
import { Id } from './app-tasks.schema';

const HTTP_BAD_REQUEST = 400;
const HTTP_RATE_LIMITED = 429;
const HTTP_BAD_GATEWAY = 502;
const HTTP_UNAVAILABLE = 503;

export const taskDraftApi = new Elysia().use(appContext).post(
  '/draft',
  async ({ actor, body, set, status }) => {
    const r = await draftTasks(toPrincipal(actor), body, requestClock());
    if (r.ok) return r.body;
    switch (r.code) {
      case TASK_DRAFT_CODES.textEmpty:
        return status(HTTP_BAD_REQUEST, { error: TASK_DRAFT_MESSAGES.textEmpty, code: r.code });
      case TASK_DRAFT_CODES.textTooLong:
        return status(HTTP_BAD_REQUEST, { error: TASK_DRAFT_MESSAGES.textTooLong, code: r.code });
      case TASK_DRAFT_CODES.disabled:
        return status(HTTP_UNAVAILABLE, { error: TASK_DRAFT_MESSAGES.disabled, code: r.code });
      case TASK_DRAFT_CODES.unavailable:
        return status(HTTP_BAD_GATEWAY, { error: TASK_DRAFT_MESSAGES.unavailable, code: r.code });
      case 'RATE_LIMITED': {
        const seconds = r.retryAfterSeconds ?? 1;
        set.headers['retry-after'] = String(seconds);
        return status(HTTP_RATE_LIMITED, {
          error: TASK_DRAFT_MESSAGES.rateLimited(seconds),
          code: r.code,
          retryAfterSeconds: seconds,
        });
      }
      default:
        return fail(status, r.code);
    }
  },
  { body: t.Object({ projectId: Id, text: t.String() }, { additionalProperties: false }) },
);
