/**
 * Task timeline (S2-06): comments and activity rows as one stream, newest first, paged by the keyset
 * `(created_at, id)` with the shared opaque cursor (`pm/keyset.ts`). The cursor carries the timestamp
 * as Postgres text, so microseconds survive the round trip and no row is skipped or repeated.
 * A removed account shows as "Mantan anggota"; a live one by their current display name.
 */
import { sql } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { db } from '../db';
import { taskActivity, taskComment } from '../db/schema';
import { decodeCursor, encodeCursor } from '../pm/keyset';
import { PAGE_LIMIT_DEFAULT, PAGE_LIMIT_MAX } from '../pm/limits';
import type { Executor } from '../pm/tx';
import { TASK_FORMER_MEMBER_LABEL } from './task.limits';
import { loadPeople } from './task.lookup.query';
import { loadTaskAccess } from './task-access.query';

type Person = { id: string | null; name: string };

/** One timeline entry: a comment (`body`) or an activity (`action` + `payload`). */
export type TimelineEntry =
  | {
      kind: 'comment';
      id: string;
      at: string;
      author: Person;
      body: string;
      editedAt: string | null;
    }
  | { kind: 'activity'; id: string; at: string; author: Person; action: string; payload: unknown };

export type TimelineResult =
  | { ok: true; items: TimelineEntry[]; nextCursor: string | null }
  | { ok: false; code: 'NOT_FOUND' | 'BAD_CURSOR' };

type Row = {
  kind: 'comment' | 'activity';
  id: string;
  at: Date | string;
  at_key: string;
  person_id: string | null;
  person_name: string | null;
  body: string | null;
  edited_at: Date | string | null;
  action: string | null;
  payload: unknown;
};

const clampLimit = (n: number | undefined) =>
  Math.min(Math.max(Math.trunc(n ?? PAGE_LIMIT_DEFAULT), 1), PAGE_LIMIT_MAX);
const iso = (d: Date | string) => new Date(d).toISOString();
// `timestamptz::text` in a UTC session; anything else in a cursor was not produced here.
const AT_KEY = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?\+00$/;

/**
 * One page of the timeline of the task `ref` names. A task the caller may not see answers
 * `NOT_FOUND`; a cursor not made by this query `BAD_CURSOR`.
 */
export async function getTaskTimeline(
  p: Principal,
  ref: string,
  page: { limit?: number; cursor?: string },
  exec: Executor = db,
): Promise<TimelineResult> {
  const limit = clampLimit(page.limit);
  let after = (_alias: 'a' | 'c') => sql`true`;
  if (page.cursor !== undefined) {
    const c = decodeCursor(page.cursor);
    if (!c.ok || typeof c.key.sortValue !== 'string' || !AT_KEY.test(c.key.sortValue))
      return { ok: false, code: 'BAD_CURSOR' };
    const { sortValue, id } = c.key;
    after = (alias) =>
      sql`(${sql.raw(alias)}.created_at, ${sql.raw(alias)}.id) < (${sortValue}::timestamptz, ${id})`;
  }
  const access = await loadTaskAccess(p, ref, exec);
  if (!access) return { ok: false, code: 'NOT_FOUND' };
  const taskId = access.subject.id;

  // Each branch is cut to limit+1 on its own (task_id, created_at) index before the merge.
  const rows = (await exec.execute(sql`
    SELECT * FROM (
      (SELECT 'comment' AS kind, c.id, c.created_at AS at, c.created_at::text AS at_key,
              c.author_id AS person_id, c.author_name AS person_name, c.body, c.edited_at,
              NULL::text AS action, NULL::jsonb AS payload
         FROM ${taskComment} c
        WHERE c.task_id = ${taskId} AND c.deleted_at IS NULL AND ${after('c')}
        ORDER BY c.created_at DESC, c.id DESC LIMIT ${limit + 1})
      UNION ALL
      (SELECT 'activity', a.id, a.created_at, a.created_at::text, a.actor_id, a.actor_name,
              NULL, NULL, a.action, a.payload
         FROM ${taskActivity} a
        WHERE a.task_id = ${taskId} AND ${after('a')}
        ORDER BY a.created_at DESC, a.id DESC LIMIT ${limit + 1})
    ) t
    ORDER BY t.at DESC, t.id DESC
    LIMIT ${limit + 1}`)) as unknown as Row[];

  const pageRows = rows.slice(0, limit);
  const people = await loadPeople(
    pageRows.map((r) => r.person_id),
    exec,
  );
  const person = (r: Row): Person =>
    r.person_id
      ? { id: r.person_id, name: people.get(r.person_id)?.name ?? r.person_name ?? '' }
      : { id: null, name: TASK_FORMER_MEMBER_LABEL };
  const items = pageRows.map((r): TimelineEntry => {
    const base = { id: r.id, at: iso(r.at), author: person(r) };
    return r.kind === 'comment'
      ? {
          kind: 'comment',
          ...base,
          body: r.body ?? '',
          editedAt: r.edited_at ? iso(r.edited_at) : null,
        }
      : { kind: 'activity', ...base, action: r.action ?? '', payload: r.payload };
  });
  const last = pageRows.at(-1);
  const nextCursor = rows.length > limit && last ? encodeCursor(last.at_key, last.id) : null;
  return { ok: true, items, nextCursor };
}
