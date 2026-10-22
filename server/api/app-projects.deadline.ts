/**
 * Deadline, manual-condition and activity routes (`/api/app/projects/:id/...`, S5a-03). Writes need
 * a manager of the project or an Admin; reads need only the right to see the project. Mounted through
 * `app-projects.schedule.ts`. Setting or clearing the manual condition is audited; a key may not call
 * it, nor `extend-deadline` (`PM_KEY_DENY`).
 */
import { Elysia, t } from 'elysia';
import { maskEmail } from '../account/mask-email';
import { AUDIT_ACTIONS, audit } from '../audit';
import { EXTENSION_REASON_CATEGORIES, PROJECT_CONDITIONS } from '../pm/enums';
import { PAGE_LIMIT_MAX } from '../pm/limits';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { EXTENSION_REASON_MAX, OVERRIDE_REASON_MAX } from '../project/project.limits';
import { listProjectActivity } from '../project/project-activity.query';
import { DEADLINE_ERRORS, DEADLINE_HTTP, isDeadlineCode } from '../project/project-deadline.errors';
import type { DeadlineResult } from '../project/project-deadline.guard';
import { EXTENSIONS_LIMIT_DEFAULT, listExtensions } from '../project/project-deadline.query';
import { extendDeadline } from '../project/project-deadline.service';
import { clearConditionOverride, setConditionOverride } from '../project/project-override.service';
import { IdParam, oneOf } from './app-common';
import { appContext } from './app-context';

const strict = { additionalProperties: false } as const;
// Shape only; the service rejects impossible dates such as 2030-02-30.
const DATE_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$';
const EXPIRES_AT_MAX = 40;

const ExtendBody = t.Object(
  {
    newDueDate: t.String({ pattern: DATE_PATTERN }),
    reasonCategory: oneOf(EXTENSION_REASON_CATEGORIES),
    reason: t.String({ minLength: 1, maxLength: EXTENSION_REASON_MAX }),
  },
  strict,
);
const OverrideBody = t.Object(
  {
    condition: oneOf(PROJECT_CONDITIONS),
    reason: t.String({ minLength: 1, maxLength: OVERRIDE_REASON_MAX }),
    expiresAt: t.Optional(t.Nullable(t.String({ maxLength: EXPIRES_AT_MAX }))),
  },
  strict,
);
const limit = t.Optional(t.Numeric({ minimum: 1, maximum: PAGE_LIMIT_MAX }));
const ExtensionsQuery = t.Object({ limit });
const ActivityQuery = t.Object({ limit, cursor: t.Optional(t.String({ minLength: 1 })) });

export const projectDeadlineApi = new Elysia({ prefix: '/projects' })
  .use(appContext)
  .derive(({ status }) => ({
    /** The uniform error body of a refused write: this slice's 422 codes, else the shared catalog. */
    refuse(r: Extract<DeadlineResult<unknown>, { ok: false }>) {
      if (isDeadlineCode(r.code)) {
        return status(DEADLINE_HTTP, { error: r.error ?? DEADLINE_ERRORS[r.code], code: r.code });
      }
      return fail(status, r.code, { error: r.error });
    },
  }))
  /** Move the due date later with a reason; answers the new dates and the history row. */
  .post(
    '/:id/extend-deadline',
    async ({ actor, body, params, refuse, status }) => {
      const r = await extendDeadline(toPrincipal(actor), params.id, body);
      return r.ok ? status(201, r.value) : refuse(r);
    },
    { params: IdParam, body: ExtendBody },
  )
  /** Deadline history, newest first; `count` is every extension ever made (the "Diperpanjang ×N" badge). */
  .get(
    '/:id/extensions',
    async ({ actor, params, query, status }) => {
      const max = query.limit ?? EXTENSIONS_LIMIT_DEFAULT;
      const r = await listExtensions(toPrincipal(actor), params.id, max);
      return r
        ? { items: r.items, count: r.total, total: r.total, limit: max }
        : fail(status, 'NOT_FOUND');
    },
    { params: IdParam, query: ExtensionsQuery },
  )
  /** Set a manual condition (replaces the one in force); active projects only. */
  .post(
    '/:id/condition-override',
    async ({ actor, body, params, refuse, request, status }) => {
      const r = await setConditionOverride(toPrincipal(actor), params.id, body);
      if (!r.ok) return refuse(r);
      // The reason stays out of the audit text: it is free text the manager wrote for the project.
      void audit({
        actor: { id: actor.user.id, email: maskEmail(actor.user.email) },
        headers: request.headers,
        action: AUDIT_ACTIONS.PROJECT_CONDITION_SET,
        targetType: 'project',
        targetId: params.id,
        summary: `Kondisi proyek diatur manual: ${body.condition}`,
        meta: { condition: body.condition },
      });
      return status(201, { conditionOverride: r.value });
    },
    { params: IdParam, body: OverrideBody },
  )
  /** Remove the manual condition in force; asking when none is set is not an error. */
  .delete(
    '/:id/condition-override',
    async ({ actor, params, refuse, request }) => {
      const r = await clearConditionOverride(toPrincipal(actor), params.id);
      if (!r.ok) return refuse(r);
      // Nothing to record when there was nothing to clear.
      if (r.value.cleared > 0) {
        void audit({
          actor: { id: actor.user.id, email: maskEmail(actor.user.email) },
          headers: request.headers,
          action: AUDIT_ACTIONS.PROJECT_CONDITION_CLEAR,
          targetType: 'project',
          targetId: params.id,
          summary: 'Kondisi proyek manual dicabut',
        });
      }
      return { conditionOverride: null, cleared: r.value.cleared };
    },
    { params: IdParam },
  )
  /** Latest changes of the project, newest first, with a keyset `nextCursor`. */
  .get(
    '/:id/activity',
    async ({ actor, params, query, status }) => {
      const r = await listProjectActivity(toPrincipal(actor), params.id, query);
      return r.ok ? r.value : fail(status, r.code);
    },
    { params: IdParam, query: ActivityQuery },
  );
