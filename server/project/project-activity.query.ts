/**
 * Read side of the project activity feed (S5a-03): the latest changes for the Summary card, newest
 * first, paged by keyset on `(created_at, id)`. Anyone who may see the project may read it.
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { db } from '../db';
import { projectActivity, user } from '../db/schema';
import { decodeCursor, encodeCursor } from '../pm/keyset';
import type { Executor } from '../pm/tx';
import { type ActivityItemDto, mentionedUserIds, toActivityItem } from './project-activity.dto';
import { canSeeProject } from './project-visible.query';

/** Rows per page when the caller does not ask; the Summary card shows about this many. */
export const ACTIVITY_LIMIT_DEFAULT = 20;

export type ActivityPage = { items: ActivityItemDto[]; nextCursor: string | null };
export type ActivityResult =
  | { ok: true; value: ActivityPage }
  | { ok: false; code: 'NOT_FOUND' | 'VALIDATION' };

// The cursor carries `created_at` as Postgres prints it (microseconds): a JS `Date` keeps only
// milliseconds, so comparing against it would repeat or skip rows written in the same millisecond.
const PG_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}[ T](?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-]\d{2}(?::?\d{2})?)?$/;

/** True for a timestamp Postgres will accept as `timestamptz`, so a forged cursor is a 422, not a 500. */
function isCursorTime(s: string): boolean {
  if (!PG_TIMESTAMP.test(s)) return false;
  const day = s.slice(0, 10);
  return new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
}

async function namesOf(exec: Executor, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await exec
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(inArray(user.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/** One page of a project's activity; `NOT_FOUND` when the caller may not see the project. */
export async function listProjectActivity(
  p: Principal,
  projectId: string,
  page: { limit?: number; cursor?: string },
  exec: Executor = db,
): Promise<ActivityResult> {
  const limit = page.limit ?? ACTIVITY_LIMIT_DEFAULT;
  let after: ReturnType<typeof sql> | undefined;
  if (page.cursor) {
    const decoded = decodeCursor(page.cursor);
    if (
      !decoded.ok ||
      typeof decoded.key.sortValue !== 'string' ||
      !isCursorTime(decoded.key.sortValue)
    ) {
      return { ok: false, code: 'VALIDATION' };
    }
    after = sql`(${projectActivity.createdAt}, ${projectActivity.id}) < (${decoded.key.sortValue}::timestamptz, ${decoded.key.id})`;
  }
  if (!(await canSeeProject(p, projectId, exec))) return { ok: false, code: 'NOT_FOUND' };

  const rows = await exec
    .select({
      id: projectActivity.id,
      action: projectActivity.action,
      payload: projectActivity.payload,
      actorId: projectActivity.actorId,
      actorName: projectActivity.actorName,
      createdAt: projectActivity.createdAt,
      createdAtText: sql<string>`${projectActivity.createdAt}::text`,
    })
    .from(projectActivity)
    .where(and(eq(projectActivity.projectId, projectId), after))
    .orderBy(desc(projectActivity.createdAt), desc(projectActivity.id))
    .limit(limit + 1);

  const shown = rows.slice(0, limit);
  const last = shown[shown.length - 1];
  const names = await namesOf(exec, [
    ...new Set(shown.flatMap((r) => mentionedUserIds(r.action, r.payload))),
  ]);
  return {
    ok: true,
    value: {
      items: shown.map((r) => toActivityItem(r, names)),
      nextCursor: rows.length > limit && last ? encodeCursor(last.createdAtText, last.id) : null,
    },
  };
}
