/**
 * `DELETE /tasks/:ref` (S6 D1): sends a task to the Trash, mounted inside `tasksApi` so it shares the
 * `/tasks` prefix. This is a soft delete the Trash page can undo (X1-Q1: no dialog, an "Urungkan"
 * toast instead), but it is session only: `PM_KEY_DENY` refuses it for every API key. The restore
 * route lives in `app-trash.ts`. The audit entry carries the number and ids, never the title.
 */
import { Elysia, t } from 'elysia';
import { maskEmail } from '../account/mask-email';
import { AUDIT_ACTIONS, audit } from '../audit';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { trashTask } from '../task/task-trash.service';
import { appContext } from './app-context';
import { Id } from './app-tasks.schema';

export const taskDeleteApi = new Elysia().use(appContext).delete(
  '/:ref',
  async ({ actor, params, request, status }) => {
    const r = await trashTask(toPrincipal(actor), params.ref);
    if (!r.ok) return fail(status, r.code, r.error ? { error: r.error } : {});
    const { id, number, projectId } = r.value;
    void audit({
      actor: { id: actor.user.id, email: maskEmail(actor.user.email) },
      headers: request.headers,
      action: AUDIT_ACTIONS.TASK_TRASH,
      targetType: 'task',
      targetId: id,
      summary: `Tugas #${number} dipindah ke Sampah`,
      meta: { number, projectId },
    });
    return { trash: { kind: 'task' as const, id, number, label: `#${number} ${r.value.title}` } };
  },
  { params: t.Object({ ref: Id }) },
);
