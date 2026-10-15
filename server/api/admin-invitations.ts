/** Pre-approval invitations under `/api/admin/invitations`: list, create and revoke. Nested in adminApi. */
import { Elysia, t } from 'elysia';
import { canInviteWithRole } from '../access/user.policy';
import {
  findInvitation,
  INVITATION_STATUSES,
  type InvitationStatus,
  listInvitations,
  revokeInvitation,
} from '../account/invitation.admin.query';
import { createInvitation } from '../account/invitation.query';
import { maskEmail } from '../account/mask-email';
import { AUDIT_ACTIONS, audit } from '../audit';
import { normalizeRole, ROLES, type Role } from '../permissions';
import { fail } from '../pm/respond';
import { adminContext, callerOf } from './admin-context';

const KNOWN_ROLES: readonly string[] = Object.values(ROLES);
const CREATED = 201;

// Body fields are optional at the schema level on purpose: the gate must answer 401/403
// before validation does, and the handler then reports a missing email as INVALID_EMAIL.
const CreateBody = t.Object({ email: t.Optional(t.String()), role: t.Optional(t.String()) });
const ListQuery = t.Object({
  status: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  offset: t.Optional(t.String()),
});
const toInt = (v: string | undefined) => (v === undefined ? undefined : Number.parseInt(v, 10));

export const adminInvitationsApi = new Elysia()
  .use(adminContext)
  .get(
    '/invitations',
    ({ query, status }) => {
      const wanted = query.status as InvitationStatus | undefined;
      if (wanted && !INVITATION_STATUSES.includes(wanted))
        return fail(status, 'VALIDATION', { error: 'Status undangan tidak dikenal.' });
      const limit = toInt(query.limit);
      const offset = toInt(query.offset);
      return listInvitations({
        status: wanted,
        limit: Number.isNaN(limit) ? undefined : limit,
        offset: Number.isNaN(offset) ? undefined : offset,
      });
    },
    { query: ListQuery },
  )
  .post(
    '/invitations',
    async (ctx) => {
      const { body, request, status } = ctx;
      const { actor, principal } = callerOf(ctx);
      if (principal.impersonating) return fail(status, 'IMPERSONATING');
      const role = body.role ?? ROLES.MEMBER;
      if (!KNOWN_ROLES.includes(role))
        return fail(status, 'VALIDATION', { error: 'Peran tidak dikenal.' });
      const result = await createInvitation({
        actor: principal,
        email: body.email ?? '',
        role: role as Role,
      });
      if (!result.ok) return status(result.http, { error: result.message, code: result.code });
      const { invitation } = result;
      void audit({
        actor: { id: actor.user.id, email: maskEmail(actor.user.email) },
        headers: request.headers,
        action: AUDIT_ACTIONS.INVITATION_CREATE,
        targetType: 'invitation',
        targetId: invitation.id,
        summary: `Undangan untuk ${maskEmail(invitation.email)} dibuat sebagai ${invitation.role}`,
        meta: { role: invitation.role, expiresAt: invitation.expiresAt.toISOString() },
      });
      return status(CREATED, { invitation });
    },
    { body: CreateBody },
  )
  .delete(
    '/invitations/:id',
    async (ctx) => {
      const { params, request, status } = ctx;
      const { actor, principal } = callerOf(ctx);
      if (principal.impersonating) return fail(status, 'IMPERSONATING');
      const found = await findInvitation(params.id);
      if (!found) return fail(status, 'NOT_FOUND', { error: 'Undangan tidak ditemukan.' });
      // Revoking is held to the same role ceiling as creating: an Admin cannot cancel an admin-level invitation.
      const decision = canInviteWithRole(principal, normalizeRole(found.role));
      if (!decision.ok) return fail(status, decision.code);
      if (!(await revokeInvitation(found.id))) return fail(status, 'WRONG_STATE');
      void audit({
        actor: { id: actor.user.id, email: maskEmail(actor.user.email) },
        headers: request.headers,
        action: AUDIT_ACTIONS.INVITATION_REVOKE,
        targetType: 'invitation',
        targetId: found.id,
        summary: `Undangan untuk ${maskEmail(found.email)} dicabut`,
        meta: { role: found.role },
      });
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) },
  );
