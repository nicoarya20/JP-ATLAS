/**
 * Fixed limits for account invitations and email handling (S0A-04). Pure: no env/db imports,
 * so both the sign-up gate and the admin API can share them.
 */

/** How long an invitation stays usable; stale ones are revoked lazily when the same email is re-invited. */
export const INVITATION_TTL_DAYS = 14;

/** Cap on live invitations so a leaked admin session cannot pre-approve an unbounded list of emails. */
export const INVITATION_MAX_ACTIVE = 100;

/** RFC 5321 path limit; also keeps the lower-cased value well inside the column and index size. */
export const EMAIL_MAX_LENGTH = 254;
