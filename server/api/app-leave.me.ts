/**
 * Leave routes for the person asking (`/api/app/leave`, Pengaturan > Ketersediaan): read your own
 * state, send a request, withdraw one. The approver's routes are in `app-leave.decide.ts` and the
 * workspace switch in `app-leave.settings.ts`; `app-leave.ts` mounts the three so each router stays small.
 *
 * Every write answers `{ request }`, the request as `GET /leave/me` returns it. Refusals come from
 * the one error catalog (`server/pm/errors.ts`); a request the caller may not see is the 404 a
 * missing one gives. Withdrawing is audited, because it frees days an approver already agreed to.
 */
import { Elysia, t } from 'elysia';
import { maskEmail } from '../account/mask-email';
import { AUDIT_ACTIONS, audit } from '../audit';
import type { LeaveWriteResult } from '../leave/leave.dto';
import { myLeave } from '../leave/leave.query';
import { cancelLeave, submitLeave } from '../leave/leave.service';
import type { PmHttp } from '../pm/errors';
import { fail, type PmErrorBody } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { getLeaveSettings } from '../settings-leave';
import { requestClock } from '../task/task.clock';
import { IdParam } from './app-common';
import { appContext } from './app-context';

/** Upper bound on what a client may send; the service answers a friendly 422 for anything over its own limits. */
const TEXT_GUARD = 2_000;
/** A date as typed: the service decides whether it is a real day, so the message names the problem. */
const DateText = t.String({ minLength: 1, maxLength: 10 });

const SubmitBody = t.Object(
  {
    startDate: DateText,
    endDate: DateText,
    note: t.Optional(t.Nullable(t.String({ maxLength: TEXT_GUARD }))),
  },
  { additionalProperties: false },
);

/** The answer of a leave write: `{ request }`, or the catalog's refusal. */
export function leaveAnswer<R>(
  r: LeaveWriteResult,
  status: (http: PmHttp, body: PmErrorBody) => R,
) {
  return r.ok ? { request: r.request } : fail(status, r.code, r.error ? { error: r.error } : {});
}

export const leaveMeApi = new Elysia({ prefix: '/leave' })
  .use(appContext)
  /** The caller's own leave: `{ state, request, history, requiresApproval }`. */
  .get('/me', async ({ actor }) => {
    const { today } = requestClock();
    const { requiresApproval } = await getLeaveSettings();
    return myLeave(actor.user.id, today, requiresApproval);
  })
  /** Sends a request; answers 201. Approved at once for an Admin or while the approval switch is off. */
  .post(
    '/',
    async ({ actor, body, status }) => {
      const r = await submitLeave(toPrincipal(actor), body, requestClock());
      return r.ok ? status(201, { request: r.request }) : leaveAnswer(r, status);
    },
    { body: SubmitBody },
  )
  /** Withdraws a pending request, or an approved one up to its last day. */
  .delete(
    '/:id',
    async ({ actor, params, request, status }) => {
      const r = await cancelLeave(toPrincipal(actor), params.id, requestClock());
      if (r.ok) {
        void audit({
          actor: { id: actor.user.id, email: maskEmail(actor.user.email) },
          headers: request.headers,
          action: AUDIT_ACTIONS.LEAVE_CANCEL,
          targetType: 'leave',
          targetId: r.request.id,
          summary: `Cuti dibatalkan (${r.request.days} hari)`,
          meta: { startDate: r.request.startDate, endDate: r.request.endDate },
        });
      }
      return leaveAnswer(r, status);
    },
    { params: IdParam },
  );
