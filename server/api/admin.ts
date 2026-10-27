/**
 * Admin console API (`/api/admin/*`): user directory, role changes and deletion.
 * Authority comes from `access/user.policy` (via `admin-context`), not from
 * Better Auth's admin endpoints; moderation lives in `admin-moderation` and
 * recording somebody's leave in `admin-leave`.
 */
import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { canActOnUser, canSetUserRole } from '../access/user.policy';
import { AUDIT_ACTIONS, audit } from '../audit';
import { auth } from '../auth';
import { db } from '../db';
import { user as userTable } from '../db/schema';
import { ROLES, type Role } from '../permissions';
import { fail } from '../pm/respond';
import { adminActivityApi } from './admin-activity';
import { adminContext, callerOf } from './admin-context';
import { adminExportApi } from './admin-export';
import { adminInvitationsApi } from './admin-invitations';
import { adminLeaveApi } from './admin-leave';
import { adminModerationApi } from './admin-moderation';
import { adminOverviewApi } from './admin-overview';
import { adminPermissionsApi } from './admin-permissions';
import { adminProjectsApi } from './admin-projects';
import { adminUserStats, findUserTarget, listAdminUsers, UserListQuery } from './admin-users.query';

const Params = t.Object({ id: t.String() });
const NOT_FOUND = { error: 'Pengguna tidak ditemukan.' };
const KNOWN_ROLES: readonly string[] = Object.values(ROLES);

export const adminApi = new Elysia({ prefix: '/admin' })
  .use(adminContext)
  .use(adminOverviewApi)
  .use(adminActivityApi)
  .use(adminModerationApi)
  .use(adminLeaveApi)
  .use(adminExportApi)
  .use(adminInvitationsApi)
  .use(adminPermissionsApi)
  .use(adminProjectsApi)
  .get('/users', ({ query }) => listAdminUsers(query), { query: UserListQuery })
  .get('/users/stats', () => adminUserStats())
  .post(
    '/users/:id/role',
    async (ctx) => {
      const { params, body, request, status } = ctx;
      const { actor, principal } = callerOf(ctx);
      if (!KNOWN_ROLES.includes(body.role))
        return fail(status, 'VALIDATION', { error: 'Peran tidak dikenal.' });
      const next = body.role as Role;
      const target = await findUserTarget(params.id);
      if (!target) return fail(status, 'NOT_FOUND', NOT_FOUND);
      const decision = canSetUserRole(principal, target, next);
      if (!decision.ok) return fail(status, decision.code);
      // Written straight to the DB (not auth.api.setRole): the policy above is the
      // authority, so Better Auth's admin permissions need not be widened for Admins.
      await db
        .update(userTable)
        .set({ role: next, updatedAt: new Date() })
        .where(eq(userTable.id, target.id));
      void audit({
        actor: actor.user,
        headers: request.headers,
        action: AUDIT_ACTIONS.USER_ROLE_SET,
        targetType: 'user',
        targetId: target.id,
        summary: `Role user diubah dari ${target.appRole} ke ${next}`,
        meta: { from: target.appRole, to: next },
      });
      return { ok: true };
    },
    { params: Params, body: t.Object({ role: t.String() }) },
  )
  .delete(
    '/users/:id',
    async (ctx) => {
      const { params, request, status } = ctx;
      const { actor, principal } = callerOf(ctx);
      const target = await findUserTarget(params.id);
      if (!target) return fail(status, 'NOT_FOUND', NOT_FOUND);
      // Policy first so impersonation / self / protected targets keep their specific codes.
      const decision = canActOnUser(principal, target);
      if (!decision.ok) return fail(status, decision.code);
      if (principal.appRole !== ROLES.SUPER_ADMIN)
        return fail(status, 'NOT_APP_ROLE', {
          error: 'Hanya super-admin yang bisa menghapus pengguna.',
        });
      await auth.api.removeUser({ headers: request.headers, body: { userId: target.id } });
      void audit({
        actor: actor.user,
        headers: request.headers,
        action: AUDIT_ACTIONS.USER_DELETE,
        targetType: 'user',
        targetId: target.id,
        summary: 'User dihapus permanen',
        meta: { role: target.appRole },
      });
      return { ok: true };
    },
    { params: Params },
  );

export type AdminApi = typeof adminApi;
