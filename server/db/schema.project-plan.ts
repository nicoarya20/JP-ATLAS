/**
 * Project plan tables (project_phase, project_milestone). Migration 0019 (S5a-01) creates them.
 * Same conventions as `schema.project.ts`: singular names, no `relations()`, `timestamptz` columns.
 */
import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core';
import { PHASE_STATUSES } from '../pm/enums';
import { createdAt, oneOf, pk, updatedAt } from './schema.columns';
import { project } from './schema.project';

const tz = (name: string) => timestamp(name, { withTimezone: true });

/** An ordered stage of a project (e.g. "Persiapan"); tasks may point to one through `task.phase_id`. */
export const projectPhase = pgTable(
  'project_phase',
  {
    id: pk(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    // Display order; deliberately not UNIQUE with project_id because swapping two rows would break
    // a UNIQUE index mid-UPDATE, and Drizzle has no DEFERRABLE (R02 §3.4 #6). Reorder runs in one transaction.
    position: smallint('position').notNull(),
    // Pure calendar dates: string mode avoids timezone shifts.
    startDate: date('start_date', { mode: 'string' }),
    endDate: date('end_date', { mode: 'string' }),
    status: text('status', { enum: PHASE_STATUSES }).notNull().default('not_started'),
    startedAt: tz('started_at'),
    finishedAt: tz('finished_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    oneOf(t.status, PHASE_STATUSES),
    check('project_phase_end_after_start_check', sql`${t.endDate} >= ${t.startDate}`),
    // Phases of a project are always read in display order.
    index('project_phase_project_id_position_idx').on(t.projectId, t.position),
  ],
);

/** A dated checkpoint of a project, optionally tied to a phase; "reached" is a manual mark (`reached_at`). */
export const projectMilestone = pgTable(
  'project_milestone',
  {
    id: pk(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    // SET NULL: removing a phase keeps its milestones as project-level checkpoints.
    phaseId: text('phase_id').references(() => projectPhase.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    dueDate: date('due_date', { mode: 'string' }).notNull(),
    reachedAt: tz('reached_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Timeline and the condition query read milestones of a project by due date.
    index('project_milestone_project_id_due_date_idx').on(t.projectId, t.dueDate),
  ],
);
