/**
 * Project template tables (project_template, project_template_phase, project_template_task).
 * A template is not a project: it never references `project`/`project_phase`/`task`, only becomes
 * one once `useTemplate()` (`project-template.service.ts`) instantiates it. Privat per pembuat —
 * every read filters by `created_by` (docs/plans/project-create-story-template.md §1.5); there is no
 * sharing between users in this version. Same column conventions as `schema.project-plan.ts`.
 */
import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, smallint, text } from 'drizzle-orm/pg-core';
import { PROJECT_PRIORITIES, PROJECT_TEMPLATE_SOURCES } from '../pm/enums';
import { user } from './schema.auth';
import { createdAt, oneOf, pk, updatedAt } from './schema.columns';

/** A reusable project blueprint, owned by one user; `name`/`description` mirror `project`'s limits. */
export const projectTemplate = pgTable(
  'project_template',
  {
    id: pk(),
    name: text('name').notNull(),
    description: text('description'),
    source: text('source', { enum: PROJECT_TEMPLATE_SOURCES }).notNull(),
    // Nullable + SET NULL, same reasoning as project.created_by: deleting the account never deletes
    // the template row. The accepted trade-off is that a null created_by makes the template
    // unreachable by anyone's "my templates" list from then on (private-only, no shared fallback) —
    // recorded as accepted debt in the plan (§11), not something to fix here.
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    oneOf(t.source, PROJECT_TEMPLATE_SOURCES),
    // "My templates" always filters by owner; this is the only way the list is ever read.
    index('project_template_created_by_idx').on(t.createdBy),
  ],
);

/** An ordered stage of a template, offsets in days from the project's future day 0 (its start date). */
export const projectTemplatePhase = pgTable(
  'project_template_phase',
  {
    id: pk(),
    templateId: text('template_id')
      .notNull()
      .references(() => projectTemplate.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    position: smallint('position').notNull(),
    // Relative to the project's start date once instantiated (day 0); null = not given.
    startOffsetDays: integer('start_offset_days'),
    endOffsetDays: integer('end_offset_days'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      'project_template_phase_end_after_start_check',
      sql`${t.endOffsetDays} >= ${t.startOffsetDays}`,
    ),
    // Phases of a template are always read in display order.
    index('project_template_phase_template_id_position_idx').on(t.templateId, t.position),
  ],
);

/**
 * A task template, optionally under a phase. No assignee on purpose: a template outlives any one
 * team roster, so a past assignee is unlikely to still be the right person (plan §3.3).
 */
export const projectTemplateTask = pgTable(
  'project_template_task',
  {
    id: pk(),
    templateId: text('template_id')
      .notNull()
      .references(() => projectTemplate.id, { onDelete: 'cascade' }),
    // SET NULL: removing a phase from the template keeps its tasks as template-level ("no phase").
    templatePhaseId: text('template_phase_id').references(() => projectTemplatePhase.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    description: text('description'),
    priority: text('priority', { enum: PROJECT_PRIORITIES }),
    // A kind *name*, not an id: a template has no project yet, so the kind is resolved by name
    // against DEFAULT_TASK_KINDS (or falls back) only when the template is instantiated.
    kindName: text('kind_name'),
    dueOffsetDays: integer('due_offset_days'),
    // Display order across the whole template (not per phase), to keep the model simple.
    position: smallint('position').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    oneOf(t.priority, PROJECT_PRIORITIES),
    index('project_template_task_template_id_position_idx').on(t.templateId, t.position),
  ],
);
