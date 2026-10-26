/**
 * `GET /api/admin/users/:id/leave` (P14 CU-04): the period under way plus the recorded history an
 * Admin reads in the user drawer. Its own file so `admin-leave.ts` keeps the two writes; it carries
 * the same gate (`adminContext`) and the same policy as those writes, so the whole `/leave` surface
 * answers one way — including the refusal while impersonating, because the Admin-only note (P14 D6)
 * has no business being read under a borrowed identity.
 *
 * The history exists because a period that is entirely in the past never shows up in the Team badge
 * (status is computed from today), and §10 T3 lets an Admin record exactly that. It is paged, never
 * whole: `?page` / `?limit`, capped at `LEAVE_HISTORY_MAX_LIMIT`.
 */
import { Elysia, t } from 'elysia';
import { canRecordUserLeave } from '../access/user.policy';
import {
  LEAVE_HISTORY_LIMIT,
  LEAVE_HISTORY_MAX_LIMIT,
  listLeavePeriods,
  runningPeriod,
} from '../leave/leave.query';
import { leaveDays } from '../leave/leave.validate';
import { fail } from '../pm/respond';
import { requestClock } from '../task/task.clock';
import { adminContext, callerOf } from './admin-context';
import { findUserTarget } from './admin-users.query';
import { parsePaging } from './analytics-paging';

const Params = t.Object({ id: t.String() });
const HistoryQuery = t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) });

export const adminLeaveReadApi = new Elysia().use(adminContext).get(
  '/users/:id/leave',
  async (ctx) => {
    const { params, query, status } = ctx;
    const { principal } = callerOf(ctx);
    const decision = canRecordUserLeave(principal);
    if (!decision.ok) return fail(status, decision.code);
    const target = await findUserTarget(params.id);
    if (!target) return fail(status, 'NOT_FOUND', { error: 'Pengguna tidak ditemukan.' });
    const { today } = requestClock();
    const { page, limit, offset } = parsePaging(
      query,
      LEAVE_HISTORY_LIMIT,
      LEAVE_HISTORY_MAX_LIMIT,
    );
    const [running, history] = await Promise.all([
      runningPeriod(target.id, today),
      listLeavePeriods(target.id, { limit, offset }),
    ]);
    return {
      // Today travels with the answer so the screen can tell a past period from a future one
      // without reading the browser clock.
      today,
      running:
        running === null
          ? null
          : { ...running, days: leaveDays(running.startDate, running.endDate) },
      items: history.items,
      total: history.total,
      page,
      limit,
    };
  },
  { params: Params, query: HistoryQuery },
);
