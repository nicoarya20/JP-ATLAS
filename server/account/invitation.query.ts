/**
 * Invitation queries (S0A-04): `createInvitation` for the admin API and the atomic
 * `claimInvitation` used at first sign-in. Never imports `server/auth`; logs ids, never emails.
 */
import { and, count, eq, gt, isNull, sql } from 'drizzle-orm';
import { DENY_UI, type DenyCode } from '../access/decision';
import { canInviteWithRole, type Principal } from '../access/user.policy';
import { db } from '../db';
import { userInvitation } from '../db/schema';
import { allowedEmailDomains } from '../env';
import type { Role } from '../permissions';
import { inTx } from '../pm/tx';
import { INVITATION_MAX_ACTIVE, INVITATION_TTL_DAYS } from './limits';
import {
  type ClaimedInvitation,
  isDomainAllowed,
  isInvitableEmail,
  normalizeEmail,
} from './signup-gate';

export type InvitationErrorCode =
  | 'INVALID_EMAIL'
  | 'DOMAIN_NOT_ALLOWED'
  | 'INVITATION_EXISTS'
  | 'INVITATION_LIMIT';

type InvitationError = { http: 409 | 422; message: string };

// User-facing Indonesian, each says what to do next.
export const INVITATION_ERRORS: Record<InvitationErrorCode, InvitationError> = {
  INVALID_EMAIL: {
    http: 422,
    message: 'Alamat email tidak valid. Gunakan huruf latin tanpa spasi, contoh: nama@kantor.id.',
  },
  DOMAIN_NOT_ALLOWED: {
    http: 422,
    message:
      'Domain email ini tidak diizinkan di aplikasi ini. Gunakan email dari domain yang diizinkan.',
  },
  INVITATION_EXISTS: {
    http: 409,
    message:
      'Email ini sudah punya undangan aktif. Cabut undangan lama dulu bila ingin mengubahnya.',
  },
  INVITATION_LIMIT: {
    http: 409,
    message: 'Jumlah undangan aktif sudah mencapai batas. Cabut undangan yang tidak terpakai dulu.',
  },
};

export type CreatedInvitation = {
  id: string;
  email: string;
  role: Role;
  expiresAt: Date;
};

export type CreateInvitationResult =
  | { ok: true; invitation: CreatedInvitation }
  | { ok: false; code: InvitationErrorCode | DenyCode; http: 403 | 409 | 422; message: string };

export type CreateInvitationInput = { actor: Principal; email: string; role: Role };

/** Overridable for tests; production callers use the defaults (env domains, `INVITATION_MAX_ACTIVE`). */
export type CreateInvitationOptions = {
  allowedDomains?: ReadonlySet<string>;
  maxActive?: number;
};

// Serializes invitation creation so the active-count check cannot be raced past the limit.
const CREATE_LOCK_KEY = 'user_invitation:create';

// Live = neither used nor revoked nor expired. `now()` is evaluated by Postgres, not the app clock.
const stillLive = and(
  isNull(userInvitation.acceptedAt),
  isNull(userInvitation.revokedAt),
  gt(userInvitation.expiresAt, sql`now()`),
);

const fail = (code: InvitationErrorCode): CreateInvitationResult => ({
  ok: false,
  code,
  ...INVITATION_ERRORS[code],
});

/**
 * Create a pre-approval invitation. Checks run cheapest-first and fail with a stable code:
 * role ceiling (policy), email shape, domain, then inside one transaction the stale-row
 * cleanup, the active cap and the insert (the partial unique index decides duplicates).
 */
export async function createInvitation(
  input: CreateInvitationInput,
  options: CreateInvitationOptions = {},
): Promise<CreateInvitationResult> {
  const decision = canInviteWithRole(input.actor, input.role);
  if (!decision.ok) {
    const { http, message } = DENY_UI[decision.code];
    return { ok: false, code: decision.code, http, message };
  }

  const email = normalizeEmail(input.email);
  if (!isInvitableEmail(email)) return fail('INVALID_EMAIL');
  if (!isDomainAllowed(email, options.allowedDomains ?? allowedEmailDomains)) {
    return fail('DOMAIN_NOT_ALLOWED');
  }
  const maxActive = options.maxActive ?? INVITATION_MAX_ACTIVE;

  return inTx(async (tx): Promise<CreateInvitationResult> => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${CREATE_LOCK_KEY}))`);

    // The unique index cannot use now(), so an expired-but-unrevoked row would block this email forever.
    await tx
      .update(userInvitation)
      .set({ revokedAt: sql`now()` })
      .where(
        and(
          eq(userInvitation.email, email),
          isNull(userInvitation.acceptedAt),
          isNull(userInvitation.revokedAt),
          sql`${userInvitation.expiresAt} <= now()`,
        ),
      );

    const [active] = await tx.select({ n: count() }).from(userInvitation).where(stillLive);
    if ((active?.n ?? 0) >= maxActive) return fail('INVITATION_LIMIT');

    const [row] = await tx
      .insert(userInvitation)
      .values({
        email,
        role: input.role,
        invitedBy: input.actor.id,
        expiresAt: sql`now() + make_interval(days => ${INVITATION_TTL_DAYS})`,
      })
      // Conflict on the partial unique index = someone already holds a live invitation for this email.
      .onConflictDoNothing()
      .returning({
        id: userInvitation.id,
        email: userInvitation.email,
        role: userInvitation.role,
        expiresAt: userInvitation.expiresAt,
      });
    if (!row) return fail('INVITATION_EXISTS');
    return { ok: true, invitation: { ...row, role: row.role as Role } };
  });
}

/**
 * Consume the live invitation for `emailNorm` in one `UPDATE … RETURNING`. Postgres re-checks the
 * WHERE after a concurrent commit, so of two simultaneous callers exactly one gets a row.
 */
export async function claimInvitation(emailNorm: string): Promise<ClaimedInvitation | null> {
  const [row] = await db
    .update(userInvitation)
    .set({ acceptedAt: sql`now()` })
    .where(and(eq(userInvitation.email, emailNorm), stillLive))
    .returning({
      id: userInvitation.id,
      role: userInvitation.role,
      invitedBy: userInvitation.invitedBy,
    });
  return row ? { id: row.id, role: row.role as Role, invitedBy: row.invitedBy } : null;
}
