/** Shared gate for `/api/admin/*`: resolves the caller, requires Admin or Super-admin, exposes `actor` + `principal`. */
import { Elysia } from 'elysia';
import { canManageUsers, type Principal } from '../access/user.policy';
import { accountGateResponse } from '../account/gate';
import { type Actor, getHeldAccount, resolveActor } from '../guard';
import { normalizeRole } from '../permissions';
import { fail } from '../pm/respond';

/** The caller as the account policy sees them; `impersonating` makes every policy refuse destructive actions (Q9). */
export function toPrincipal(actor: Actor): Principal {
  return {
    id: actor.user.id,
    appRole: normalizeRole(actor.role),
    impersonating: actor.impersonatedBy !== null,
  };
}

/**
 * Narrows the nullable derive result inside a handler. The gate below already answered
 * 401/403, so reaching a handler without a caller means a hook was not inherited:
 * throwing keeps that fail-closed instead of acting as nobody.
 */
export function callerOf(ctx: { actor: Actor | null; principal: Principal | null }): {
  actor: Actor;
  principal: Principal;
} {
  if (!ctx.actor || !ctx.principal)
    throw new Error('admin route reached without an authenticated caller');
  return { actor: ctx.actor, principal: ctx.principal };
}

/**
 * Nest this plugin in every admin router so each is gated on its own, whatever
 * order a parent mounts it in; the name dedupes it, so the caller resolves once.
 * `tests/api/admin-gate.test.ts` sweeps every route (also each router standalone).
 */
export const adminContext = new Elysia({ name: 'admin-context' })
  .derive({ as: 'scoped' }, async ({ request }) => {
    const actor = await resolveActor(request);
    return { actor, principal: actor ? toPrincipal(actor) : null };
  })
  .onBeforeHandle({ as: 'scoped' }, ({ actor, principal, request, status }) => {
    if (!actor || !principal) {
      const held = getHeldAccount(request);
      const gate = held && accountGateResponse(held);
      if (gate) return status(403, gate); // pending/rejected: signed in but not approved
      return status(401, { error: 'Silakan masuk terlebih dahulu.', code: 'UNAUTHORIZED' });
    }
    const allowed = canManageUsers(principal);
    if (!allowed.ok) return fail(status, allowed.code);
  });
