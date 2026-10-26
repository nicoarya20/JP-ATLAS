/**
 * Trash routes (`/api/app/trash`). The list merges trashed projects, tasks and events (`kind`
 * item field, `?kind=all|project|task|event`, `counts` per kind); restore is one route per kind, and
 * `DELETE /:kind/:id` deletes one item for good (S6 Z-04). Restores and the permanent delete are
 * session only (`PM_KEY_DENY`) and audited; the list is a read (`app:read`). The 30-day retention
 * sweep (`server/trash/trash.purge.ts`) does the same deletion on a schedule, with no actor.
 */
import { Elysia, t } from 'elysia';
import { maskEmail } from '../account/mask-email';
import { AUDIT_ACTIONS, audit } from '../audit';
import { requestEventClock } from '../event/events.clock';
import { restoreEvent } from '../event/events.trash';
import { PAGE_LIMIT_DEFAULT } from '../pm/limits';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { restoreProject } from '../project/project-trash.service';
import { restoreTask } from '../task/task-trash.service';
import { listTrash, TRASH_KINDS } from '../trash/trash.list.query';
import { PURGE_KINDS, purgeItem } from '../trash/trash.purge-item.service';
import { IdParam, oneOf, PageQuery } from './app-common';
import { appContext } from './app-context';

const TrashQuery = t.Object({ ...PageQuery.properties, kind: t.Optional(oneOf(TRASH_KINDS)) });
/** `kind` is validated against the three real kinds, so a typo answers 422 instead of 404. */
const PurgeParams = t.Object({ ...IdParam.properties, kind: oneOf(PURGE_KINDS) });
/** How the audit summary names each kind, in Indonesian like the rest of the log. */
const PURGE_LABEL: Record<(typeof PURGE_KINDS)[number], string> = {
  project: 'Proyek',
  task: 'Tugas',
  event: 'Acara',
};

export const trashApi = new Elysia({ prefix: '/trash' })
  .use(appContext)
  /**
   * Trashed projects, tasks and events the caller may see: `{ items, total, page, limit, counts }`, newest
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
  )
  /** Brings one trashed event back with its guests and minutes; the project must be out of the Trash first. */
  .post(
    '/event/:id/restore',
    async ({ actor, params, request, status }) => {
      const result = await restoreEvent(toPrincipal(actor), params.id, requestEventClock().now);
      if (!result.ok) return fail(status, result.code, result.error ? { error: result.error } : {});
      const { id, projectId } = result.value;
      void audit({
        actor: { id: actor.user.id, email: maskEmail(actor.user.email) },
        headers: request.headers,
        action: AUDIT_ACTIONS.EVENT_RESTORE,
        targetType: 'event',
        targetId: id,
        // Ids only: an event title can name a person or a client, and the audit log outlives the Trash.
        summary: 'Acara dipulihkan dari Sampah',
        meta: { projectId },
      });
      return { id };
    },
    { params: IdParam },
  )
  /**
   * Deletes one Trash item for good: `{ kind, id, purged: { projects, tasks, events } }`. Admin and
   * Super-admin only, which is exactly what the item's `can.purge` already told the client, so no
   * client ever has to branch on a role to find the button. Session only (`PM_KEY_DENY`).
   */
  .delete(
    '/:kind/:id',
    async ({ actor, params, request, status }) => {
      const result = await purgeItem(toPrincipal(actor), params.kind, params.id);
      if (!result.ok) return fail(status, result.code);
      const { kind, id, purged } = result.value;
      void audit({
        actor: { id: actor.user.id, email: maskEmail(actor.user.email) },
        headers: request.headers,
        action: AUDIT_ACTIONS.TRASH_PURGE,
        targetType: kind,
        targetId: id,
        // Ids and counts only: a title can name a person or a client, and the log outlives the row.
        summary:
          kind === 'project'
            ? `${PURGE_LABEL[kind]} dihapus permanen dari Sampah bersama ${purged.tasks} tugas dan ${purged.events} acara`
            : `${PURGE_LABEL[kind]} dihapus permanen dari Sampah`,
        meta: { kind, ...purged },
      });
      return { kind, id, purged };
    },
    { params: PurgeParams },
  );
