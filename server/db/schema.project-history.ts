/** Project history table (project_activity); migration 0015 (S0B-03) creates it. */
import { index, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { user } from './schema.auth';
import { createdAt, pk } from './schema.columns';
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
