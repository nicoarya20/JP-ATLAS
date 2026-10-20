/**
 * Leave reads for one person and for one request: the requester's own state (`GET /leave/me`), a
 * request loaded with its owner for the write paths, the overlap check and the "does this approver
 * manage a project the applicant is in" fact the policy needs. Each function is one statement.
 */
import { and, desc, eq, getTableColumns, gte, inArray, lte, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db';
import { LEAVE_ACTIVE_STATUSES, leaveRequest, project, projectMember, user } from '../db/schema';
import type { IsoDate } from '../metrics/types';
import { normalizeRole, type Role } from '../permissions';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';
import { LEAVE_HISTORY_LIMIT, type LeaveMeDto, type LeavePerson } from './leave.dto';
import { type LeaveRowWithDecider, toLeaveDto } from './leave.mapper';

const decider = alias(user, 'decider');

/** `leave_request` columns plus the decider's id and name, for every read that returns a request. */
const withDecider = () => ({
  ...getTableColumns(leaveRequest),
  deciderId: decider.id,
  deciderName: decider.name,
});

type DeciderCols = { deciderId: string | null; deciderName: string | null };

/** Folds the two decider columns back into the `decider` person the DTO reads. */
function fold<T extends DeciderCols>(
  row: T,
): Omit<T, keyof DeciderCols> & { decider: LeavePerson | null } {
  const { deciderId, deciderName, ...rest } = row;
  return {
    ...rest,
    decider: deciderId && deciderName ? { id: deciderId, name: deciderName } : null,
  };
}

/** A request with its owner's name and account role, as the decide and cancel paths need them. */
export type LoadedLeave = { row: LeaveRowWithDecider; applicant: { name: string; role: Role } };

/** One request by id with its owner, or null; takes the executor so a write path can read inside its transaction. */
export async function loadLeave(exec: Executor, id: string): Promise<LoadedLeave | null> {
  const [found] = await exec
    .select({ ...withDecider(), applicantName: user.name, applicantRole: user.role })
    .from(leaveRequest)
    .innerJoin(user, eq(user.id, leaveRequest.userId))
    .leftJoin(decider, eq(decider.id, leaveRequest.decidedBy))
    .where(eq(leaveRequest.id, id));
  if (!found) return null;
  const { applicantName, applicantRole, ...rest } = found;
  return {
    row: fold(rest),
    applicant: { name: applicantName, role: normalizeRole(applicantRole) },
  };
}

/**
 * Whether `approverId` manages (project role Pengelola) a live project that `applicantId` also
 * belongs to. The policy's only project fact; one `EXISTS`, never a loop over projects.
 */
export async function managesSharedProject(
  approverId: string,
  applicantId: string,
  exec: Executor = db,
): Promise<boolean> {
  const mine = alias(projectMember, 'mine');
  const theirs = alias(projectMember, 'theirs');
  const [row] = await exec
    .select({ one: sql<number>`1` })
    .from(mine)
    .innerJoin(theirs, eq(theirs.projectId, mine.projectId))
    .innerJoin(project, eq(project.id, mine.projectId))
    .where(
      and(
        eq(mine.userId, approverId),
        eq(mine.role, 'manager'),
        eq(theirs.userId, applicantId),
        isLive(project),
      ),
    )
    .limit(1);
  return row !== undefined;
}

/** The id of another open request of `userId` that shares a day with `start`..`end`, or null. */
export async function findOverlap(
  exec: Executor,
  userId: string,
  start: IsoDate,
  end: IsoDate,
  exceptId?: string,
): Promise<string | null> {
  const [row] = await exec
    .select({ id: leaveRequest.id })
    .from(leaveRequest)
    .where(
      and(
        eq(leaveRequest.userId, userId),
        inArray(leaveRequest.status, [...LEAVE_ACTIVE_STATUSES]),
        lte(leaveRequest.startDate, end),
        gte(leaveRequest.endDate, start),
        exceptId ? ne(leaveRequest.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  return row?.id ?? null;
}

/**
 * The requester's own leave (`GET /leave/me`). `request` is the open one that matters now: leave
 * under way first, else the soonest upcoming one. With none open, a last request that was rejected
 * (and not followed by a newer one) shows as `rejected` so the reason stays readable until they ask again.
 */
export async function myLeave(
  userId: string,
  today: IsoDate,
  requiresApproval: boolean,
  exec: Executor = db,
): Promise<LeaveMeDto> {
  const base = () =>
    exec
      .select(withDecider())
      .from(leaveRequest)
      .leftJoin(decider, eq(decider.id, leaveRequest.decidedBy));
  const [open, recent] = await Promise.all([
    base()
      .where(
        and(
          eq(leaveRequest.userId, userId),
          inArray(leaveRequest.status, [...LEAVE_ACTIVE_STATUSES]),
          gte(leaveRequest.endDate, today),
        ),
      )
      // Under way (starts today or earlier) sorts before upcoming; then the soonest start.
      .orderBy(
        sql`(${leaveRequest.startDate} > ${today}::date)`,
        leaveRequest.startDate,
        leaveRequest.id,
      )
      .limit(1),
    base()
      .where(eq(leaveRequest.userId, userId))
      .orderBy(desc(leaveRequest.createdAt), desc(leaveRequest.id))
      .limit(LEAVE_HISTORY_LIMIT),
  ]);
  const history = recent.map((r) => toLeaveDto(fold(r), today));
  const current = open[0] ? toLeaveDto(fold(open[0]), today) : null;
  if (current) {
    return {
      state: current.status === 'approved' ? 'approved' : 'pending',
      request: current,
      history,
      requiresApproval,
    };
  }
  const last = history[0];
  if (last?.status === 'rejected')
    return { state: 'rejected', request: last, history, requiresApproval };
  return { state: 'none', request: null, history, requiresApproval };
}
