/**
 * Who gets an Inbox card (S3 I02, P5 §5.2/§5.3 butir 3). Three reads, one query each:
 * `followersOf` (the implicit followers of a task), `admins` (the Admin queue) and
 * `filterRecipients`, which is the gate `notify()` puts every candidate list through.
 *
 * The gate drops the actor (nobody is told about their own action), accounts that cannot sign in
 * (pending, rejected or actively banned), people who no longer have access to the project, and —
 * for the `info` lane only — anyone who switched "Kabar terbaru" off. An Admin keeps access to
 * every project without a membership row (`server/access/level.ts` K6), so they always pass.
 */
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { union } from 'drizzle-orm/pg-core';
import { notificationPref, projectMember, task, taskComment, user } from '../db/schema';
import { isAdminRole, ROLES } from '../permissions';
import type { Executor } from '../pm/tx';
import type { NotificationLane } from './notification.types';

/**
 * Same rule as `isBanActive` (server/ban.ts), evaluated by the DB and worded exactly as in
 * `server/project/membership.query.ts`: `ban_expires` is a plain `timestamp` while the session zone
 * is UTC (X1 D7), so `now()` is shifted before comparing, and an expired ban does not hold.
 */
const accountActive = sql<boolean>`(
  ${user.approvalStatus} = 'approved'
  AND NOT (
    coalesce(${user.banned}, false)
    AND (${user.banExpires} IS NULL OR ${user.banExpires} > (now() AT TIME ZONE 'UTC'))
  )
)`;

/** Unique, non-null ids in input order. */
const idsOf = (values: ReadonlyArray<string | null>): string[] => [
  ...new Set(values.filter((value): value is string => value !== null && value !== '')),
];

/**
 * The implicit followers of a task (R07 §3.4, no manual Follow button): whoever created it, is
 * meant to work on it, is to review it, or has written a live comment on it. One UNION query, so
 * the list costs the same whether the task has one comment or a hundred; duplicates are collapsed.
 */
export async function followersOf(exec: Executor, taskId: string): Promise<string[]> {
  const onTask = eq(task.id, taskId);
  const rows = await union(
    exec.select({ id: task.createdBy }).from(task).where(onTask),
    exec.select({ id: task.assigneeId }).from(task).where(onTask),
    exec.select({ id: task.reviewerId }).from(task).where(onTask),
    exec
      .select({ id: taskComment.authorId })
      .from(taskComment)
      .where(and(eq(taskComment.taskId, taskId), isNull(taskComment.deletedAt))),
  );
  return idsOf(rows.map((row) => row.id));
}

/**
 * Every Admin and Super-admin who can act on the Admin queue (approved, not banned). Same source as
 * `loadReviewerPool`: the stored `user.role`, which `resolveUserRole` may later demote for a
 * super-admin outside SUPER_ADMIN_EMAILS — a card that reaches them is still only a link.
 */
export async function admins(exec: Executor): Promise<string[]> {
  const rows = await exec
    .select({ id: user.id })
    .from(user)
    .where(and(inArray(user.role, [ROLES.ADMIN, ROLES.SUPER_ADMIN]), accountActive))
    // Stable output order so callers and tests do not depend on heap order.
    .orderBy(user.id);
  return rows.map((row) => row.id);
}

export type FilterRecipientsInput = {
  /** Candidate recipients; duplicates are allowed and collapsed. */
  ids: readonly string[];
  /** Who caused the event; they never receive their own card. */
  actorId?: string | null;
  /** The project the card belongs to, or null for an account card that no project gates. */
  projectId?: string | null;
  /** `info` cards obey the "Kabar terbaru" preference; `action` cards are work and cannot be hidden. */
  lane: NotificationLane;
};

/**
 * The recipients of `ids` that may actually be told, in one query (P5 §5.3: `notify()` filters,
 * never its caller). Account status, project access and — for `info` — the news preference are
 * resolved by the same statement: two LEFT JOINs the planner only has to look at for the handful
 * of candidate ids. Order follows the input, so a bundle of cards is written predictably.
 */
export async function filterRecipients(
  exec: Executor,
  input: FilterRecipientsInput,
): Promise<string[]> {
  const candidates = idsOf(input.ids).filter((id) => id !== input.actorId);
  // `IN ()` is invalid SQL and an empty candidate list needs no round trip.
  if (candidates.length === 0) return [];

  const { projectId, lane } = input;
  // A null `projectId` means no project gates the card, so the membership row is never looked at.
  const memberOn = projectId
    ? and(eq(projectMember.userId, user.id), eq(projectMember.projectId, projectId))
    : sql`false`;
  // Only the `info` lane reads a preference; `action` cards ignore the table completely.
  const prefOn =
    lane === 'info'
      ? and(eq(notificationPref.userId, user.id), eq(notificationPref.category, 'news'))
      : sql`false`;

  const rows = await exec
    .select({
      id: user.id,
      appRole: user.role,
      memberRole: projectMember.role,
      newsInApp: notificationPref.inApp,
    })
    .from(user)
    .leftJoin(projectMember, memberOn)
    .leftJoin(notificationPref, prefOn)
    .where(and(inArray(user.id, candidates), accountActive));

  const allowed = new Set(
    rows
      .filter(
        (row) =>
          projectId === null ||
          projectId === undefined ||
          row.memberRole !== null ||
          isAdminRole(row.appRole),
      )
      // A missing preference row means the category is on, so only an explicit `false` silences it.
      .filter((row) => row.newsInApp !== false)
      .map((row) => row.id),
  );
  return candidates.filter((id) => allowed.has(id));
}
