/**
 * `DELETE /events/:id` (S7 E-07): sends an event to the Trash. A soft delete the Trash page can undo
 * (X1-Q1: no dialog, an "Urungkan" toast that calls `POST /trash/event/:id/restore` in `app-trash.ts`),
 * but session only: `PM_KEY_DENY` refuses it for every API key. It sits apart from `app-events.ts`
 * and is mounted by `app.ts`, like the task routes, so each router stays inside its route budget.
 * The audit entry carries ids, never the title.
 */
import { Elysia } from 'elysia';
import { maskEmail } from '../account/mask-email';
import { AUDIT_ACTIONS, audit } from '../audit';
import { requestEventClock } from '../event/events.clock';
import { trashEvent } from '../event/events.trash';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { IdParam } from './app-common';
import { appContext } from './app-context';

export const eventTrashApi = new Elysia({ prefix: '/events' }).use(appContext).delete(
  '/:id',
  async ({ actor, params, request, status }) => {
    const r = await trashEvent(toPrincipal(actor), params.id, requestEventClock().now);
    if (!r.ok) return fail(status, r.code, r.error ? { error: r.error } : {});
    const { id, label, projectId } = r.value;
    void audit({
      actor: { id: actor.user.id, email: maskEmail(actor.user.email) },
      headers: request.headers,
      action: AUDIT_ACTIONS.EVENT_TRASH,
      targetType: 'event',
      targetId: id,
      summary: 'Acara dipindah ke Sampah',
      meta: { projectId },
    });
    return { trash: { kind: 'event' as const, id, label } };
  },
  { params: IdParam },
);
