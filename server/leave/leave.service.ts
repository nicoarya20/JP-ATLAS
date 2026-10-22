/**
 * Leave writes: submit, withdraw, approve, reject. Each is one transaction that checks the rules,
 * writes the row and sends or closes the Inbox cards, so every path (session, API key, later MCP)
 * behaves the same. "Today" comes in as `clock`, never from `Date`, so a day boundary is testable.
 *
 * Order of checks on an existing request, so a stranger learns nothing: 404 if the viewer could not
 * even see it (`canViewLeave`), then the action's own 403 (`SELF_TARGET`, `NOT_OWNER`, ...), then the
 * 409 state conflicts. The first approver wins: the update only matches a still-`pending` row, so the
 * second one to decide gets `ALREADY_DECIDED`.
 */
import { and, eq, sql } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { leaveRequest, user } from '../db/schema';
import {
  emitLeaveCanceled,
  emitLeaveDecided,
  emitLeaveRequested,
} from '../notification/emit.leave';
import { ROLES } from '../permissions';
import { type Executor, inTx, type Tx } from '../pm/tx';
import { getLeaveSettings } from '../settings-leave';
import { approverIdsFor } from './leave.approvers.query';
import {
  type LeaveClock,
  type LeaveRefusal,
  type LeaveWriteResult,
  refusal,
  refuse,
} from './leave.dto';
import { toLeaveDto } from './leave.mapper';
import { dueTaskCounts } from './leave.pending.query';
import {
  canCancelLeave,
  canDecideLeave,
  canViewLeave,
  initialLeaveStatus,
  type LeaveApplicant,
  type LeaveRelation,
} from './leave.policy';
import { findOverlap, loadLeave, managesSharedProject } from './leave.query';
import {
  cleanLeaveInput,
  cleanRejectReason,
  isLeaveRefusal,
  type LeaveInput,
  leaveDays,
} from './leave.validate';

