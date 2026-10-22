/**
 * Event tables (event, event_participant, event_note, event_reminder). Migration 0018 (S7 E-01) creates them.
 * Names are singular and there are no `relations()`; joins are written explicitly (R02 §3.1).
 * An event stands on its own: `project_id` is optional, so a one-off meeting needs no project, and a
 * deleted project leaves its events behind instead of taking them along (SET NULL + `deleted_with_project_id`).
 * Enum columns are `text` + CHECK (this repo has no `pgEnum`); the tuples live in `server/pm/enums.ts`.
 * Text lengths are not CHECKed here: like `project.name` and `task.title` they are validated at the API
 * boundary (the `*.limits.ts` + Elysia `t.String` pattern), so raising a limit needs no migration.
 */
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  EVENT_KINDS,
  EVENT_LOCATION_TYPES,
  EVENT_NOTE_STATUSES,
  EVENT_REMINDER_OFFSETS_MIN,
} from '../pm/enums';
import { user } from './schema.auth';
import { createdAt, oneOf, pk, softDelete, updatedAt } from './schema.columns';
import { project } from './schema.project';

const tz = (name: string) => timestamp(name, { withTimezone: true });

/** A calendar event, soft-deleted via `deleted_at` and cancellable without losing its history. */
export const event = pgTable(
  'event',
  {
    id: pk(),
    // Nullable + SET NULL: an event may be personal, and trashing a project must not erase its agenda (E-07).
    projectId: text('project_id').references(() => project.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    kind: text('kind', { enum: EVENT_KINDS }).notNull().default('meeting'),
    startsAt: tz('starts_at').notNull(),
    // NOT NULL so every event has a span the agenda and the calendar can lay out without a fallback.
    endsAt: tz('ends_at').notNull(),
    // Nullable: stage 1 of the form asks four fields only, so place is answered later (or never).
    locationType: text('location_type', { enum: EVENT_LOCATION_TYPES }),
    locationText: text('location_text'),
    meetingUrl: text('meeting_url'),
    agenda: text('agenda'),
    // Per-event offsets in minutes before `starts_at`; the default covers "tomorrow" and "about to start".
    remindersMinutes: integer('reminders_minutes')
      .array()
      .notNull()
      .default([...EVENT_REMINDER_OFFSETS_MIN]),
    // Cancelling keeps the row visible with its reason, because participants already planned around it.
    canceledAt: tz('canceled_at'),
    cancelReason: text('cancel_reason'),
    canceledBy: text('canceled_by').references(() => user.id, { onDelete: 'set null' }),
    // Nullable + SET NULL: the creator account may be removed later; the event outlives it (M3).
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    ...softDelete(),
    // Set when the event was trashed together with its project, so restoring the project restores only those.
    deletedWithProjectId: text('deleted_with_project_id').references(() => project.id, {
      onDelete: 'set null',
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    oneOf(t.kind, EVENT_KINDS),
    oneOf(t.locationType, EVENT_LOCATION_TYPES),
    // An event that ends before it starts is a typo, not a state the list or the calendar can render.
    check('event_ends_after_starts_check', sql`${t.endsAt} > ${t.startsAt}`),
    // The Upcoming/Past tabs and the reminder tick read live, non-cancelled events ordered by time only.
    index('event_starts_at_idx')
      .on(t.startsAt)
      .where(sql`${t.deletedAt} IS NULL AND ${t.canceledAt} IS NULL`),
    // Per-project agenda; trashed rows stay out so the index tracks the list the page actually shows.
    index('event_project_id_starts_at_idx')
      .on(t.projectId, t.startsAt)
      .where(sql`${t.deletedAt} IS NULL`),
    // "Events I created" is the fallback visibility path for an event without a project.
    index('event_created_by_idx').on(t.createdBy),
    // Trash view and the purge job only look at deleted rows.
    index('event_deleted_at_idx').on(t.deletedAt).where(sql`${t.deletedAt} IS NOT NULL`),
    // Restoring a project finds the events trashed with it.
    index('event_deleted_with_project_id_idx')
      .on(t.deletedWithProjectId)
      .where(sql`${t.deletedWithProjectId} IS NOT NULL`),
  ],
);

/** Who is invited; the creator is one of them, so visibility is a single EXISTS on this table. */
export const eventParticipant = pgTable(
  'event_participant',
  {
    // CASCADE: participation has no meaning without the event, and purging one must leave no orphan.
    eventId: text('event_id')
      .notNull()
      .references(() => event.id, { onDelete: 'cascade' }),
    // CASCADE: a deleted account simply stops being invited; the event and its other guests remain.
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Nullable + SET NULL: who invited whom is history, not a reason to keep the account.
    addedBy: text('added_by').references(() => user.id, { onDelete: 'set null' }),
    addedAt: tz('added_at').defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.userId] }),
    // Agenda and visibility start from the user; the PK already covers the event-first direction (R07 W6).
    index('event_participant_user_id_event_id_idx').on(t.userId, t.eventId),
  ],
);

/** The single minutes document of an event; `updated_at` doubles as its optimistic lock. */
export const eventNote = pgTable(
  'event_note',
  {
    id: pk(),
    // CASCADE: minutes cannot outlive their meeting. UNIQUE, not PK, so the row keeps an id of its own.
    eventId: text('event_id')
      .notNull()
      .references(() => event.id, { onDelete: 'cascade' }),
    body: text('body').notNull().default(''),
    status: text('status', { enum: EVENT_NOTE_STATUSES }).notNull().default('draft'),
    // Nullable + SET NULL: the minutes stay readable after the author's account is removed.
    writtenBy: text('written_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    // `UPDATE … WHERE updated_at = baseUpdatedAt` is the lock: 0 rows means someone else saved first (409).
    updatedAt: updatedAt(),
  },
  (t) => [
    oneOf(t.status, EVENT_NOTE_STATUSES),
    // One document per event: the writer upserts on this key instead of checking first.
    uniqueIndex('event_note_event_id_uidx').on(t.eventId),
  ],
);

/** One claimed reminder slot. The row *is* the claim, so a repeated tick cannot notify twice. */
export const eventReminder = pgTable(
  'event_reminder',
  {
    // CASCADE: claims are per event; changing `starts_at` deletes them so the new time is reminded about.
    eventId: text('event_id')
      .notNull()
      .references(() => event.id, { onDelete: 'cascade' }),
    offsetMinutes: integer('offset_minutes').notNull(),
    claimedAt: tz('claimed_at').defaultNow().notNull(),
  },
  (t) => [
    // The PK is the idempotency key: `INSERT … ON CONFLICT DO NOTHING RETURNING` elects one winner per slot.
    primaryKey({ columns: [t.eventId, t.offsetMinutes] }),
  ],
);
