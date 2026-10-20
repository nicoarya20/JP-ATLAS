/**
 * Who is asked to decide a leave request: every active Admin and Super-admin, plus, for a Member's
 * request, the Project Managers who manage a live project the Member belongs to. The SQL twin of
 * `canDecideLeave` for the notification fan-out; `tests/leave/leave.policy.test.ts` keeps them equal.
 */
import { and, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { project, projectMember, user } from '../db/schema';
import { admins } from '../notification/notification.recipients';
import { ROLES, type Role } from '../permissions';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';

/** Project Managers who manage a live project that `applicantId` is a member of. */
export async function sharedProjectManagers(
  exec: Executor,
  applicantId: string,
): Promise<string[]> {
  const theirs = alias(projectMember, 'theirs');
  const rows = await exec
    .selectDistinct({ id: user.id })
    .from(projectMember)
    .innerJoin(theirs, eq(theirs.projectId, projectMember.projectId))
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .innerJoin(user, eq(user.id, projectMember.userId))
    .where(
      and(
        eq(theirs.userId, applicantId),
        eq(projectMember.role, 'manager'),
        eq(user.role, ROLES.PROJECT_MANAGER),
        isLive(project),
      ),
    )
    .orderBy(user.id);
  return rows.map((r) => r.id);
}

/** Candidate approvers of a request by `applicantId`; `notify()` still drops inactive accounts and the actor. */
export async function approverIdsFor(
  exec: Executor,
  applicant: { id: string; role: Role },
): Promise<string[]> {
  const adminIds = await admins(exec);
  const memberClass = applicant.role === ROLES.MEMBER;
  const managers = memberClass ? await sharedProjectManagers(exec, applicant.id) : [];
  return [...new Set([...adminIds, ...managers])].filter((id) => id !== applicant.id);
}
