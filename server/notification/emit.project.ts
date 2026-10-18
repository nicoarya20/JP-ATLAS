/**
 * The Inbox cards the Proyek module sends (S3 I07, P5 §5.5 rows 7-9). Like the task hooks, each one
 * is called by the service that made the change, inside its own `tx`, so a card follows the write
 * whatever drove it — a session, an API key or, later, an MCP tool (P5 §5.3 butir 4).
 *
 * Three different endings, on purpose. Being added to a project or given another role is news, so
 * it is a card. Being taken off a project is not news at all: the cards go, because a former member
 * must not keep reading the project's titles in their Inbox (R12 C-INB-1). A project moved to the
 * Trash leaves the cards where they are and only closes the open "Perlu Anda tanggapi" ones — they
 * asked for work that cannot happen any more — which is why restoring the project brings nothing
 * back: a resolved card is never reopened.
 *
 * Nothing here throws: `notify()` swallows its own failures in a savepoint, and the two writes it
 * does not go through are single statements on rows the caller already holds a lock over.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { notification, project } from '../db/schema';
import type { ProjectMemberRole } from '../pm/enums';
import type { Executor } from '../pm/tx';
import { notify } from './notification.notify';
import { dropForUserInProject } from './notification.resolve';
import type { ProjectCardPayload } from './notification.types';

/** What every project hook carries: who acted and when, so a test can pin the bundle window. */
export type ProjectEmit = {
  /** Who made the change; `notify()` keeps them out of their own Inbox. */
  by: string;
  /** Event time; defaults to now. Services pass their request clock. */
  at?: Date;
};

/** One membership change: the person it is about and the role they hold after it. */
export type MemberEmit = ProjectEmit & { userId: string; role: ProjectMemberRole };

const projectRef = (id: string) => ({ type: 'project', id }) as const;

/** The project name the card shows, read once; a project that is already gone sends nothing. */
async function nameOf(exec: Executor, projectId: string): Promise<string | null> {
  const [row] = await exec
    .select({ name: project.name })
    .from(project)
    .where(eq(project.id, projectId));
  return row?.name ?? null;
}

/**
 * The one card both membership hooks write. No `sub`: `member.service.ts` cannot hand over the
 * `project_activity` row id without `logActivity` returning it, and that file belongs to S1, so
 * the card falls back to the documented default for the `info` lane and bundles per hour. Two
 * role changes inside one hour are then one line, which is what the Kabar terbaru tab wants anyway.
 */
function memberCard(
  exec: Executor,
  projectId: string,
  i: MemberEmit,
  kind: 'project_member_added' | 'project_role_changed',
  payload: ProjectCardPayload,
) {
  return notify(exec, {
    kind,
    recipients: [i.userId],
    actorId: i.by,
    projectId,
    ref: projectRef(projectId),
    payload,
    at: i.at,
  });
}

/** Someone was put on the project: they are told which project, and with which role. */
export async function emitProjectMemberAdded(
  exec: Executor,
  projectId: string,
  i: MemberEmit,
): Promise<void> {
  const projectName = await nameOf(exec, projectId);
  if (projectName === null) return;
  await memberCard(exec, projectId, i, 'project_member_added', { projectName, role: i.role });
}

/** A member's role on the project changed; the card names the project, never the role code. */
export async function emitProjectRoleChanged(
  exec: Executor,
  projectId: string,
  i: MemberEmit,
): Promise<void> {
  const projectName = await nameOf(exec, projectId);
  if (projectName === null) return;
  await memberCard(exec, projectId, i, 'project_role_changed', { projectName, role: i.role });
}

/**
 * Someone was taken off the project: every card they hold for it is deleted, open or not, because
 * a card carries the project's titles and they may no longer read those. Nobody is told — losing
 * access is handled by the project page, not by a line in the Inbox.
 */
export async function emitProjectMemberRemoved(
  exec: Executor,
  projectId: string,
  userId: string,
): Promise<void> {
  await dropForUserInProject(exec, userId, projectId);
}

/**
 * The project moved to the Trash: every open `action` card that belongs to it is closed as
 * `target_closed`, so the bell count drops in the same transaction that trashed the project.
 * The cards are not deleted — the members keep their access until the project is purged (S6), and
 * `restoreProject` deliberately has no counterpart here: a resolved card stays resolved.
 *
 * One statement, by `project_id`, not by ref: the cards being closed point at the project's tasks,
 * each with its own `ref_id`, so the project is the only thing they have in common.
 */
export async function emitProjectTrashed(
  exec: Executor,
  projectId: string,
  i: ProjectEmit,
): Promise<number> {
  const at = i.at ?? new Date();
  const rows = await exec
    .update(notification)
    .set({ resolvedAt: at, resolvedReason: 'target_closed', updatedAt: at })
    .where(
      and(
        eq(notification.projectId, projectId),
        eq(notification.lane, 'action'),
        isNull(notification.resolvedAt),
      ),
    )
    .returning({ id: notification.id });
  return rows.length;
}
