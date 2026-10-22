/**
 * Account profile tables (profile, user_invitation). Owner: S0.a (migration 0014).
 * `timestamptz` and the `text_size` CHECK are written inline here; S0.b moves them to
 * `schema.columns.ts` / `TEXT_SIZES` with identical SQL (X3 M12, K-4).
 */
import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './schema.auth';

/** Per-user display preferences and contact details, one row per non-anonymous user. */
export const profile = pgTable(
  'profile',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .unique('profile_user_id_unique')
      .references(() => user.id, { onDelete: 'cascade' }),
    displayName: text('display_name'),
    // The short name the Beranda greeting uses ("Selamat pagi, Nico"); NULL falls back to the first word of the name.
    nickname: text('nickname'),
    phone: text('phone'),
    jobTitle: text('job_title'),
    department: text('department'),
    // Accessibility: text scale chosen by the user (KEPUTUSAN Q13: new accounts start at 'normal').
    textSize: text('text_size').notNull().default('normal'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('profile_text_size_check', sql`${t.textSize} IN ('normal','besar','sangat_besar')`),
  ],
);

/** Pre-approved sign-in invitations: an invited email skips the pending queue on first login. */
export const userInvitation = pgTable(
  'user_invitation',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text('email').notNull(),
    role: text('role').notNull().default('member'),
    invitedBy: text('invited_by').references(() => user.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedUserId: text('accepted_user_id').references(() => user.id, { onDelete: 'set null' }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('user_invitation_email_normalized_check', sql`${t.email} = lower(btrim(${t.email}))`),
    check('user_invitation_role_check', sql`${t.role} IN ('member','project_manager','admin')`),
    // Partial unique: one live invitation per email. `now()` is not allowed in an index
    // predicate, so expiry is handled by revoking stale rows before inserting (invitation service).
    uniqueIndex('user_invitation_active_email_uq')
      .on(t.email)
      .where(sql`${t.acceptedAt} IS NULL AND ${t.revokedAt} IS NULL`),
  ],
);
