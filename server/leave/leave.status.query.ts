/**
 * Leave status for the Team menu: "Cuti sampai <tgl>" and "Pengajuan cuti <rentang>". One statement
 * for any number of people. The caller passes the people it already decided the viewer may see;
 * this file decides only which leave of theirs the viewer may read:
 *
 * - An approved leave that covers `today` is shown for everyone. Back-to-back approved ranges are
 *   joined, so the person is not shown "back" a day before they are.
 * - A pending request is shown to its owner, to Project Managers and to Admin, and to no one else.
 */
import { and, asc, gte, inArray } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { db } from '../db';
import { leaveRequest } from '../db/schema';
import { diffDays } from '../metrics/dates';
import type { IsoDate } from '../metrics/types';
import type { Executor } from '../pm/tx';
import type { LeaveStatusDto } from './leave.dto';
import { canSeePendingLeave } from './leave.policy';

type Range = { startDate: IsoDate; endDate: IsoDate };

/** Last day of the unbroken approved leave that covers `today`, or null when none does. */
function onLeaveUntil(approved: readonly Range[], today: IsoDate): IsoDate | null {
  let until: IsoDate | null = null;
  for (const r of approved) {
    // Sorted by start: a range joins the chain when it starts today or earlier (the first one) or the day after the chain ends.
    const joins = until === null ? r.startDate <= today : diffDays(until, r.startDate) <= 1;
    if (!joins) {
      if (until !== null) break;
      continue;
    }
    if (r.endDate >= today && (until === null || r.endDate > until)) until = r.endDate;
  }
  return until;
}

/**
 * Status per person, keyed by user id; everyone asked about is present, `null` when there is
 * nothing the viewer may see. `today` is injected (team zone), never read from the clock here.
 */
export async function leaveStatusFor(
  userIds: readonly string[],
  viewer: Principal,
  today: IsoDate,
  exec: Executor = db,
): Promise<Map<string, LeaveStatusDto | null>> {
  const out = new Map<string, LeaveStatusDto | null>();
  const ids = [...new Set(userIds)];
  for (const id of ids) out.set(id, null);
  if (ids.length === 0) return out;
  const rows = await exec
    .select({
      userId: leaveRequest.userId,
      status: leaveRequest.status,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
    })
    .from(leaveRequest)
    .where(
      and(
        inArray(leaveRequest.userId, ids),
        inArray(leaveRequest.status, ['approved', 'pending']),
        gte(leaveRequest.endDate, today),
      ),
    )
    .orderBy(asc(leaveRequest.startDate), asc(leaveRequest.id));
  const byUser = new Map<string, typeof rows>();
  for (const r of rows) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
  for (const [id, list] of byUser) {
    const until = onLeaveUntil(
      list.filter((r) => r.status === 'approved'),
      today,
    );
    if (until !== null) {
      out.set(id, { kind: 'on_leave', until });
      continue;
    }
    const pending = list.find((r) => r.status === 'pending');
    if (pending && canSeePendingLeave(viewer, id)) {
      out.set(id, { kind: 'pending', from: pending.startDate, to: pending.endDate });
    }
  }
  return out;
}
