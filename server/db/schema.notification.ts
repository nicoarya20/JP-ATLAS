/**
 * Inbox tables (notification, notification_pref). Migration 0017 (S3 I01) creates them.
 * Names are singular and there are no `relations()`; joins are written explicitly (R02 §3.2).
 * A card carries the identity of the event it stands for (`recipient_id` + `dedupe_key`), so
 * `notify()` can insert idempotently and `resolveNotifications()` can close a whole ref cheaply.
 * Enum columns are `text` + CHECK (this repo has no `pgEnum`); the tuples stay in this file because
 * `server/pm/enums.ts` is the enum source for the project/task CHECKs only (its coverage test pins it).
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './schema.auth';
import { createdAt, oneOf, pk, updatedAt } from './schema.columns';
import { project } from './schema.project';

const tz = (name: string) => timestamp(name, { withTimezone: true });

/** `action` = "Perlu Anda tanggapi" (resolves itself), `info` = "Kabar terbaru" (bundled, read-only). */
export const NOTIFICATION_LANES = ['action', 'info'] as const;
export type NotificationLane = (typeof NOTIFICATION_LANES)[number];

/** What `ref_id` points at; the card's button is built from the pair (`event` is reserved for S7). */
export const NOTIFICATION_REF_TYPES = ['task', 'project', 'user', 'event', 'comment'] as const;
export type NotificationRefType = (typeof NOTIFICATION_REF_TYPES)[number];

/** Why a card stopped needing a response; written by the service that changed the target. */
export const RESOLVE_REASONS = [
  'acted',
  'elsewhere',
  'target_closed',
  'superseded',
  'expired',
] as const;
export type ResolveReason = (typeof RESOLVE_REASONS)[number];

/** Preference categories; a missing row means "on", so `notification_pref` stays empty until a user opts out. */
export const NOTIFICATION_PREF_CATEGORIES = ['event_reminder', 'news'] as const;
export type NotificationPrefCategory = (typeof NOTIFICATION_PREF_CATEGORIES)[number];

/** One Inbox card for one recipient; `payload` holds the snapshot the card renders, never an email or phone. */
export const notification = pgTable(
  'notification',
  {
    id: pk(),
    // CASCADE: a deleted account takes its cards with it; nobody else can read them.
    recipientId: text('recipient_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Nullable + SET NULL: null means the system acted, and a removed actor must not delete the card.
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    // NULL for account cards (`user_pending`); CASCADE so trashing-then-purging a project clears its cards.
    projectId: text('project_id').references(() => project.id, { onDelete: 'cascade' }),
    lane: text('lane', { enum: NOTIFICATION_LANES }).notNull(),
    // Free text on purpose: `NOTIFICATION_KINDS` (server/notification) owns the list, so reserving a
    // kind for S4/S7 needs no migration. The lane CHECK still keeps the two Inbox tabs well defined.
    kind: text('kind').notNull(),
    refType: text('ref_type', { enum: NOTIFICATION_REF_TYPES }).notNull(),
    refId: text('ref_id').notNull(),
    // Event identity: `<kind>:<refType>:<refId>[:<sub>]`, unique per recipient so `notify()` is idempotent.
    dedupeKey: text('dedupe_key').notNull(),
    // Raised by ON CONFLICT for `info` cards ("5 perubahan di tugas #12"); `action` cards stay at 1.
    bundleCount: integer('bundle_count').notNull().default(1),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    readAt: tz('read_at'),
    resolvedAt: tz('resolved_at'),
    resolvedReason: text('resolved_reason', { enum: RESOLVE_REASONS }),
    createdAt: createdAt(),
    // Bumped when a card is bundled, which is also the order of the "Kabar terbaru" tab.
    updatedAt: updatedAt(),
  },
  (t) => [
    oneOf(t.lane, NOTIFICATION_LANES),
    oneOf(t.refType, NOTIFICATION_REF_TYPES),
    oneOf(t.resolvedReason, RESOLVE_REASONS),
    // `notify()` inserts with ON CONFLICT on this pair: one row per (recipient, event).
    uniqueIndex('notification_recipient_id_dedupe_key_uidx').on(t.recipientId, t.dedupeKey),
    // Bell count and tab 1 only ever read the open action cards, the smallest slice of the table.
    index('notification_recipient_id_action_idx')
      .on(t.recipientId, t.createdAt.desc())
      .where(sql`${t.lane} = 'action' AND ${t.resolvedAt} IS NULL`),
    // Tab 2 reads the info lane newest-bundle-first.
    index('notification_recipient_id_info_idx')
      .on(t.recipientId, t.updatedAt.desc())
      .where(sql`${t.lane} = 'info'`),
    // Bulk resolve ("this task is done") finds every open card on one ref without touching resolved ones.
    index('notification_ref_idx').on(t.refType, t.refId).where(sql`${t.resolvedAt} IS NULL`),
    // The retention sweep scans by age only.
    index('notification_created_at_idx').on(t.createdAt),
  ],
);

/** Per-user, per-category in-app switch; absence of a row means the category is on (no UI yet, S3 I01). */
export const notificationPref = pgTable(
  'notification_pref',
  {
    // CASCADE: the preference is meaningless without the account.
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    category: text('category', { enum: NOTIFICATION_PREF_CATEGORIES }).notNull(),
    inApp: boolean('in_app').notNull().default(true),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.category] }),
    oneOf(t.category, NOTIFICATION_PREF_CATEGORIES),
  ],
);
