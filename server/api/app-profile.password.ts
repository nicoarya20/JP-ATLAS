/**
 * `POST /api/app/profile/password`: the first email+password credential for an account that so far
 * could only sign in with Google.
 *
 * This is an escalation, not a profile edit — it creates a second, permanent way into the account —
 * so the guards below are mandatory and ordered identity first, then feature state, then input:
 * a caller who may not use this route at all learns that before anything comments on what they typed.
 * Every later change belongs to Better Auth's `changePassword`, which demands the old password.
 */
import { Elysia, t } from 'elysia';
import { emailAuthUsable } from '../account/email-auth';
import { passwordProblem, passwordProblemMessage } from '../account/password-rules';
import { hasCredentialAccount, setFirstPassword } from '../account/set-password.service';
import { AUDIT_ACTIONS, audit } from '../audit';
import { fail } from '../pm/respond';
import { appContext } from './app-context';

// `t.Unknown()`, not `t.String({ minLength: 8 })`: `api-error.ts` turns a schema mismatch into a 422
// whose `issues` quote the rejected value — and the rejected value here is the password. The handler
// checks type and length itself (`passwordProblem`) so nothing can echo it back.
const PasswordBody = t.Object({ newPassword: t.Unknown() });

export const passwordApi = new Elysia({ prefix: '/password' }).use(appContext).post(
  '/',
  async ({ actor, body, request, status }) => {
    // `PM_KEY_DENY` already refuses every API key before routing; this is the second lock, in case
    // a future mapping change hands the path a scope again. A leaked key must never mint a login.
    if (actor.viaApiKey) return fail(status, 'SESSION_ONLY');
    // A Super-admin wearing someone else's session must not leave a password behind: it would keep
    // working long after the impersonation ends, and the owner would never know it was set.
    if (actor.impersonatedBy) return fail(status, 'IMPERSONATING');
    // A credential nobody can sign in with is only extra attack surface (R12 F1 keeps production
    // on Google), so refuse while email sign-in is off and say why.
    if (!(await emailAuthUsable())) return fail(status, 'EMAIL_AUTH_DISABLED');
    const problem = passwordProblem(body.newPassword);
    if (problem) return fail(status, 'VALIDATION', { error: passwordProblemMessage(problem) });
    // Only for an account with no password yet. Otherwise this would be a way to replace a
    // password without knowing the old one — exactly what `changePassword` exists to prevent.
    if (await hasCredentialAccount(actor.user.id)) return fail(status, 'PASSWORD_ALREADY_SET');

    // `passwordProblem` returned null, so this is a string of a usable length; the cast only tells
    // the compiler what the check above already proved (`t.Unknown()` keeps the schema from echoing it).
    const result = await setFirstPassword(request.headers, body.newPassword as string);
    // Who and when, never the password and never its length: the length alone narrows a brute force.
    void audit({
      actor: { id: actor.user.id, email: actor.user.email },
      headers: request.headers,
      action: AUDIT_ACTIONS.USER_PASSWORD_SET,
      targetType: 'user',
      targetId: actor.user.id,
      summary: 'Membuat password pertama untuk akunnya sendiri',
      meta: { otherSessionsRevoked: result.otherSessionsRevoked },
    });
    return { ok: true, otherSessionsRevoked: result.otherSessionsRevoked };
  },
  { body: PasswordBody },
);
