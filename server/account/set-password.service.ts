/**
 * The first email+password credential for an account that so far could only sign in through a
 * social provider. Better Auth keeps `setPassword` server-only on purpose — it is the one call that
 * creates a login without proving an old one — so this module is the only wrapper, and every caller
 * goes through the guards in `server/api/app-profile.password.ts` first.
 */
import { and, eq } from 'drizzle-orm';
import { auth } from '../auth';
import { db } from '../db';
import { account } from '../db/schema';
import { logger } from '../logger';

/** Better Auth's provider id for an email+password login; a social login uses `google` and friends. */
const CREDENTIAL_PROVIDER = 'credential';

/** True when the account already signs in with email+password, which is `changePassword`'s business. */
export async function hasCredentialAccount(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, CREDENTIAL_PROVIDER)))
    .limit(1);
  return Boolean(row);
}

export type SetPasswordResult = { otherSessionsRevoked: boolean };

/**
 * Links a `credential` account to the signed-in caller, then signs their other devices out.
 *
 * Signing the others out is not a checkbox here, unlike `changePassword`: until this moment nobody
 * could reach the account with email+password, so no live session was ever authenticated against
 * this secret. A session the owner no longer recognises — a borrowed laptop, a shared browser —
 * must not outlive the moment a second, permanent way in starts to exist.
 *
 * `headers` are the caller's own request headers rather than an `Actor`: `setPassword` and
 * `revokeOtherSessions` re-read the session from the cookie themselves (both are server-only and
 * sit behind Better Auth's sensitive-session middleware), so there is nothing else to hand them.
 * `newPassword` is passed straight through and is never logged, serialised or returned.
 */
export async function setFirstPassword(
  headers: Headers,
  newPassword: string,
): Promise<SetPasswordResult> {
  await auth.api.setPassword({ body: { newPassword }, headers });
  try {
    await auth.api.revokeOtherSessions({ headers });
    return { otherSessionsRevoked: true };
  } catch (err) {
    // The credential exists by now, so failing the request would be a lie. Report what happened and
    // let the card point the owner at "Perangkat", where they can sign the others out by hand.
    // `err` comes from a call that never saw the password, so it is safe to log.
    logger.warn({ err }, 'failed to revoke other sessions after setting a first password');
    return { otherSessionsRevoked: false };
  }
}
