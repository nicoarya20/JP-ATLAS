/**
 * Pure leave policy: who approves whom, who may see and withdraw a request, and who sees a pending
 * request in the Team menu. Logic only: no storage, no clock, no runtime globals, so the API and
 * the UI agree. No new role: it reads the account roles and the one project fact the service loads.
 *
 * Who decides (Pengaturan #9, matrix §2):
 * - Admin and Super-admin decide every request except their own.
 * - A Project Manager decides a Member's request only when they manage (Pengelola) a live project
 *   the Member also belongs to. A Member who happens to manage a project does not decide leave.
 * - A Project Manager's request is decided by an Admin alone.
 */
import { allow, type Decision, deny } from '../access/decision';
import { isPmOrAbove } from '../access/level';
import { type NotVisible, notVisible } from '../access/not-visible';
import type { Principal } from '../access/types';
import { isAdminRole, normalizeRole, ROLES, type Role } from '../permissions';
import type { LeaveStatus } from './leave.dto';

/** The person a request belongs to, as the policy needs them. */
export type LeaveApplicant = { id: string; appRole: Role };

/** The one fact about the pair that SQL knows and the policy does not: a shared project the approver manages. */
export type LeaveRelation = { managesSharedProject: boolean };

/** The slice of a request the policies read. */
export type LeaveSubject = { userId: string; status: LeaveStatus; endDate: string };

/** Denial for a request the viewer may not know exists (HTTP 404, same as a missing one). */
export type LeaveNotVisible = NotVisible<'NOT_FOUND'>;

const NOT_VISIBLE: Readonly<LeaveNotVisible> = notVisible('NOT_FOUND');

/** Whether a Member-class applicant's request is the kind a Project Manager may be asked about. */
const isMemberClass = (role: Role) => role === ROLES.MEMBER;

/** Status a new request starts in: an Admin, or any request while the approval switch is off, is approved on the spot. */
export function initialLeaveStatus(applicantRole: Role, requiresApproval: boolean): LeaveStatus {
  return isAdminRole(applicantRole) || !requiresApproval ? 'approved' : 'pending';
}

/**
 * Whether `p`'s role and project facts make them an approver for this applicant, ignoring who they
 * are (self) and whether they are impersonating. Seeing a request and deciding it both start here.
 */
function isApproverFor(p: Principal, applicant: LeaveApplicant, rel: LeaveRelation): Decision {
  if (isAdminRole(p.appRole)) return allow();
  if (!isMemberClass(normalizeRole(applicant.appRole))) return deny('NOT_ADMIN');
  if (p.appRole !== ROLES.PROJECT_MANAGER) return deny('NOT_APP_ROLE');
  return rel.managesSharedProject ? allow() : deny('NOT_MANAGER');
}

/**
 * Whether `p` may see this request: its owner, or someone who could decide it. Everybody else gets
 * the 404 a missing request gives, so a request is never confirmed to exist to a stranger.
 */
export function canViewLeave(
  p: Principal,
  applicant: LeaveApplicant,
  rel: LeaveRelation,
): Decision | LeaveNotVisible {
  if (p.id === applicant.id) return allow();
  return isApproverFor(p, applicant, rel).ok ? allow() : NOT_VISIBLE;
}

/**
 * Whether `p` may approve or reject. Impersonation is checked first (a super-admin acting as
 * someone else decides nothing, Q9), then self, then the role rules above.
 */
export function canDecideLeave(
  p: Principal,
  applicant: LeaveApplicant,
  rel: LeaveRelation,
): Decision {
  if (p.impersonating) return deny('IMPERSONATING');
  if (p.id === applicant.id) return deny('SELF_TARGET');
  return isApproverFor(p, applicant, rel);
}

/**
 * Whether `p` may withdraw: only the owner, a pending request, or an approved one up to and
 * including its last day. Rejected and canceled requests are final.
 */
export function canCancelLeave(p: Principal, request: LeaveSubject, today: string): Decision {
  if (p.id !== request.userId) return deny('NOT_OWNER');
  return canCancelLeaveOn(request, today) ? allow() : deny('WRONG_STATE');
}

/** The state half of `canCancelLeave`, for the DTO's `canCancel`: pending, or approved with its last day not yet past. */
export function canCancelLeaveOn(request: Pick<LeaveSubject, 'status' | 'endDate'>, today: string) {
  return (
    request.status === 'pending' || (request.status === 'approved' && request.endDate >= today)
  );
}

/** Whether `p` may change the "Cuti perlu persetujuan" switch: Admin and Super-admin, never while impersonating. */
export function canManageLeaveSettings(p: Principal): Decision {
  if (p.impersonating) return deny('IMPERSONATING');
  return isAdminRole(p.appRole) ? allow() : deny('NOT_ADMIN');
}

/**
 * Whether `viewer` may see that `applicantId` has a request waiting (Team "Pengajuan cuti ..."):
 * the applicant, any Project Manager and any Admin. An approved leave is not covered here: it is
 * visible to everyone who can see the person at all.
 */
export function canSeePendingLeave(viewer: Principal, applicantId: string): boolean {
  return viewer.id === applicantId || isPmOrAbove(viewer);
}
