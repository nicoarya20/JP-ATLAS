/**
 * Sign-up decision for a brand-new account (S0A-04): allow/deny plus the approval fields to
 * write with the user row. The invitation claim is injected so this stays unit-testable and
 * never imports `server/auth` (the auth hook of S0A-06 imports this module, not the reverse).
 */

import { normalizeRole, ROLES, type Role } from '../permissions';
import type { ApprovalStatus } from '../pm/enums';
import { processLog } from '../ssr-log';
import { EMAIL_MAX_LENGTH } from './limits';

/** An invitation that was just consumed by `claimInvitation`. */
export type ClaimedInvitation = { id: string; role: Role; invitedBy: string | null };

export type NewUserInput = {
  email: string;
  emailVerified: boolean;
  /** True when the request came through the email+password sign-up endpoint (not OAuth). */
  viaEmailSignUp: boolean;
};

export type NewUserDeps = {
  isProd: boolean;
  superAdminEmails: ReadonlySet<string>;
  /** Empty = every domain is allowed (KEPUTUSAN Q2). */
  allowedDomains: ReadonlySet<string>;
  claimInvitation: (emailNorm: string) => Promise<ClaimedInvitation | null>;
};

/** Fields merged into the INSERT of the new `user` row by the Better Auth `create.before` hook. */
export type NewUserData = {
  approvalStatus: ApprovalStatus;
  role: Role;
  approvalDecidedBy?: string;
  approvalDecidedAt?: Date;
  emailVerified?: boolean;
};

export type NewUserDecision =
  | { allow: false; reason: 'DOMAIN_NOT_ALLOWED' | 'EMAIL_SIGNUP_CLOSED' }
  | { allow: true; data: NewUserData; invitationId?: string };

// Local part: printable ASCII only. PG `lower()` and JS `toLowerCase()` disagree on some Unicode
// letters, which would trip the `email = lower(btrim(email))` CHECK on user_invitation (500 instead of 422).
const ASCII_EMAIL =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

/** Trim + lower-case: the single canonical form used for invitations, domain checks and claims. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Whether an already-normalized email is plain-ASCII and well formed (used for invitations only). */
export function isInvitableEmail(emailNorm: string): boolean {
  return emailNorm.length <= EMAIL_MAX_LENGTH && ASCII_EMAIL.test(emailNorm);
}

/** Domain part of an email (text after the last `@`), lower-cased; empty string when there is none. */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at < 0
    ? ''
    : email
        .slice(at + 1)
        .trim()
        .toLowerCase();
}

/** Whether `email`'s domain passes the allow-list; an empty list allows every domain. */
export function isDomainAllowed(email: string, allowedDomains: ReadonlySet<string>): boolean {
  return allowedDomains.size === 0 || allowedDomains.has(emailDomain(email));
}

/** Parse the `ALLOWED_EMAIL_DOMAINS` CSV into a lower-cased set; a leading `@` is tolerated, blanks dropped. */
export function parseEmailDomains(raw: string | undefined): ReadonlySet<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean),
  );
}

/**
 * Decide what a new account may be. Order matters: domain gate, production email sign-up gate,
 * super-admin env, verified invitation, otherwise `pending`. Anything unexpected falls to `pending`
 * (fail closed): an Admin can still approve it, nobody gets access by accident.
 */
export async function decideNewUser(
  input: NewUserInput,
  deps: NewUserDeps,
): Promise<NewUserDecision> {
  const email = normalizeEmail(input.email);
  if (!isDomainAllowed(email, deps.allowedDomains)) {
    return { allow: false, reason: 'DOMAIN_NOT_ALLOWED' };
  }
  if (input.viaEmailSignUp && deps.isProd) {
    return { allow: false, reason: 'EMAIL_SIGNUP_CLOSED' };
  }

  // Dev-only convenience (K-2): email+password accounts cannot verify their address, so they
  // are marked verified or a dev super-admin would lose /dev. Production never reaches this.
  const devEmailSignUp = input.viaEmailSignUp && !deps.isProd;
  const verified = input.emailVerified || devEmailSignUp;
  const verifiedFlag = devEmailSignUp ? { emailVerified: true } : {};

  if (!verified) {
    // C-AUTH-8: an unverified address never auto-approves, so a stranger cannot claim an invited email.
    return { allow: true, data: { approvalStatus: 'pending', role: ROLES.MEMBER } };
  }

  if (deps.superAdminEmails.has(email)) {
    return {
      allow: true,
      data: {
        approvalStatus: 'approved',
        role: ROLES.SUPER_ADMIN,
        approvalDecidedAt: new Date(),
        ...verifiedFlag,
      },
    };
  }

  const claimed = await claimSafely(email, deps.claimInvitation);
  if (claimed) {
    // `super-admin` is env-only; the DB CHECK already forbids it, this keeps a bad row from escalating.
    const role = normalizeRole(claimed.role);
    return {
      allow: true,
      invitationId: claimed.id,
      data: {
        approvalStatus: 'approved',
        role: role === ROLES.SUPER_ADMIN ? ROLES.MEMBER : role,
        ...(claimed.invitedBy ? { approvalDecidedBy: claimed.invitedBy } : {}),
        approvalDecidedAt: new Date(),
        ...verifiedFlag,
      },
    };
  }
  return {
    allow: true,
    data: { approvalStatus: 'pending', role: ROLES.MEMBER, ...verifiedFlag },
  };
}

/** Run the claim; a database failure yields `null` (so the account is held as pending) and is logged without the email. */
async function claimSafely(
  emailNorm: string,
  claim: NewUserDeps['claimInvitation'],
): Promise<ClaimedInvitation | null> {
  try {
    return await claim(emailNorm);
  } catch (err) {
    // Only name/code are logged: driver errors can echo query parameters, which include the email.
    const e = err as { name?: string; code?: string };
    processLog(
      'warn',
      { errName: e?.name, errCode: e?.code },
      'invitation claim failed; new account held as pending',
    );
    return null;
  }
}
