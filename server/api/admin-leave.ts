/**
 * Somebody's availability under `/api/admin/users/:id/leave` (P14 CU-03): `PUT` records the period
 * or replaces the one under way, `DELETE` ends it. Admin and Super-admin only — leave is applied
 * for outside the app and only recorded here (P14 D3) — and never with an API key, whatever its
 * scopes (`PM_KEY_DENY`). Nested in `adminApi`, which carries the gate.
 *
 * Dates arrive as typed: the service decides whether they are real days, so the 422 names the
 * problem instead of answering with a schema error. A range already in the past is accepted on
 * purpose (§10 T3); what guards it is the audit entry, not a backstop on the calendar.
 */
import { Elysia, t } from 'elysia';
import { canRecordUserLeave } from '../access/user.policy';
import { AUDIT_ACTIONS, audit } from '../audit';
import { formatLeaveRange } from '../leave/leave.format';
import { clearLeavePeriod, setLeavePeriod } from '../leave/leave.service';
import { fail } from '../pm/respond';
import { requestClock } from '../task/task.clock';
import { adminContext, callerOf } from './admin-context';
import { findUserTarget } from './admin-users.query';

const Params = t.Object({ id: t.String() });
const NOT_FOUND = { error: 'Pengguna tidak ditemukan.' };
/** Upper bound on what a client may send; the service answers a friendly 422 for its own limits. */
const TEXT_GUARD = 2_000;
const DateText = t.String({ minLength: 1, maxLength: 10 });

const SetBody = t.Object(
  {
    startDate: DateText,
    endDate: DateText,
    note: t.Optional(t.Nullable(t.String({ maxLength: TEXT_GUARD }))),
  },
  { additionalProperties: false },
);

export const adminLeaveApi = new Elysia()
  .use(adminContext)
  /** Records the period, or replaces the one under way. 409 names the period that clashes. */
  .put(
    '/users/:id/leave',
    async (ctx) => {
      const { params, body, request, status } = ctx;
      const { actor, principal } = callerOf(ctx);
      const decision = canRecordUserLeave(principal);
      if (!decision.ok) return fail(status, decision.code);
      const target = await findUserTarget(params.id);
      if (!target) return fail(status, 'NOT_FOUND', NOT_FOUND);
      const { today } = requestClock();
      const result = await setLeavePeriod({
        userId: target.id,
        by: actor.user.id,
        input: body,
        today,
      });
      if (!result.ok) return fail(status, result.code, result.error ? { error: result.error } : {});
      const { period, replaced } = result;
      void audit({
        actor: actor.user,
        headers: request.headers,
        action: AUDIT_ACTIONS.LEAVE_SET,
        targetType: 'leave',
        targetId: period.id,
        // The target is named by id, and the note is left out: free text about why somebody is away
        // is Admin-only (P14 D6) and has no business in a trail a super-admin reads.
        summary: `Cuti ${formatLeaveRange(period.startDate, period.endDate)} (${period.days} hari) dicatat untuk user ${target.id}`,
        meta: {
          userId: target.id,
          startDate: period.startDate,
          endDate: period.endDate,
          days: period.days,
          hasNote: period.note !== null,
          replacedPeriodId: replaced?.id ?? null,
        },
      });
      return { ok: true, period, replaced };
    },
    { params: Params, body: SetBody },
  )
  /** Ends the leave under way; 404 when the person is not on leave today. */
  .delete(
    '/users/:id/leave',
    async (ctx) => {
      const { params, request, status } = ctx;
      const { actor, principal } = callerOf(ctx);
      const decision = canRecordUserLeave(principal);
      if (!decision.ok) return fail(status, decision.code);
      const target = await findUserTarget(params.id);
      if (!target) return fail(status, 'NOT_FOUND', NOT_FOUND);
      const { today } = requestClock();
      const result = await clearLeavePeriod({ userId: target.id, by: actor.user.id, today });
      if (!result.ok) return fail(status, result.code, result.error ? { error: result.error } : {});
      const { cleared } = result;
      void audit({
        actor: actor.user,
        headers: request.headers,
        action: AUDIT_ACTIONS.LEAVE_CLEAR,
        targetType: 'leave',
        targetId: cleared.id,
        summary: `Cuti ${formatLeaveRange(cleared.startDate, cleared.endDate)} diakhiri untuk user ${target.id}`,
        meta: {
          userId: target.id,
          startDate: cleared.startDate,
          endDate: cleared.endDate,
          days: cleared.days,
        },
      });
      return { ok: true, cleared };
    },
    { params: Params },
  );
