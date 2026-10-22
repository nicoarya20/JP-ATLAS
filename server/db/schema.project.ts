/**
 * Project core tables (project, project_member). Migration 0015 (S0B-03) creates them.
 * Names are singular and there are no `relations()`; joins are written explicitly (R02 §3.1).
 * New PM tables use `timestamptz` while the legacy `user`/`session` columns stay plain
 * `timestamp`; the DB session runs in UTC, so cross-type comparisons need `AT TIME ZONE 'UTC'` (X1 D7).
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { PROJECT_MEMBER_ROLES, PROJECT_PRIORITIES, PROJECT_STATUSES } from '../pm/enums';
import { user } from './schema.auth';
import { createdAt, oneOf, pk, softDelete, updatedAt } from './schema.columns';

/** A project: the container for phases, tasks and members, soft-deleted via `deleted_at`. */
export const project = pgTable(
  'project',
  {
    id: pk(),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status', { enum: PROJECT_STATUSES }).notNull().default('draft'),
    priority: text('priority', { enum: PROJECT_PRIORITIES }).notNull().default('medium'),
    // Nullable + SET NULL: deleting a user must never delete or block a project; the UI shows "no lead" (M3).
    leadId: text('lead_id').references(() => user.id, { onDelete: 'set null' }),
    // Pure calendar dates: string mode avoids timezone shifts on due dates.
    startDate: date('start_date', { mode: 'string' }),
    dueDate: date('due_date', { mode: 'string' }),
    // Filled by S5 when the first deadline extension happens, so extensions can be compared with the baseline.
    originalDueDate: date('original_due_date', { mode: 'string' }),
    // T-A10: new tasks of the project do not need a review unless a manager opts in.
    tasksNeedReviewDefault: boolean('tasks_need_review_default').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...softDelete(),
    // Nullable + SET NULL for the same reason as lead_id: the creator account may be removed later.
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    oneOf(t.status, PROJECT_STATUSES),
    oneOf(t.priority, PROJECT_PRIORITIES),
    check('project_due_after_start_check', sql`${t.dueDate} >= ${t.startDate}`),
    // Live-project list (filter by status, order by due date); trash rows are excluded to keep it small.
    index('project_status_due_date_idx').on(t.status, t.dueDate).where(sql`${t.deletedAt} IS NULL`),
    // Trash view and purge job only look at deleted rows.
    index('project_deleted_at_idx').on(t.deletedAt).where(sql`${t.deletedAt} IS NOT NULL`),
  ],
);

/** Membership of a user in a project with a project-level role; removed with either side. */
export const projectMember = pgTable(
  'project_member',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    // CASCADE: a deleted account simply leaves the project; other managers remain (R02 §3.6).
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role', { enum: PROJECT_MEMBER_ROLES }).notNull().default('member'),
    // Nullable + SET NULL: who added the member is history, not a reason to keep the account.
    addedBy: text('added_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.userId] }),
    oneOf(t.role, PROJECT_MEMBER_ROLES),
    // "My projects" lookup starts from the user; the PK already covers the project-first direction.
    index('project_member_user_id_idx').on(t.userId),
  ],
);
