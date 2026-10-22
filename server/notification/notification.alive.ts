/**
 * The Inbox filter for cards whose task is in the Trash (S6 D1). A card is a snapshot with a button
 * to `/app/tasks/<number>`, and a trashed task answers 404 there, so the card is hidden rather than
 * left broken. It is hidden on read, not resolved or deleted: restoring the task (the "Urungkan"
 * toast) brings its open cards back exactly as they were, and the counts follow the list.
 */
import { type SQL, sql } from 'drizzle-orm';
import { notification, task } from '../db/schema';

/** True for every card that is not about a task, and for a task card whose task is not in the Trash. */
export const refNotTrashed: SQL = sql`(${notification.refType} <> 'task' OR NOT EXISTS (
  SELECT 1 FROM ${task} t
   WHERE t.id = ${notification.refId} AND t.deleted_at IS NOT NULL))`;
