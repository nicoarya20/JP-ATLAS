/**
 * Project template routes (`/api/app/projects/templates`, plan §6): list/detail/CRUD and "use"
 * (instantiate). Mounted directly in `app.ts` with its own full prefix, sibling of `projectsApi`
 * (same pattern as `app-projects.members.ts`) so this stays within the route budget instead of
 * growing `projectsApi` past it. Every route is private to its caller (plan §1.5) — a non-owner and
 * a missing id answer the identical 404, never a 403 (D8-style, `server/access/project-template.policy.ts`).
 */
import { Elysia } from 'elysia';
import { PAGE_LIMIT_DEFAULT } from '../pm/limits';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { getProjectDetail } from '../project/project.query';
import type { WriteResult } from '../project/project.service';
import { getTemplateDetail, listTemplates } from '../project/project-template.query';
import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
  useTemplate,
} from '../project/project-template.service';
import { IdParam } from './app-common';
import { appContext } from './app-context';
import {
  SaveTemplateBody,
  TemplateListQuery,
  UseTemplateBody,
} from './app-projects.templates.schema';

const HTTP_NO_CONTENT = 204;

export const projectTemplatesApi = new Elysia({ prefix: '/projects/templates' })
  .use(appContext)
  .derive(({ actor, status }) => {
    const principal = toPrincipal(actor);
    return {
      /** Answers a template write with the fresh template detail, or its uniform error body. */
      async replyTemplate(result: WriteResult<{ id: string }>, created = false) {
        if (!result.ok) return fail(status, result.code, { error: result.error });
        const detail = await getTemplateDetail(principal, result.value.id);
        if (!detail) return fail(status, 'NOT_FOUND');
        return created ? status(201, detail) : detail;
      },
      /** Answers "use" with the fresh *project* detail (same 201 shape as `POST /app/projects`). */
      async replyProject(result: WriteResult<{ id: string }>) {
        if (!result.ok) return fail(status, result.code, { error: result.error });
        const detail = await getProjectDetail(principal, result.value.id, new Date());
        if (!detail) return fail(status, 'NOT_FOUND');
        return status(201, detail);
      },
    };
  })
  /** The caller's own templates: `{ items, total, page, limit }`, newest first, optionally searched. */
  .get(
    '/',
    async ({ actor, query }) => {
      const limit = query.limit ?? PAGE_LIMIT_DEFAULT;
      const page = Math.floor(query.page ?? 1);
      const { items, total } = await listTemplates(toPrincipal(actor), {
        q: query.q?.trim() || undefined,
        limit,
        offset: Math.min((page - 1) * limit, Number.MAX_SAFE_INTEGER),
      });
      return { items, total, page, limit };
    },
    { query: TemplateListQuery },
  )
  /** One template with its phases/tasks; a non-owner and a missing id answer the same 404. */
  .get(
    '/:id',
    async ({ actor, params, status }) => {
      const detail = await getTemplateDetail(toPrincipal(actor), params.id);
      return detail ?? fail(status, 'NOT_FOUND');
    },
    { params: IdParam },
  )
  /** Saves a new template (manual form, or "Simpan sebagai template" from a story draft). */
  .post(
    '/',
    async ({ actor, body, replyTemplate }) =>
      replyTemplate(await createTemplate(toPrincipal(actor), body), true),
    { body: SaveTemplateBody },
  )
  /** Replaces name/description/source and every phase/task (no per-item edit, plan §6). */
  .patch(
    '/:id',
    async ({ actor, body, params, replyTemplate }) =>
      replyTemplate(await updateTemplate(toPrincipal(actor), params.id, body)),
    { params: IdParam, body: SaveTemplateBody },
  )
  /**
   * Deletes a template the caller owns; permanent (T2 in the UI, plan §9.3). API keys are denied this
   * route automatically: it matches the existing `DELETE projects/*` pattern in `scopes.pm.ts`.
   */
  .delete(
    '/:id',
    async ({ actor, params, status }) => {
      const result = await deleteTemplate(toPrincipal(actor), params.id);
      if (!result.ok) return fail(status, result.code);
      return status(HTTP_NO_CONTENT);
    },
    { params: IdParam },
  )
  /** Instantiates a template into a real project, through the same `createProject()` as the plain form. */
  .post(
    '/:id/use',
    async ({ actor, body, params, replyProject }) =>
      replyProject(await useTemplate(toPrincipal(actor), params.id, body)),
    { params: IdParam, body: UseTemplateBody },
  );
