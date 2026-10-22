/**
 * Server half of the leave blocks on /app/settings: the person's own state and every right the page
 * needs (requests are decided from the Inbox card, not here). The page never compares a role; it reads these flags, which
 * come from the same policy functions the API enforces (`server/leave/leave.policy.ts`).
 */
import { isPmOrAbove } from '@server/access/level';
import type { Actor } from '@server/guard';
import { canManageLeaveSettings, initialLeaveStatus } from '@server/leave/leave.policy';
import { myLeave } from '@server/leave/leave.query';
import { isAdminRole } from '@server/permissions';
import { toPrincipal } from '@server/project/membership.query';
import { getLeaveSettings } from '@server/settings-leave';
import { requestClock } from '@server/task/task.clock';
import type { LeaveApprovers, LeavePageData } from '~/lib/leave-api';
import { toJson } from '~/lib/loader-json';

/** Who answers this person's request: nobody (Admin), an Admin (Project Manager) or a Pengelola or Admin (Member). */
function approversFor(actor: Actor): LeaveApprovers {
  if (isAdminRole(actor.role)) return 'none';
  return isPmOrAbove(toPrincipal(actor)) ? 'admin' : 'manager_or_admin';
}

/** Reads the leave state of the signed-in person with their rights; called from the settings loader. */
export async function loadLeavePage(actor: Actor): Promise<LeavePageData> {
  const principal = toPrincipal(actor);
  const { today } = requestClock();
  const { requiresApproval } = await getLeaveSettings();
  const me = await myLeave(actor.user.id, today, requiresApproval);
  return toJson<LeavePageData>({
    me,
    today,
    flags: {
      canManageSwitch: canManageLeaveSettings(principal).ok,
      autoApproves: initialLeaveStatus(actor.role, requiresApproval) === 'approved',
      approvers: approversFor(actor),
    },
  });
}
