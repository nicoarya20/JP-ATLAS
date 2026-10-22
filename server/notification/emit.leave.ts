/**
 * The Inbox cards the Cuti module sends. Like the other emit helpers, each is called by the service
 * that made the change, inside its own `tx`, so a card follows the write whatever drove it.
 *
 * `leave_requested` is the one card with two buttons ("Setujui" / "Tolak"). It goes to every approver
 * of the request (the Admins, and the Project Managers who manage a project the requester is in) and
 * has no project, because the approver gate is the role rule, not membership of one project.
 * It is closed for all of them the moment one decides or the requester withdraws, so nobody queues
 * for work that is already done. `leave_decided` is news for the requester only.
 *
 * Nothing here throws: `notify()` swallows its own failures in a savepoint.
 */
import type { Executor } from '../pm/tx';
import { notify } from './notification.notify';
import { resolveNotifications } from './notification.resolve';
import type { LeaveCardPayload } from './notification.types';

const leaveRef = (id: string) => ({ type: 'leave', id }) as const;

/** The leave request a card describes: enough to render it without reading the request again. */
export type LeaveCardFacts = {
  requestId: string;
  requesterId: string;
  requesterName: string;
  startDate: string;
  endDate: string;
  days: number;
  at?: Date;
};

export type LeaveRequestedEmit = LeaveCardFacts & {
  /** Candidate approvers; `notify()` drops the requester and accounts that cannot sign in. */
  approverIds: readonly string[];
  dueTasks: number;
};

export type LeaveDecidedEmit = LeaveCardFacts & {
  decision: 'approved' | 'rejected';
  /** Who decided; they see their card closed as `acted`, the other approvers as `elsewhere`. */
  by: string;
  reason?: string | null;
};

const payloadOf = (i: LeaveCardFacts): LeaveCardPayload => ({
  name: i.requesterName,
  startDate: i.startDate,
  endDate: i.endDate,
  days: i.days,
});

/** A request is waiting: every approver gets one card; the requester is the actor, so it carries their face. */
export async function emitLeaveRequested(exec: Executor, i: LeaveRequestedEmit): Promise<void> {
  await notify(exec, {
    kind: 'leave_requested',
    recipients: i.approverIds,
    actorId: i.requesterId,
    projectId: null,
    ref: leaveRef(i.requestId),
    payload: { ...payloadOf(i), dueTasks: i.dueTasks },
    at: i.at,
  });
}

/**
 * The request was approved or rejected: the requester is told, and the approval cards close for
 * everyone who held one. Idempotent, so a second call closes nothing and tells nobody twice.
 */
export async function emitLeaveDecided(exec: Executor, i: LeaveDecidedEmit): Promise<void> {
  const close = { ref: leaveRef(i.requestId), kinds: ['leave_requested'] as const, at: i.at };
  await resolveNotifications(exec, { ...close, recipientId: i.by, reason: 'acted' });
  await resolveNotifications(exec, { ...close, reason: 'elsewhere' });
  await notify(exec, {
    kind: 'leave_decided',
    recipients: [i.requesterId],
    actorId: i.by,
    projectId: null,
    ref: leaveRef(i.requestId),
    // One decision per request, so no hour bundling: a fixed `sub` keeps it a single card.
    sub: 'decided',
    payload: {
      ...payloadOf(i),
      decision: i.decision,
      ...(i.reason ? { excerpt: i.reason } : {}),
    },
    at: i.at,
  });
}

/** The requester withdrew the request: the approval cards are no longer work, so they close. */
export async function emitLeaveCanceled(
  exec: Executor,
  requestId: string,
  at?: Date,
): Promise<void> {
  await resolveNotifications(exec, {
    ref: leaveRef(requestId),
    kinds: ['leave_requested'],
    reason: 'target_closed',
    at,
  });
}
