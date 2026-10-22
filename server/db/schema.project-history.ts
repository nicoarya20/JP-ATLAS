/** Project history tables (project_activity, project_deadline_extension, project_condition_override). */
import { sql } from 'drizzle-orm';
import { check, date, index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { EXTENSION_REASON_CATEGORIES, PROJECT_CONDITIONS } from '../pm/enums';
import { user } from './schema.auth';
import { createdAt, oneOf, pk } from './schema.columns';
import { project } from './schema.project';

/** Append-only audit trail of project changes, shown on the project timeline. */
export const projectActivity = pgTable(
  'project_activity',
  {
    id: pk(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    // Nullable + SET NULL: history must outlive the account; `actor_name` keeps a readable label.
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    // Name at the time of the action, shown as "<name> (akun dihapus)" once actor_id is nulled.
    actorName: text('actor_name'),
    action: text('action').notNull(),
    payload: jsonb('payload'),
    createdAt: createdAt(),
  },
  (t) => [index('project_activity_project_id_created_at_idx').on(t.projectId, t.createdAt)],
);

/** One row per deadline move: the old and new date plus why, so the project can show "Diperpanjang ×N". */
export const projectDeadlineExtension = pgTable(
  'project_deadline_extension',
  {
    id: pk(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    // Pure calendar dates: string mode avoids timezone shifts.
    oldDueDate: date('old_due_date', { mode: 'string' }).notNull(),
    newDueDate: date('new_due_date', { mode: 'string' }).notNull(),
    reasonCategory: text('reason_category', { enum: EXTENSION_REASON_CATEGORIES }).notNull(),
    reason: text('reason').notNull(),
    // Nullable + SET NULL: the history outlives the account that recorded it.
    extendedBy: text('extended_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [
    oneOf(t.reasonCategory, EXTENSION_REASON_CATEGORIES),
    // Only forward moves are extensions; moving a deadline earlier is a plain edit, not history.
    check('project_deadline_extension_later_check', sql`${t.newDueDate} > ${t.oldDueDate}`),
    // The history list and the "x N" count read one project's rows in time order.
    index('project_deadline_extension_project_id_created_at_idx').on(t.projectId, t.createdAt),
  ],
);

/** A manager's manual condition for a project, with a reason; it replaces the computed one while active. */
export const projectConditionOverride = pgTable(
  'project_condition_override',
  {
    id: pk(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    condition: text('condition', { enum: PROJECT_CONDITIONS }).notNull(),
    reason: text('reason').notNull(),
    // Nullable + SET NULL: the history outlives the account that set it.
    setBy: text('set_by').references(() => user.id, { onDelete: 'set null' }),
    // NULL = until cleared by hand; an expiry exactly at "now" already counts as expired.
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    // Rows are never deleted: clearing sets this, so the history of overrides stays.
    clearedAt: timestamp('cleared_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    oneOf(t.condition, PROJECT_CONDITIONS),
    // The condition query only needs rows that were not cleared by hand, newest first.
    index('project_condition_override_project_id_created_at_idx')
      .on(t.projectId, t.createdAt)
      .where(sql`${t.clearedAt} IS NULL`),
  ],
);
