/**
 * `POST /api/app/projects/draft` ("Ceritakan proyeknya"), mounted inside `projectsApi` for the
 * `/projects` prefix. It proposes a draft project (name, dates, phases, tasks) and saves nothing;
 * the contract is in `ai/project-draft.types.ts`. Without a provider key it answers 503
 * `AI_DISABLED`, so the app boots and the form keeps working.
 */
import { Elysia, t } from 'elysia';
import { PROJECT_DRAFT_CODES, PROJECT_DRAFT_MESSAGES } from '../ai/project-draft.limits';
import { draftProject } from '../ai/project-draft.service';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { requestClock } from '../task/task.clock';
import { appContext } from './app-context';

const HTTP_BAD_REQUEST = 400;
const HTTP_RATE_LIMITED = 429;
const HTTP_BAD_GATEWAY = 502;
const HTTP_UNAVAILABLE = 503;

export const projectDraftApi = new Elysia().use(appContext).post(
  '/draft',
  async ({ actor, body, set, status }) => {
    const r = await draftProject(toPrincipal(actor), body, requestClock());
    if (r.ok) return r.body;
    switch (r.code) {
      case PROJECT_DRAFT_CODES.textEmpty:
        return status(HTTP_BAD_REQUEST, { error: PROJECT_DRAFT_MESSAGES.textEmpty, code: r.code });
      case PROJECT_DRAFT_CODES.textTooLong:
        return status(HTTP_BAD_REQUEST, {
          error: PROJECT_DRAFT_MESSAGES.textTooLong,
          code: r.code,
        });
      case PROJECT_DRAFT_CODES.disabled:
        return status(HTTP_UNAVAILABLE, { error: PROJECT_DRAFT_MESSAGES.disabled, code: r.code });
      case PROJECT_DRAFT_CODES.unavailable:
        return status(HTTP_BAD_GATEWAY, {
          error: PROJECT_DRAFT_MESSAGES.unavailable,
          code: r.code,
        });
      case 'RATE_LIMITED': {
        const seconds = r.retryAfterSeconds ?? 1;
        set.headers['retry-after'] = String(seconds);
        return status(HTTP_RATE_LIMITED, {
          error: PROJECT_DRAFT_MESSAGES.rateLimited(seconds),
          code: r.code,
          retryAfterSeconds: seconds,
        });
      }
      // NOT_APP_ROLE (not PM/Admin/super-admin) and anything else falls to the shared PM catalog.
      default:
        return fail(status, r.code);
    }
  },
  { body: t.Object({ text: t.String() }, { additionalProperties: false }) },
);
