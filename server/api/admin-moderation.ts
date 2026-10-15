/** Account moderation under `/api/admin/users/:id`: suspend (ban), lift a suspension, approve and reject. Nested in adminApi. */
import { Elysia, t } from 'elysia';
import { canActOnUser } from '../access/user.policy';
import { approveUser, rejectUser } from '../account/approval.service';
import { AUDIT_ACTIONS, audit } from '../audit';
import { auth } from '../auth';
import { ROLES, type Role } from '../permissions';
import { fail } from '../pm/respond';
import { adminContext, callerOf } from './admin-context';
import { findUserTarget } from './admin-users.query';
import { revokeUserSessions } from './sessions.query';

const SECONDS_PER_DAY = 86_400;
const Params = t.Object({ id: t.String() });
const NOT_FOUND = { error: 'Pengguna tidak ditemukan.' };
const KNOWN_ROLES: readonly string[] = Object.values(ROLES);

export const adminModerationApi = new Elysia()
  .use(adminContext)
  .post(
    '/users/:id/ban',
    async (ctx) => {
      const { params, body, request, status } = ctx;
      const { actor, principal } = callerOf(ctx);
      const target = await findUserTarget(params.id);
      if (!target) return fail(status, 'NOT_FOUND', NOT_FOUND);
      const decision = canActOnUser(principal, target);
      if (!decision.ok) return fail(status, decision.code);
      // Better Auth still checks the actor's `user:['ban']` permission (Admin keeps it).
      await auth.api.banUser({
        headers: request.headers,
        body: { userId: target.id, banReason: body.reason, banExpiresIn: body.expiresIn },
      });
      // Better Auth only blocks new sign-ins; end every live session so the ban is immediate.
      const revoked = await revokeUserSessions(target.id);
      const duration = body.expiresIn
        ? `selama ${Math.round(body.expiresIn / SECONDS_PER_DAY)} hari`
        : 'permanen';
      void audit({
        actor: actor.user,
        headers: request.headers,
        action: AUDIT_ACTIONS.USER_BAN,
        targetType: 'user',
        targetId: target.id,
        summary: `User diblokir ${duration}${body.reason ? `: ${body.reason}` : ''}; ${revoked} sesi dicabut`,
        meta: {
          reason: body.reason ?? null,
          expiresIn: body.expiresIn ?? null,
          revokedSessions: revoked,
        },
      });
      return { ok: true, revokedSessions: revoked };
    },
    {
      params: Params,
      body: t.Object({
        reason: t.Optional(t.String()),
        expiresIn: t.Optional(t.Number({ minimum: 1 })),
      }),
    },
  )
  .post(
    '/users/:id/unban',
    async (ctx) => {
      const { params, request, status } = ctx;
      const { actor, principal } = callerOf(ctx);
      const target = await findUserTarget(params.id);
      if (!target) return fail(status, 'NOT_FOUND', NOT_FOUND);
      const decision = canActOnUser(principal, target);
      if (!decision.ok) return fail(status, decision.code);
      await auth.api.unbanUser({ headers: request.headers, body: { userId: target.id } });
      void audit({
        actor: actor.user,
        headers: request.headers,
        action: AUDIT_ACTIONS.USER_UNBAN,
        targetType: 'user',
        targetId: target.id,
        summary: 'Ban user dibuka',
      });
      return { ok: true };
    },
    { params: Params },
  )
  .post(
    '/users/:id/approve',
    async (ctx) => {
      const { params, body, request, status } = ctx;
      const { actor, principal } = callerOf(ctx);
      if (body.role !== undefined && !KNOWN_ROLES.includes(body.role))
        return fail(status, 'VALIDATION', { error: 'Peran tidak dikenal.' });
      const result = await approveUser({
        actor: principal,
        actorEmail: actor.user.email,
        targetId: params.id,
        role: body.role as Role | undefined,
        headers: request.headers,
      });
      if (!result.ok)
        return fail(status, result.code, result.code === 'NOT_FOUND' ? NOT_FOUND : {});
      return { ok: true, user: result.user };
    },
    { params: Params, body: t.Object({ role: t.Optional(t.String()) }) },
  )
  .post(
    '/users/:id/reject',
    async (ctx) => {
      const { params, body, request, status } = ctx;
      const { actor, principal } = callerOf(ctx);
      const result = await rejectUser({
        actor: principal,
        actorEmail: actor.user.email,
        targetId: params.id,
        reason: body.reason,
        headers: request.headers,
      });
      if (!result.ok)
        return fail(status, result.code, result.code === 'NOT_FOUND' ? NOT_FOUND : {});
      return { ok: true, user: result.user };
    },
    { params: Params, body: t.Object({ reason: t.Optional(t.String()) }) },
  );
