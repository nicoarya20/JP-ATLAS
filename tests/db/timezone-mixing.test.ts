import { afterAll, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '../../server/db';

// X1 D7: legacy `user.created_at` is a plain `timestamp` (naive, written as UTC) while the new PM tables use
// `timestamptz`. Postgres casts naive -> timestamptz with the SESSION zone, so a cross-type comparison silently shifts
// by the zone offset unless the naive side goes through `AT TIME ZONE 'UTC'`. These tests pin that rule on one
// connection switched to Asia/Jakarta (UTC+7), inside rolled-back transactions so no other connection is affected.
const TAG = 'tz_mixing';
const SESSION_ZONE = 'Asia/Jakarta'; // test-only: any zone with a non-zero offset exposes the bug
// One instant seen from both columns: the user row is created an hour before the task row, both in UTC.
const USER_CREATED_UTC = '2026-06-01 09:00:00';
const TASK_CREATED_UTC = '2026-06-01 10:00:00';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
class Rollback extends Error {}
const newId = () => `${TAG}-${crypto.randomUUID()}`;

/** Runs `fn` in a transaction on one connection set to `zone`, then rolls back (zone and data both vanish). */
async function inZone(
  zone: string,
  fn: (tx: Tx, ids: { userId: string; taskId: string }) => Promise<void>,
) {
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('TimeZone', ${zone}, true)`); // is_local = true -> SET LOCAL TIME ZONE
      const userId = newId();
      const projectId = newId();
      const kindId = newId();
      const taskId = newId();
      await tx.execute(sql`
        INSERT INTO "user" ("id","name","email","email_verified","created_at","updated_at")
        VALUES (${userId},'Test User',${`${userId}@example.test`},true,
                ${USER_CREATED_UTC}::timestamp,${USER_CREATED_UTC}::timestamp)`); // test-only
      await tx.execute(sql`INSERT INTO "project" ("id","name") VALUES (${projectId},'Proyek uji')`); // test-only
      await tx.execute(sql`
        INSERT INTO "task_kind" ("id","project_id","name","base_kind","position")
        VALUES (${kindId},${projectId},'Tugas','task',0)`); // test-only
      await tx.execute(sql`
        INSERT INTO "task" ("id","project_id","kind_id","title","created_by","created_at")
        VALUES (${taskId},${projectId},${kindId},'Tugas uji',${userId},${`${TASK_CREATED_UTC}+00`}::timestamptz)`); // test-only
      await fn(tx, { userId, taskId });
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

/** The task-minus-user creation gap as the app should compute it: naive side declared as UTC explicitly. */
const explicitGap = (tx: Tx, taskId: string) =>
  tx.execute<{ gap: string }>(sql`
    SELECT (t.created_at - (u.created_at AT TIME ZONE 'UTC'))::text AS gap
    FROM "task" t JOIN "user" u ON u.id = t.created_by WHERE t.id = ${taskId}`);

/** The same gap with the forbidden implicit naive -> timestamptz cast. */
const implicitGap = (tx: Tx, taskId: string) =>
  tx.execute<{ gap: string }>(sql`
    SELECT (t.created_at - u.created_at)::text AS gap
    FROM "task" t JOIN "user" u ON u.id = t.created_by WHERE t.id = ${taskId}`);

describe('D7: user.created_at (timestamp) vs task.created_at (timestamptz)', () => {
  afterAll(async () => {
    const [row] = await db.execute<{ n: string }>(
      sql`SELECT count(*) AS n FROM "user" WHERE id LIKE ${`${TAG}-%`}`,
    );
    expect(Number(row.n)).toBe(0);
  });

  it('control: the connection really runs in Asia/Jakarta and the pool is back on UTC afterwards', async () => {
    await inZone(SESSION_ZONE, async (tx) => {
      const [row] = await tx.execute<{ TimeZone: string }>(sql`SHOW TimeZone`);
      expect(row.TimeZone).toBe(SESSION_ZONE);
    });
    const [after] = await db.execute<{ TimeZone: string }>(sql`SHOW TimeZone`);
    expect(after.TimeZone).toBe('UTC');
  });

  it('joining through AT TIME ZONE UTC gives the true 1 hour gap on a Jakarta connection', async () => {
    await inZone(SESSION_ZONE, async (tx, { taskId }) => {
      const [row] = await explicitGap(tx, taskId);
      expect(row.gap).toBe('01:00:00');
    });
  });

  it('joining through AT TIME ZONE UTC lines the instants up and orders them correctly', async () => {
    await inZone(SESSION_ZONE, async (tx, { taskId }) => {
      const [row] = await tx.execute<{ same_instant: boolean; user_first: boolean }>(sql`
        SELECT (u.created_at AT TIME ZONE 'UTC') + interval '1 hour' = t.created_at AS same_instant,
               (u.created_at AT TIME ZONE 'UTC') < t.created_at AS user_first
        FROM "task" t JOIN "user" u ON u.id = t.created_by WHERE t.id = ${taskId}`);
      expect(row).toEqual({ same_instant: true, user_first: true });
    });
  });

  it('control: the implicit cast on the same Jakarta connection is off by the zone offset', async () => {
    // Without AT TIME ZONE the naive 09:00 is read as 09:00+07 (= 02:00Z), so the gap grows from 1h to 8h.
    // If this ever equals 01:00:00 the session zone is no longer being honored and the proof above is void.
    await inZone(SESSION_ZONE, async (tx, { taskId }) => {
      const [row] = await implicitGap(tx, taskId);
      expect(row.gap).toBe('08:00:00');
    });
  });

  it('the explicit form returns the same answer under UTC and under Jakarta', async () => {
    const gaps: string[] = [];
    for (const zone of ['UTC', SESSION_ZONE]) {
      await inZone(zone, async (tx, { taskId }) => {
        gaps.push((await explicitGap(tx, taskId))[0].gap);
      });
    }
    expect(gaps).toEqual(['01:00:00', '01:00:00']);
  });
});
