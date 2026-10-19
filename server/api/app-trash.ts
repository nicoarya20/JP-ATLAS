/**
 * Trash routes (`/api/app/trash`). The list merges trashed projects and trashed tasks (`kind`
 * item field, `?kind=all|project|task`, `counts` per kind); restore is one route per kind. Restores
 * are session only (`PM_KEY_DENY`) and audited; the list is a read (`app:read`). Permanent delete and
 * the 30-day purge are the rest of S6 and are not here.
 */
import { Elysia, t } from 'elysia';
import { maskEmail } from '../account/mask-email';
import { AUDIT_ACTIONS, audit } from '../audit';
import { PAGE_LIMIT_DEFAULT } from '../pm/limits';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { restoreProject } from '../project/project-trash.service';
import { restoreTask } from '../task/task-trash.service';
import { listTrash, TRASH_KINDS } from '../trash/trash.list.query';
import { IdParam, oneOf, PageQuery } from './app-common';
import { appContext } from './app-context';

const TrashQuery = t.Object({ ...PageQuery.properties, kind: t.Optional(oneOf(TRASH_KINDS)) });

export const trashApi = new Elysia({ prefix: '/trash' })
  .use(appContext)
  /**
   * Trashed projects and tasks the caller may see: `{ items, total, page, limit, counts }`, newest
   * delete first. `kind` (default `all`) narrows the page; `total` follows it, `counts` does not.
   */
  .get(
    '/',
    async ({ actor, query }) => {
      const limit = query.limit ?? PAGE_LIMIT_DEFAULT;
      const page = Math.floor(query.page ?? 1);
      const { items, total, counts } = await listTrash(toPrincipal(actor), {
        kind: query.kind ?? 'all',
        limit,
        // Capped so an absurd `page` stays a valid, empty page instead of a database error.
        offset: Math.min((page - 1) * limit, Number.MAX_SAFE_INTEGER),
        now: new Date(),
      });
      return { items, total, page, limit, counts };
    },
    { query: TrashQuery },
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
  )
  /** Brings one trashed task back with the same number; the project must be out of the Trash first. */
  .post(
    '/task/:id/restore',
    async ({ actor, params, request, status }) => {
      const result = await restoreTask(toPrincipal(actor), params.id);
      if (!result.ok) return fail(status, result.code, result.error ? { error: result.error } : {});
      const { id, number, projectId } = result.value;
      void audit({
        actor: { id: actor.user.id, email: maskEmail(actor.user.email) },
        headers: request.headers,
        action: AUDIT_ACTIONS.TASK_RESTORE,
        targetType: 'task',
        targetId: id,
        summary: `Tugas #${number} dipulihkan dari Sampah`,
        meta: { number, projectId },
      });
      return { id, number };
    },
    { params: IdParam },
  );