/** Takes the person's lock for this transaction, so two simultaneous submits cannot both pass the overlap check. */
const lockPerson = (tx: Tx, userId: string) =>
  tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`leave:${userId}`}))`);

/** The one project fact the policy needs, asked only when the roles make it matter (a PM looking at a Member). */
async function relationFor(
  exec: Executor,
  p: Principal,
  applicant: LeaveApplicant,
): Promise<LeaveRelation> {
  const matters =
    p.appRole === ROLES.PROJECT_MANAGER &&
    applicant.appRole === ROLES.MEMBER &&
    p.id !== applicant.id;
  return {
    managesSharedProject: matters && (await managesSharedProject(p.id, applicant.id, exec)),
  };
}

/** The request as an answer, re-read so the decider's name is in it. */
async function answer(tx: Tx, id: string, today: string): Promise<LeaveWriteResult> {
  const loaded = await loadLeave(tx, id);
  return loaded ? { ok: true, request: toLeaveDto(loaded.row, today) } : refusal('NOT_FOUND');
}

/**
 * Sends a request for `p`. An Admin's request, or any request while the approval switch is off, is
 * approved on the spot (no decider); everything else waits and asks the approvers.
 */
export async function submitLeave(
  p: Principal,
  input: LeaveInput,
  clock: LeaveClock,
): Promise<LeaveWriteResult> {
  const clean = cleanLeaveInput(input, clock.today);
  if (isLeaveRefusal(clean)) return clean;
  const { requiresApproval } = await getLeaveSettings();
  const status = initialLeaveStatus(p.appRole, requiresApproval);
  return inTx(async (tx) => {
    await lockPerson(tx, p.id);
    if (await findOverlap(tx, p.id, clean.startDate, clean.endDate))
      return refusal('LEAVE_OVERLAP');
    const [row] = await tx
      .insert(leaveRequest)
      .values({
        userId: p.id,
        startDate: clean.startDate,
        endDate: clean.endDate,
        note: clean.note,
        status,
        decidedAt: status === 'approved' ? clock.now : null,
      })
      .returning({ id: leaveRequest.id });
    if (status === 'pending') {
      const [me] = await tx.select({ name: user.name }).from(user).where(eq(user.id, p.id));
      const due = await dueTaskCounts(tx, [row.id]);
      await emitLeaveRequested(tx, {
        requestId: row.id,
        requesterId: p.id,
        requesterName: me?.name ?? '',
        startDate: clean.startDate,
        endDate: clean.endDate,
        days: clean.days,
        dueTasks: due.get(row.id) ?? 0,
        approverIds: await approverIdsFor(tx, { id: p.id, role: p.appRole }),
        at: clock.now,
      });
    }
    return answer(tx, row.id, clock.today);
  });
}

/** Withdraws a pending request, or an approved one up to its last day; the days are free again from that day on. */
export async function cancelLeave(
  p: Principal,
  id: string,
  clock: LeaveClock,
): Promise<LeaveWriteResult> {
  return inTx(async (tx) => {
    const loaded = await loadLeave(tx, id);
    if (!loaded) return refusal('NOT_FOUND');
    const party = { id: loaded.row.userId, appRole: loaded.applicant.role };
    const seen = canViewLeave(p, party, await relationFor(tx, p, party));
    if (!seen.ok) return refuse(seen.code);
    const can = canCancelLeave(p, loaded.row, clock.today);
    if (!can.ok) return refuse(can.code);
    // Only the status we just read may be withdrawn: a request decided in between is refused, not overwritten.
    const done = await tx
      .update(leaveRequest)
      .set({ status: 'canceled' })
      .where(and(eq(leaveRequest.id, id), eq(leaveRequest.status, loaded.row.status)))
      .returning({ id: leaveRequest.id });
    if (done.length === 0) return refusal('WRONG_STATE');
    await emitLeaveCanceled(tx, id, clock.now);
    return answer(tx, id, clock.today);
  });
}

/**
 * Approves or rejects a pending request. `reason` only applies to a rejection and may be blank. The
 * requester is told, and the approval cards close for every other approver.
 */
export async function decideLeave(
  p: Principal,
  id: string,
  decision: 'approved' | 'rejected',
  rawReason: string | null | undefined,
  clock: LeaveClock,
): Promise<LeaveWriteResult> {
  const reason = decision === 'rejected' ? cleanRejectReason(rawReason) : null;
  if (isLeaveRefusal(reason)) return reason;
  return inTx(async (tx): Promise<LeaveWriteResult | LeaveRefusal> => {
    const loaded = await loadLeave(tx, id);
    if (!loaded) return refusal('NOT_FOUND');
    const { row, applicant } = loaded;
    const party = { id: row.userId, appRole: applicant.role };
    const rel = await relationFor(tx, p, party);
    const seen = canViewLeave(p, party, rel);
    if (!seen.ok) return refuse(seen.code);
    const can = canDecideLeave(p, party, rel);
    if (!can.ok) return refuse(can.code);
    if (row.status !== 'pending') return refusal('ALREADY_DECIDED');
    if (row.endDate < clock.today) return refusal('LEAVE_EXPIRED');
    const done = await tx
      .update(leaveRequest)
      .set({ status: decision, decidedBy: p.id, decidedAt: clock.now, rejectReason: reason })
      .where(and(eq(leaveRequest.id, id), eq(leaveRequest.status, 'pending')))
      .returning({ id: leaveRequest.id });
    // Lost the race: another approver's update landed between our read and our write.
    if (done.length === 0) return refusal('ALREADY_DECIDED');
    await emitLeaveDecided(tx, {
      requestId: id,
      requesterId: row.userId,
      requesterName: applicant.name,
      startDate: row.startDate,
      endDate: row.endDate,
      days: leaveDays(row.startDate, row.endDate),
      decision,
      by: p.id,
      reason,
      at: clock.now,
    });
    return answer(tx, id, clock.today);
  });
}
