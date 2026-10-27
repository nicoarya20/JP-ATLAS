/**
 * Ganti Pengelola from the Admin console (P11 AD-13): `PUT /api/admin/projects/:id/manager` makes
 * `userId` the project's lead. Session only — denied to every API key in `PM_KEY_DENY` — because it
 * changes who runs a project (an escalation). Authority is the admin policy, not project membership:
 * impersonation is refused (Q9), and an Admin may not displace a lead who is themselves an
 * admin/super-admin (`canActOnTarget`). The replaced lead keeps their manager seat, only the lead
 * status moves. Audited as `PROJECT_MANAGER_SET`.
 */
import { and, eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import type { Principal } from '../access/types';
import { AUDIT_ACTIONS, audit } from '../audit';
import { project, projectMember, user } from '../db/schema';
import { canActOnTarget } from '../permissions';
import { fail } from '../pm/respond';
import { inTx, type Tx } from '../pm/tx';
import { lockProject, logActivity, type WriteResult } from '../project/project.service';
import { IdParam } from './app-common';
import { adminContext, callerOf } from './admin-context';

const Body = t.Object({ userId: t.String({ minLength: 1 }) }, { additionalProperties: false });

/** The current manager role of `userId` on the project, or null when they are not a member. */
async function managerRoleOf(tx: Tx, projectId: string, userId: string) {
  const [m] = await tx
    .select({ role: projectMember.role })
    .from(projectMember)
    .where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, userId)));
  return m?.role ?? null;
}

/**
 * Makes `userId` the lead of `projectId`, acting with the Admin's authority (not a project role).
 * Returns the old and new lead ids for the audit entry.
 */
export async function setProjectManagerByAdmin(
  admin: Principal,
  projectId: string,
  userId: string,
): Promise<WriteResult<{ id: string; from: string | null; to: string }>> {
  // Destructive-ish and identity-changing: never while impersonating, whatever the role (Q9).
  if (admin.impersonating) return { ok: false, code: 'IMPERSONATING' };
  return inTx(async (tx) => {
    const row = await lockProject(tx, projectId);
    if (!row) return { ok: false, code: 'NOT_FOUND' };
    if (row.deletedAt) return { ok: false, code: 'PROJECT_IN_TRASH' };

    // The person who loses the lead status is the one `canActOnTarget` protects: an Admin may not
    // displace a lead who is an admin/super-admin (admins are peers). Super-admin may act on anyone.
    if (row.leadId) {
      const [oldLead] = await tx
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, row.leadId));
      if (!canActOnTarget(admin.appRole, oldLead?.role)) return { ok: false, code: 'TARGET_PROTECTED' };
    }

    const [target] = await tx.select({ id: user.id }).from(user).where(eq(user.id, userId));
    if (!target) return { ok: false, code: 'NOT_FOUND' };
    if (row.leadId === userId) return { ok: true, value: { id: row.id, from: row.leadId, to: userId } };

    // The new Pengelola must already be a manager-member of this project — the same rule as the
    // product's own lead handover (`canSetLead`), kept deliberately (user decision, AD-13 option A):
    // the Admin menu never promotes anyone, so a project with no other manager simply has no
    // candidate (AD-17 covers the sole-manager case, not this route). Enforced here too, not only in
    // the picker, so a stale picker cannot smuggle in a non-manager.
    const role = await managerRoleOf(tx, projectId, userId);
    if (role !== 'manager') return { ok: false, code: role ? 'LEAD_MUST_BE_MANAGER' : 'NOT_MEMBER' };

    await tx.update(project).set({ leadId: userId }).where(eq(project.id, row.id));
    await logActivity(tx, admin, row.id, 'lead_changed', { from: row.leadId, to: userId });
    return { ok: true, value: { id: row.id, from: row.leadId, to: userId } };
  });
}

export const adminProjectsManagerApi = new Elysia()
  .use(adminContext)
  /** Hand the project to another Pengelola; `{ ok: true }` on success, uniform error body otherwise. */
  .put(
    '/:id/manager',
    async (ctx) => {
      const { params, body, request, status } = ctx;
      const { actor, principal } = callerOf(ctx);
      const result = await setProjectManagerByAdmin(principal, params.id, body.userId);
      if (!result.ok) return fail(status, result.code);
      void audit({
        actor: actor.user,
        headers: request.headers,
        action: AUDIT_ACTIONS.PROJECT_MANAGER_SET,
        targetType: 'project',
        targetId: result.value.id,
        summary: 'Pengelola proyek diubah',
        meta: { from: result.value.from, to: result.value.to },
      });
      return { ok: true };
    },
    { params: IdParam, body: Body },
  );
