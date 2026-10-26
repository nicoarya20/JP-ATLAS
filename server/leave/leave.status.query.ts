/**
 * Leave status for the Team menu: "Cuti sampai <tgl>". One statement for any number of people.
 * The caller passes the people it already decided the viewer may see; there is nothing left for
 * this file to hide, because a leave period is a fact Admin recorded and every colleague may read
 * it (P14 D3/D6). Back-to-back periods are joined, so the person is not shown "back" a day before
 * they are. The note never leaves this file: it is Admin-only (P14 D6).
 */
import { and, asc, gte, inArray } from 'drizzle-orm';
import { db } from '../db';
import { leavePeriod } from '../db/schema';
import { diffDays } from '../metrics/dates';
import type { IsoDate } from '../metrics/types';
import type { Executor } from '../pm/tx';
import type { LeaveStatusDto } from './leave.dto';

type Range = { startDate: IsoDate; endDate: IsoDate };

/** Last day of the unbroken leave that covers `today`, or null when none does. */
function onLeaveUntil(periods: readonly Range[], today: IsoDate): IsoDate | null {
  let until: IsoDate | null = null;
  for (const r of periods) {
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
 * Status per person, keyed by user id; everyone asked about is present, `null` when they are here.
 * `today` is injected (team zone), never read from the clock here.
 */
export async function leaveStatusFor(
  userIds: readonly string[],
  today: IsoDate,
  exec: Executor = db,
): Promise<Map<string, LeaveStatusDto | null>> {
  const out = new Map<string, LeaveStatusDto | null>();
  const ids = [...new Set(userIds)];
  for (const id of ids) out.set(id, null);
  if (ids.length === 0) return out;
  const rows = await exec
    .select({
      userId: leavePeriod.userId,
      startDate: leavePeriod.startDate,
      endDate: leavePeriod.endDate,
    })
    .from(leavePeriod)
    .where(and(inArray(leavePeriod.userId, ids), gte(leavePeriod.endDate, today)))
    .orderBy(asc(leavePeriod.startDate), asc(leavePeriod.id));
  const byUser = new Map<string, Range[]>();
  for (const r of rows) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
  for (const [id, list] of byUser) {
    const until = onLeaveUntil(list, today);
    if (until !== null) out.set(id, { kind: 'on_leave', until });
  }
  return out;
}
