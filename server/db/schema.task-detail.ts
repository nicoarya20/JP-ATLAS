/** Task detail tables (task_checklist_item, task_comment, task_activity); migration 0016 (S0B-06) creates them. */
import { boolean, index, jsonb, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './schema.auth';
import { createdAt, pk, updatedAt } from './schema.columns';
import { task } from './schema.task';

const tz = (name: string) => timestamp(name, { withTimezone: true });

/** One checkbox line of a task, ordered by `position`, removed with its task. */
export const taskChecklistItem = pgTable(
  'task_checklist_item',
  {
    id: pk(),
    taskId: text('task_id')
      .notNull()
      .references(() => task.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    isDone: boolean('is_done').notNull().default(false),
    // Nullable + SET NULL: who ticked the item is history, not a reason to keep the account.
    doneBy: text('done_by').references(() => user.id, { onDelete: 'set null' }),
    doneAt: tz('done_at'),
    position: smallint('position').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('task_checklist_item_task_id_position_idx').on(t.taskId, t.position)],
);

/** A comment on a task; soft-deleted so "Urungkan" works, but it never enters the trash view (R02 §3.5). */
export const taskComment = pgTable(
  'task_comment',
  {
    id: pk(),
    taskId: text('task_id')
      .notNull()
      .references(() => task.id, { onDelete: 'cascade' }),
    // Nullable + SET NULL: the comment outlives the account; `author_name` keeps a readable label.
    authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
    // Name at the time of writing, shown as "<name> (akun dihapus)" once author_id is nulled.
    authorName: text('author_name'),
    body: text('body').notNull(),
    editedAt: tz('edited_at'),
    deletedAt: tz('deleted_at'),
    createdAt: createdAt(),
  },
  (t) => [index('task_comment_task_id_created_at_idx').on(t.taskId, t.createdAt)],
);

/** Append-only audit trail of task changes, merged with comments into the task timeline. */
export const taskActivity = pgTable(
  'task_activity',
  {
    id: pk(),
    taskId: text('task_id')
      .notNull()
      .references(() => task.id, { onDelete: 'cascade' }),
    // Nullable + SET NULL: history must outlive the account; `actor_name` keeps a readable label.
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    actorName: text('actor_name'),
    action: text('action').notNull(),
    payload: jsonb('payload'),
    createdAt: createdAt(),
  },
  (t) => [index('task_activity_task_id_created_at_idx').on(t.taskId, t.createdAt)],
);
