/**
 * Leave routes for the approver (`/api/app/leave`): the list of requests waiting for the caller and
 * the two decisions. Who may decide whom is `server/leave/leave.policy.ts`; the list is scoped in SQL
 * to the same rule. A Member's list is simply empty. Both decisions are audited and, being privileged,
 * session only (`PM_KEY_DENY`).
 */
import { Elysia, t } from 'elysia';
import { maskEmail } from '../account/mask-email';
import { AUDIT_ACTIONS, audit } from '../audit';
import { listPendingFor } from '../leave/leave.pending.query';
import { decideLeave } from '../leave/leave.service';
import { PAGE_LIMIT_DEFAULT } from '../pm/limits';
import { toPrincipal } from '../project/membership.query';
import { requestClock } from '../task/task.clock';
import { IdParam, PageQuery } from './app-common';
import { appContext } from './app-context';
import { leaveAnswer } from './app-leave.me';

/** Upper bound on what a client may send; the service answers a friendly 422 over its own limit. */
const REASON_GUARD = 2_000;

const RejectBody = t.Object(
  { reason: t.Optional(t.Nullable(t.String({ maxLength: REASON_GUARD }))) },
  { additionalProperties: false },
);

export const leaveDecideApi = new Elysia({ prefix: '/leave' })
  .use(appContext)
  /** Requests the caller may decide, soonest first, each with the requester's `dueTasks` during the leave. */
  .get(
    '/pending',
    ({ actor, query }) =>
      listPendingFor(
        toPrincipal(actor),
        requestClock().today,
        query.page ?? 1,
        query.limit ?? PAGE_LIMIT_DEFAULT,
      ),
    { query: PageQuery },
  )
  .post(
    '/:id/approve',
    async ({ actor, params, request, status }) => {
      const r = await decideLeave(toPrincipal(actor), params.id, 'approved', null, requestClock());
      if (r.ok) auditDecision(actor, request, 'approved', r.request);
      return leaveAnswer(r, status);
    },
    { params: IdParam },
  )
  .post(
    '/:id/reject',
    async ({ actor, body, params, request, status }) => {
      const r = await decideLeave(
        toPrincipal(actor),
        params.id,
        'rejected',
        body.reason,
        requestClock(),
      );
      if (r.ok) auditDecision(actor, request, 'rejected', r.request);
      return leaveAnswer(r, status);
    },
    { params: IdParam, body: RejectBody },
  );

type Decided = { id: string; userId: string; startDate: string; endDate: string; days: number };

/** One audit line per decision; ids and dates only, no names (the requester's id is enough to find them). */
function auditDecision(
  actor: { user: { id: string; email: string | null } },
  request: Request,
  decision: 'approved' | 'rejected',
  leave: Decided,
): void {
  void audit({
    actor: { id: actor.user.id, email: maskEmail(actor.user.email) },
    headers: request.headers,
    action: decision === 'approved' ? AUDIT_ACTIONS.LEAVE_APPROVE : AUDIT_ACTIONS.LEAVE_REJECT,
    targetType: 'leave',
    targetId: leave.id,
    summary: `Cuti ${decision === 'approved' ? 'disetujui' : 'ditolak'} (${leave.days} hari)`,
    meta: { requesterId: leave.userId, startDate: leave.startDate, endDate: leave.endDate },
  });
}
