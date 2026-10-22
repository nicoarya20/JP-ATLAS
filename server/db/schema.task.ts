/**
 * Task core tables (task_kind, task). Migration 0016 (S0B-06) creates them.
 * Names are singular and there are no `relations()`; joins are written explicitly (R02 §3.2).
 * `phase_id` came later (migration 0019) as a nullable expand-only change, once `project_phase` existed.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  PROJECT_PRIORITIES,
  TASK_BASE_KINDS,
  TASK_CANCEL_CATEGORIES,
  TASK_STATUSES,
} from '../pm/enums';
import { user } from './schema.auth';
import { createdAt, oneOf, pk, softDelete, updatedAt } from './schema.columns';
import { project } from './schema.project';
import { projectPhase } from './schema.project-plan';

const tz = (name: string) => timestamp(name, { withTimezone: true });

/** A per-project task type (task, issue or idea flavour) that a task must point to. */
export const taskKind = pgTable(
  'task_kind',
  {
    id: pk(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    baseKind: text('base_kind', { enum: TASK_BASE_KINDS }).notNull(),
    position: smallint('position').notNull(),
    // Kinds are archived, never deleted, so tasks keep a valid kind_id.
    archivedAt: tz('archived_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    oneOf(t.baseKind, TASK_BASE_KINDS),
    // Case-insensitive uniqueness is safe here because kinds have no soft delete (R02 §3.5).
    uniqueIndex('task_kind_project_id_name_uidx').on(t.projectId, sql`lower(${t.name})`),
  ],
);

/** A unit of work inside a project, soft-deleted via `deleted_at` and numbered globally by `number`. */
export const task = pgTable(
  'task',
  {
    id: pk(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    // BY DEFAULT (not ALWAYS) so seeds and tests can pin a number; numbers are never reused (R02 §3.5).
    number: bigint('number', { mode: 'number' }).generatedByDefaultAsIdentity({
      name: 'task_number_seq',
    }),
    // Nullable + SET NULL: deleting a phase must never delete its tasks; they fall back to "no phase" (L5-01).
    phaseId: text('phase_id').references(() => projectPhase.id, { onDelete: 'set null' }),
    // NO ACTION (not RESTRICT): deleting a project cascades tasks and kinds in one statement, and the
    // check runs at statement end, so the order of the cascade cannot fail it (R02 §3.4 #11).
    kindId: text('kind_id')
      .notNull()
      .references(() => taskKind.id),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { enum: TASK_STATUSES }).notNull().default('todo'),
    // Tasks share the project priority scale (R02 §3.2), so the tuple is reused on purpose.
    priority: text('priority', { enum: PROJECT_PRIORITIES }).notNull().default('medium'),
    // Assignee/reviewer/creator are nullable + SET NULL: a removed account leaves the task unowned (R02 §3.6).
    assigneeId: text('assignee_id').references(() => user.id, { onDelete: 'set null' }),
    reviewerId: text('reviewer_id').references(() => user.id, { onDelete: 'set null' }),
    needsReview: boolean('needs_review').notNull().default(false),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    // Pure calendar dates: string mode avoids timezone shifts on due dates.
    startDate: date('start_date', { mode: 'string' }),
    dueDate: date('due_date', { mode: 'string' }),
    estimateHours: numeric('estimate_hours', { precision: 6, scale: 1 }),
    // Counters feed the "reopened" label and the review-return stats; transitions land in S2.
    reopenCount: integer('reopen_count').notNull().default(0),
    returnCount: integer('return_count').notNull().default(0),
    cancelCategory: text('cancel_category', { enum: TASK_CANCEL_CATEGORIES }),
    cancelNote: text('cancel_note'),
    startedAt: tz('started_at'),
    reviewRequestedAt: tz('review_requested_at'),
    completedAt: tz('completed_at'),
    canceledAt: tz('canceled_at'),
    // Drives the "stale" label (no activity for TASK_STALE_DAYS).
    lastActivityAt: tz('last_activity_at').defaultNow().notNull(),
    ...softDelete(),
    // Set when the task was trashed together with its project, so restoring the project restores only those.
    deletedWithProjectId: text('deleted_with_project_id').references(() => project.id, {
      onDelete: 'set null',
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    oneOf(t.status, TASK_STATUSES),
    oneOf(t.priority, PROJECT_PRIORITIES),
    oneOf(t.cancelCategory, TASK_CANCEL_CATEGORIES),
    check('task_due_after_start_check', sql`${t.dueDate} >= ${t.startDate}`),
    check(
      'task_reviewer_not_assignee_check',
      sql`${t.reviewerId} IS NULL OR ${t.assigneeId} IS NULL OR ${t.reviewerId} <> ${t.assigneeId}`,
    ),
    check(
      'task_canceled_needs_category_check',
      sql`${t.status} <> 'canceled' OR ${t.cancelCategory} IS NOT NULL`,
    ),
    check(
      'task_other_needs_note_check',
      sql`${t.cancelCategory} IS DISTINCT FROM 'other' OR ${t.cancelNote} IS NOT NULL`,
    ),
    check('task_counters_check', sql`${t.reopenCount} >= 0 AND ${t.returnCount} >= 0`),
    uniqueIndex('task_number_uidx').on(t.number),
    // Per-project lists and progress (GROUP BY project_id, status); trashed rows stay out of the index.
    index('task_project_id_status_idx')
      .on(t.projectId, t.status)
      .where(sql`${t.deletedAt} IS NULL`),
    // "My tasks", Home focus and team load share this one index (R02 §3.7).
    index('task_assignee_id_status_due_date_idx')
      .on(t.assigneeId, t.status, t.dueDate)
      .where(sql`${t.deletedAt} IS NULL`),
    // "Waiting for my review" only ever reads in_review tasks, the smallest slice of the table.
    index('task_project_id_reviewer_id_idx')
      .on(t.projectId, t.reviewerId)
      .where(sql`${t.status} = 'in_review' AND ${t.deletedAt} IS NULL`),
    // Phase task counts and the SET NULL on phase delete; most tasks have no phase, so the index skips them.
    index('task_phase_id_idx').on(t.phaseId).where(sql`${t.phaseId} IS NOT NULL`),
    // Trash view and purge job only look at deleted rows.
    index('task_deleted_at_idx').on(t.deletedAt).where(sql`${t.deletedAt} IS NOT NULL`),
    // Restoring a project finds the tasks trashed with it.
    index('task_deleted_with_project_id_idx')
      .on(t.deletedWithProjectId)
      .where(sql`${t.deletedWithProjectId} IS NOT NULL`),
  ],
);
