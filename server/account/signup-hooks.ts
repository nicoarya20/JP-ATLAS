/**
 * Better Auth `user.create` hooks (S0A-06): apply the sign-up decision of `signup-gate.ts` to every
 * new account, then finish the side effects (profile row, invitation link, audit). Must never
 * import `server/auth` (auth imports these hooks) and reaches env/invitation queries lazily.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { AUDIT_ACTIONS, audit } from '../audit';
import { db } from '../db';
import { profile, userInvitation } from '../db/schema';
import { logger } from '../logger';
import { isEmailSignUpPath } from './auth-policy';
import { decideNewUser, type NewUserData, type NewUserDeps, normalizeEmail } from './signup-gate';

/** The slice of Better Auth's endpoint context the hooks read; `null` outside an HTTP endpoint (seeds, scripts). */
export type SignupHookContext = { path?: string; request?: Request; headers?: Headers } | null;

export type NewUserRecord = { email: string; emailVerified?: boolean | null };
export type CreatedUserRecord = { id: string; email: string; role?: string | null };

export type BeforeCreateResult = false | { data: NewUserData } | undefined;

/** Loads the sign-up policy inputs on demand so this module has no top-level `env` import. */
async function loadDeps(): Promise<NewUserDeps> {
  const [env, invitations] = await Promise.all([import('../env'), import('./invitation.query')]);
  return {
    isProd: env.isProd,
    superAdminEmails: env.superAdminEmails,
    allowedDomains: env.allowedEmailDomains,
    claimInvitation: invitations.claimInvitation,
  };
}

// before→after handoff: the hook cannot return the invitation id to Better Auth, so it parks it
// here by normalized email (unique per account). Entries expire so a failed INSERT cannot leak one.
const HANDOFF_TTL_MS = 5 * 60_000;
const handoff = new Map<string, { invitationId: string; at: number }>();

function parkInvitation(emailNorm: string, invitationId: string): void {
  const now = Date.now();
  for (const [key, v] of handoff) if (now - v.at > HANDOFF_TTL_MS) handoff.delete(key);
  handoff.set(emailNorm, { invitationId, at: now });
}

function takeInvitation(emailNorm: string): string | null {
  const entry = handoff.get(emailNorm);
  handoff.delete(emailNorm);
  return entry && Date.now() - entry.at <= HANDOFF_TTL_MS ? entry.invitationId : null;
}

/**
 * `create.before`: returns `false` to refuse the account, or the approval fields to merge into the
 * INSERT. Any unexpected error yields `pending`/`member` (fail closed): access is never granted by a fault.
 */
export async function beforeCreateUser(
  user: NewUserRecord,
  ctx: SignupHookContext,
  load: () => Promise<NewUserDeps> = loadDeps,
): Promise<BeforeCreateResult> {
  try {
    const decision = await decideNewUser(
      {
        email: user.email,
        emailVerified: user.emailVerified === true,
        viaEmailSignUp: isEmailSignUpPath(ctx?.path),
      },
      await load(),
    );
    if (!decision.allow) {
      logger.info({ reason: decision.reason }, 'sign-up refused');
      return false;
    }
    if (decision.invitationId) parkInvitation(normalizeEmail(user.email), decision.invitationId);
    return { data: decision.data };
  } catch (err) {
    // Name/code only: driver errors can echo the query parameters, which include the email.
    const e = err as { name?: string; code?: string };
    logger.warn({ errName: e?.name, errCode: e?.code }, 'sign-up decision failed; held as pending');
    return { data: { approvalStatus: 'pending', role: 'member' } };
  }
}

/** Runs one best-effort follow-up step; a failure is logged with the user id only and never blocks login. */
async function softStep(userId: string, step: string, run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (err) {
    // Name/code only: driver errors echo query parameters.
    const e = err as { name?: string; code?: string };
    logger.warn({ errName: e?.name, errCode: e?.code, userId, step }, 'sign-up follow-up failed');
  }
}

/**
 * `create.after`: profile row, invitation `accepted_user_id` and the `invitation.use` audit entry.
 * Each step is independent and soft, so a failure cannot cancel the sign-in that already succeeded.
 */
export async function afterCreateUser(
  created: CreatedUserRecord,
  ctx: SignupHookContext,
): Promise<void> {
  await softStep(created.id, 'profile', () =>
    db
      .insert(profile)
      .values({ userId: created.id })
      .onConflictDoNothing({ target: profile.userId }),
  );

  const invitationId = takeInvitation(normalizeEmail(created.email));
  if (!invitationId) return;
  await softStep(created.id, 'invitation-link', () =>
    db
      .update(userInvitation)
      .set({ acceptedUserId: created.id })
      .where(and(eq(userInvitation.id, invitationId), isNull(userInvitation.acceptedUserId))),
  );
  const headers = ctx?.request?.headers ?? ctx?.headers ?? null;
  await softStep(created.id, 'audit', () =>
    audit({
      actor: { id: created.id, email: created.email },
      headers: headers ? new Headers(headers) : null,
      action: AUDIT_ACTIONS.INVITATION_USE,
      targetType: 'invitation',
      targetId: invitationId,
      meta: { role: created.role ?? null },
      summary: 'Undangan dipakai untuk masuk pertama kali',
    }),
  );
}
