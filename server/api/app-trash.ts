/**
 * Trash routes (`/api/app/trash`). S1-05 ships restore for projects only; the `:kind` segment keeps
 * the R04 shape so S6 adds tasks, events, the list and purge. Session only (`PM_KEY_DENY`), audited.
 */
import { Elysia } from 'elysia';
import { maskEmail } from '../account/mask-email';
import { AUDIT_ACTIONS, audit } from '../audit';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { restoreProject } from '../project/project-trash.service';
import { IdParam } from './app-common';
import { appContext } from './app-context';

export const trashApi = new Elysia({ prefix: '/trash' }).use(appContext).post(
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
