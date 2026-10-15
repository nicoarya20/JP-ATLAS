/** Predicate for the "live" (not soft-deleted) rows of PM tables; every PM list query must use it. */
import { type AnyColumn, isNull, type SQL } from 'drizzle-orm';

/**
 * Matches rows whose `deleted_at` is NULL. Partial indexes declare the same
 * predicate (`"deleted_at" is null`) so the planner can use them.
 */
export function isLive(table: { deletedAt: AnyColumn }): SQL {
  return isNull(table.deletedAt);
}
