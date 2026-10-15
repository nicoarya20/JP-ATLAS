// Better Auth core tables. These match the Better Auth Drizzle adapter schema;
// regenerate with: bun run auth:generate
import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified')
      .$defaultFn(() => false)
      .notNull(),
    image: text('image'),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
    // Better Auth admin plugin fields.
    role: text('role'),
    banned: boolean('banned').default(false),
    banReason: text('ban_reason'),
    banExpires: timestamp('ban_expires'),
    // Better Auth anonymous plugin: temporary demo visitors, purged after the demo TTL.
    isAnonymous: boolean('is_anonymous').default(false),
    // Account approval (S0.a, migration 0014). Declared as Better Auth `user.additionalFields`
    // so the status rides on the session. Written by hand: `auth:generate` targets auth.schema.ts.
    // Column default is 'pending' (new sign-ups wait for an Admin); 0014 backfills existing rows to
    // 'approved' BEFORE that default is set, so nobody who could sign in yesterday is locked out.
    approvalStatus: text('approval_status').notNull().default('pending'),
    approvalDecidedBy: text('approval_decided_by'),
    // timestamptz written inline; S0.b moves this to schema.columns.ts with identical SQL (X3 M12, K-4).
    approvalDecidedAt: timestamp('approval_decided_at', { withTimezone: true }),
    approvalReason: text('approval_reason'),
  },
  (t) => [
    index('user_is_anonymous_created_at_idx').on(t.isAnonymous, t.createdAt),
    // Partial: the admin queue only ever reads the not-yet-approved minority.
    index('user_approval_status_idx')
      .on(t.approvalStatus)
      .where(sql`${t.approvalStatus} <> 'approved'`),
    check(
      'user_approval_status_check',
      sql`${t.approvalStatus} IN ('pending','approved','rejected')`,
    ),
    // Self-reference: deleting the deciding admin must not delete the decided accounts.
    foreignKey({
      columns: [t.approvalDecidedBy],
      foreignColumns: [t.id],
      name: 'user_approval_decided_by_user_id_fk',
    }).onDelete('set null'),
  ],
);

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  // Better Auth admin plugin: set while an admin impersonates this user.
  impersonatedBy: text('impersonated_by'),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()),
});
