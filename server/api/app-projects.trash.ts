/**
 * Project soft-delete route (`DELETE /api/app/projects/:id`, S1-05): moves the project and its live
 * tasks to the Trash. Session only (`PM_KEY_DENY`); audited because deleting is a privileged action.
 */
import { Elysia } from 'elysia';
import { maskEmail } from '../account/mask-email';
import { AUDIT_ACTIONS, audit } from '../audit';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { trashProject } from '../project/project-trash.service';
import { IdParam } from './app-common';
import { appContext } from './app-context';

export const projectTrashApi = new Elysia({ prefix: '/projects' }).use(appContext).delete(
  '/:id',
  async ({ actor, params, request, status }) => {
    const result = await trashProject(toPrincipal(actor), params.id);
    if (!result.ok) return fail(status, result.code, { error: result.error });
    const { id, tasks } = result.value;
    void audit({
      actor: { id: actor.user.id, email: maskEmail(actor.user.email) },
      headers: request.headers,
      action: AUDIT_ACTIONS.PROJECT_TRASH,
      targetType: 'project',
      targetId: id,
      summary: `Proyek dipindah ke Sampah bersama ${tasks} tugas`,
      meta: { tasks },
    });
    return { id, tasks };
  },
  { params: IdParam },
);
