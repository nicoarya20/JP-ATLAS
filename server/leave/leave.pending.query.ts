/**
 * The approver's work list (`GET /leave/pending`) and the due-task count a leave card carries.
 * The scope is part of the WHERE clause, not a filter on a finished answer: a request the viewer may
 * not decide never reaches the response. It is the SQL twin of `canDecideLeave`, and
 * `tests/leave/leave.policy.test.ts` asserts the two agree.
 *
 * Statements per page: the page, its total, and one grouped due-task count, whatever the page size.
 */
import {
  and,
  asc,
  count,
  eq,
  exists,
  gte,
  inArray,
  lte,
  ne,
  notInArray,
  type SQL,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Principal } from '../access/types';
import { db } from '../db';
import { leaveRequest, project, projectMember, task, user } from '../db/schema';
import { ACTIVE_STATUSES } from '../metrics/task.metrics';
import type { IsoDate } from '../metrics/types';
import { isAdminRole, ROLES } from '../permissions';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';
import type { LeavePendingDto, LeavePendingPage } from './leave.dto';
import { leaveDays } from './leave.validate';

/**
 * Unfinished, live tasks of each request's owner whose due date falls inside the request's range,
 * keyed by request id; a request with none is present with 0. One grouped statement.
 */
export async function dueTaskCounts(
  exec: Executor,
  requestIds: readonly string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (requestIds.length === 0) return out;
  for (const id of requestIds) out.set(id, 0);
  const rows = await exec
    .select({ id: leaveRequest.id, n: count(project.id) })
    .from(leaveRequest)
    .leftJoin(
      task,
      and(
        eq(task.assigneeId, leaveRequest.userId),
        isLive(task),
        inArray(task.status, [...ACTIVE_STATUSES]),
        gte(task.dueDate, leaveRequest.startDate),
        lte(task.dueDate, leaveRequest.endDate),
      ),
    )
    // Counting the project side keeps a task of a trashed project out of the number.
    .leftJoin(project, and(eq(project.id, task.projectId), isLive(project)))
    .where(inArray(leaveRequest.id, [...requestIds]))
    .groupBy(leaveRequest.id);
  for (const r of rows) out.set(r.id, Number(r.n));
  return out;
}

/** The viewer's decide scope as a predicate over `leave_request` joined to its owner; `null` = decides nothing. */
function scopeOf(viewer: Principal): SQL | null {
  if (isAdminRole(viewer.appRole)) return sql`true`;
  if (viewer.appRole !== ROLES.PROJECT_MANAGER) return null;
  const mine = alias(projectMember, 'mine');
  const theirs = alias(projectMember, 'theirs');
  // Correlated with the outer request row: the requester shares a live project with a manager role of the viewer.
  const shared = exists(
    db
      .select({ one: sql`1` })
      .from(mine)
      .innerJoin(theirs, eq(theirs.projectId, mine.projectId))
      .innerJoin(project, eq(project.id, mine.projectId))
      .where(
        and(
          eq(mine.userId, viewer.id),
          eq(mine.role, 'manager'),
          eq(theirs.userId, leaveRequest.userId),
          isLive(project),
        ),
      ),
  );
  // A Project Manager decides Members only; PM and Admin requests belong to Admin.
  return (
    and(
      notInArray(sql`coalesce(${user.role}, ${ROLES.MEMBER})`, [
        ROLES.PROJECT_MANAGER,
        ROLES.ADMIN,
        ROLES.SUPER_ADMIN,
      ]),
      shared,
    ) ?? null
  );
}

/**
 * Pending requests `viewer` may decide whose last day has not passed, soonest start first, as one
 * offset page. A viewer who decides nothing (Member) gets an empty page without a query.
 */
export async function listPendingFor(
  viewer: Principal,
  today: IsoDate,
  page: number,
  limit: number,
  exec: Executor = db,
): Promise<LeavePendingPage> {
  const scope = scopeOf(viewer);
  if (!scope) return { items: [], total: 0, page, limit };
  const where = and(
    eq(leaveRequest.status, 'pending'),
    gte(leaveRequest.endDate, today),
    ne(leaveRequest.userId, viewer.id),
    scope,
  );
  const [rows, [totalRow]] = await Promise.all([
    exec
      .select({
        id: leaveRequest.id,
        requesterId: user.id,
        requesterName: user.name,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        note: leaveRequest.note,
        createdAt: leaveRequest.createdAt,
      })
      .from(leaveRequest)
      .innerJoin(user, eq(user.id, leaveRequest.userId))
      .where(where)
      .orderBy(asc(leaveRequest.startDate), asc(leaveRequest.createdAt), asc(leaveRequest.id))
      .limit(limit)
      .offset((page - 1) * limit),
    exec
      .select({ n: count() })
      .from(leaveRequest)
      .innerJoin(user, eq(user.id, leaveRequest.userId))
      .where(where),
  ]);
  const due = await dueTaskCounts(
    exec,
    rows.map((r) => r.id),
  );
  const items: LeavePendingDto[] = rows.map((r) => ({
    id: r.id,
    requester: { id: r.requesterId, name: r.requesterName },
    startDate: r.startDate,
    endDate: r.endDate,
    days: leaveDays(r.startDate, r.endDate),
    note: r.note,
    createdAt: r.createdAt.toISOString(),
    dueTasks: due.get(r.id) ?? 0,
  }));
  return { items, total: Number(totalRow?.n ?? 0), page, limit };
}
