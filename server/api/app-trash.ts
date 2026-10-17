/**
 * Trash routes (`/api/app/trash`). S1-05 ships restore and S1-18 the list, both for projects only;
 * the `:kind` segment keeps the R04 shape so S6 adds tasks, events and purge. Restore is session only
 * (`PM_KEY_DENY`) and audited; the list is a read (`app:read`).
 */
import { Elysia } from 'elysia';
import { maskEmail } from '../account/mask-email';
import { AUDIT_ACTIONS, audit } from '../audit';
import { PAGE_LIMIT_DEFAULT } from '../pm/limits';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { listTrashProjects } from '../project/project-trash.query';
import { restoreProject } from '../project/project-trash.service';
import { IdParam, PageQuery } from './app-common';
import { appContext } from './app-context';

export const trashApi = new Elysia({ prefix: '/trash' })
  .use(appContext)
  /** Trashed projects the caller may see: `{ items, total, page, limit }`, newest delete first. */
  .get(
    '/',
    async ({ actor, query }) => {
      const limit = query.limit ?? PAGE_LIMIT_DEFAULT;
      const page = Math.floor(query.page ?? 1);
      const { items, total } = await listTrashProjects(toPrincipal(actor), {
        limit,
        // Capped so an absurd `page` stays a valid, empty page instead of a database error.
        offset: Math.min((page - 1) * limit, Number.MAX_SAFE_INTEGER),
        now: new Date(),
      });
      return { items, total, page, limit };
    },
    { query: PageQuery },
  )
  .post(
    '/project/:id/restore',
    async ({ actor, params, request, status }) => {
      const result = await restoreProject(toPrincipal(actor), params.id);
      if (!result.ok) return fail(status, result.code, { error: result.error });
      const { id, tasks } = result.value;
      void audit({
        actor: { id: actor.user.id, email: maskEmail(actor.user.email) },
        headers: request.headers,
        action: AUDIT_ACTIONS.PROJECT_RESTORE,
        targetType: 'project',
        targetId: id,
        summary: `Proyek dipulihkan dari Sampah bersama ${tasks} tugas`,
        meta: { tasks },
      });
      return { id, tasks };
    },
    { params: IdParam },
  );
