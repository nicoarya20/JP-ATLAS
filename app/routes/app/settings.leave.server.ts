/**
 * Server half of the Ketersediaan block on /app/settings: whether the signed-in person is on leave
 * today. It reads `leaveStatusFor` directly instead of going through an endpoint of its own, the
 * way the rest of this loader already works — nothing on the page writes leave since P14 D3.
 */
import type { Actor } from '@server/guard';
import { leaveStatusFor } from '@server/leave/leave.status.query';
import { requestClock } from '@server/task/task.clock';
import type { LeavePageData } from '~/lib/leave-api';
import { toJson } from '~/lib/loader-json';

/** Reads the leave state of the signed-in person; called from the settings loader. */
export async function loadLeavePage(actor: Actor): Promise<LeavePageData> {
  const { today } = requestClock();
  const status = await leaveStatusFor([actor.user.id], today);
  return toJson<LeavePageData>({
    onLeaveUntil: status.get(actor.user.id)?.until ?? null,
    today,
  });
}
