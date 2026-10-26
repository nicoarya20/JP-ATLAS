import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { db } from '../../server/db';

// Proves migration 0023 (P14 CU-01, §5): it is the one migration that throws rows away on purpose, so
// "copy first, drop last" has to be shown, not assumed (P14 §8 R2). The pre-0023 state is rebuilt by
// hand inside a transaction that is always rolled back, so the shared test DB is never changed.
const MIGRATIONS = path.join(import.meta.dir, '../../server/db/migrations');
const ROLLBACK = path.join(import.meta.dir, '../../server/db/rollback');

const statementsOf = (file: string) =>
  readFileSync(file, 'utf8')
    .split('--> statement-breakpoint')
    .filter((chunk) => chunk.replace(/^\s*--.*$/gm, '').trim().length > 0);

const MIGRATION = statementsOf(path.join(MIGRATIONS, '0023_leave_period.sql'));
// The rollback is the only way back to the pre-0023 shape, so the test reuses it and checks it at once.
const DOWN = statementsOf(path.join(ROLLBACK, '0023_leave_period.down.sql'));

const PG_CHECK_VIOLATION = '23514';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
class Rollback extends Error {}

const exec = (tx: Tx, text: string) => tx.execute(sql.raw(text));

async function rows<T>(tx: Tx, text: string): Promise<T[]> {
  return [...(await exec(tx, text))] as T[];
}

/** SQLSTATE of a failed query; drizzle wraps the driver error in `cause`. */
function sqlState(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err.cause?.code ?? err.code;
}

/** Runs `text` in a savepoint and returns its SQLSTATE, so the outer transaction survives the failure. */
async function failureCode(tx: Tx, text: string): Promise<string | undefined> {
  try {
    await tx.transaction(async (sp) => {
      await exec(sp, text);
    });
  } catch (e) {
    return sqlState(e);
  }
  return undefined;
}

/** Runs `fn` in a transaction that is always rolled back, so the shared test DB never changes. */
async function inRolledBackTx(fn: (tx: Tx) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // Guarded statements raise "already exists, skipping" NOTICEs on a re-run; that is expected here.
      await exec(tx, 'SET LOCAL client_min_messages = warning');
      await fn(tx);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

const APPLICANT = `p14-applicant-${crypto.randomUUID()}`;
const DECIDER = `p14-decider-${crypto.randomUUID()}`;

/** One request per status, so the copy rule can be read off the result. */
const SEED = [
  { key: 'approved-with-decider', status: 'approved', start: '2026-10-14', end: '2026-10-16' },
  { key: 'approved-auto', status: 'approved', start: '2026-09-01', end: '2026-09-03' },
  { key: 'pending', status: 'pending', start: '2026-11-01', end: '2026-11-02' },
  { key: 'rejected', status: 'rejected', start: '2026-08-01', end: '2026-08-02' },
  { key: 'canceled', status: 'canceled', start: '2026-07-01', end: '2026-07-02' },
] as const;

/** Back to the pre-0023 shape: `leave_request` and the approval switch return, `leave_period` goes. */
async function resetToPre0023(tx: Tx): Promise<void> {
  for (const stmt of DOWN) await exec(tx, stmt);
}

async function seedLegacyRequests(tx: Tx): Promise<void> {
  const user = (id: string, name: string) =>
    exec(
      tx,
      `INSERT INTO "user" ("id","name","email","email_verified","created_at","updated_at","approval_status")
       VALUES ('${id}','${name}','${id}@example.test',true,now(),now(),'approved')`,
    );
  await user(APPLICANT, 'Pemohon');
  await user(DECIDER, 'Penyetuju');
  for (const r of SEED) {
    // Only the first approved row has a decider: NULL there used to mean "approved automatically".
    const decider = r.key === 'approved-with-decider' ? `'${DECIDER}'` : 'NULL';
    await exec(
      tx,
      `INSERT INTO "leave_request"
         ("id","user_id","start_date","end_date","note","status","decided_by","decided_at","created_at","updated_at")
       VALUES ('${r.key}','${APPLICANT}','${r.start}','${r.end}','catatan ${r.key}','${r.status}',
               ${decider}, now(), now(), now())`,
    );
  }
}

const runMigration = async (tx: Tx) => {
  for (const stmt of MIGRATION) await exec(tx, stmt);
};

/** Pre-0023 state + legacy requests + 0023 run `runs` times, then `check`; always rolled back. */
const withMigrated = (runs: number, check: (tx: Tx) => Promise<void>) =>
  inRolledBackTx(async (tx) => {
    await resetToPre0023(tx);
    await seedLegacyRequests(tx);
    for (let i = 0; i < runs; i++) await runMigration(tx);
    await check(tx);
  });

interface PeriodRow {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  note: string | null;
  created_by: string | null;
}
const periodsOf = (tx: Tx) =>
  rows<PeriodRow>(
    tx,
    `SELECT "id","user_id","start_date"::text,"end_date"::text,"note","created_by"
     FROM "leave_period" WHERE "user_id" = '${APPLICANT}' ORDER BY "id"`,
  );

const tableExists = async (tx: Tx, name: string) =>
  (await rows<{ t: string | null }>(tx, `SELECT to_regclass('public.${name}') AS t`))[0].t !== null;

const columnExists = async (tx: Tx, table: string, column: string) =>
  (
    await rows<{ n: number }>(
      tx,
      `SELECT count(*)::int AS n FROM information_schema.columns
       WHERE table_name = '${table}' AND column_name = '${column}'`,
    )
  )[0].n === 1;

describe('migration 0023 leave_period', () => {
  test('canary: the pre-0023 state really has leave_request and the approval switch', async () => {
    await inRolledBackTx(async (tx) => {
      await resetToPre0023(tx);
      expect(await tableExists(tx, 'leave_request')).toBe(true);
      expect(await tableExists(tx, 'leave_period')).toBe(false);
      expect(await columnExists(tx, 'app_setting', 'leave_requires_approval')).toBe(true);
    });
  });

  test('approved requests move across, keeping range and note', async () => {
    await withMigrated(1, async (tx) => {
      const moved = await periodsOf(tx);
      expect(moved.map((p) => p.id)).toEqual(['approved-auto', 'approved-with-decider']);
      expect(moved.map((p) => [p.start_date, p.end_date])).toEqual([
        ['2026-09-01', '2026-09-03'],
        ['2026-10-14', '2026-10-16'],
      ]);
      expect(moved.map((p) => p.note)).toEqual([
        'catatan approved-auto',
        'catatan approved-with-decider',
      ]);
    });
  });

  test('created_by is filled from decided_by, and stays NULL when nobody decided', async () => {
    await withMigrated(1, async (tx) => {
      const byId = new Map((await periodsOf(tx)).map((p) => [p.id, p.created_by]));
      expect(byId.get('approved-with-decider')).toBe(DECIDER);
      expect(byId.get('approved-auto')).toBeNull();
    });
  });

  test('pending, rejected and canceled requests are left behind on purpose (P14 §5)', async () => {
    await withMigrated(1, async (tx) => {
      const ids = (await periodsOf(tx)).map((p) => p.id);
      expect(ids).not.toContain('pending');
      expect(ids).not.toContain('rejected');
      expect(ids).not.toContain('canceled');
      expect(ids).toHaveLength(2);
    });
  });

  test('the old table and the approval switch are gone afterwards', async () => {
    await withMigrated(1, async (tx) => {
      expect(await tableExists(tx, 'leave_request')).toBe(false);
      expect(await columnExists(tx, 'app_setting', 'leave_requires_approval')).toBe(false);
    });
  });

  test('leave_period has no status column: a row that exists is a leave that holds', async () => {
    await withMigrated(1, async (tx) => {
      expect(await columnExists(tx, 'leave_period', 'status')).toBe(false);
      expect(await columnExists(tx, 'leave_period', 'reject_reason')).toBe(false);
      expect(await columnExists(tx, 'leave_period', 'decided_by')).toBe(false);
    });
  });

  test('end_date before start_date is refused by the CHECK', async () => {
    await withMigrated(1, async (tx) => {
      const code = await failureCode(
        tx,
        `INSERT INTO "leave_period" ("id","user_id","start_date","end_date")
         VALUES ('p14-backwards','${APPLICANT}','2026-10-16','2026-10-14')`,
      );
      expect(code).toBe(PG_CHECK_VIOLATION);
    });
  });

  test('running it twice copies nothing twice and raises nothing', async () => {
    await withMigrated(2, async (tx) => {
      expect((await periodsOf(tx)).map((p) => p.id)).toEqual([
        'approved-auto',
        'approved-with-decider',
      ]);
    });
  });

  test('the rollback brings leave_request back with the periods as approved requests', async () => {
    await inRolledBackTx(async (tx) => {
      await resetToPre0023(tx);
      await seedLegacyRequests(tx);
      await runMigration(tx);
      for (const stmt of DOWN) await exec(tx, stmt);
      const back = await rows<{ id: string; status: string; decided_by: string | null }>(
        tx,
        `SELECT "id","status","decided_by" FROM "leave_request"
         WHERE "user_id" = '${APPLICANT}' ORDER BY "id"`,
      );
      expect(back.map((r) => r.id)).toEqual(['approved-auto', 'approved-with-decider']);
      expect(back.every((r) => r.status === 'approved')).toBe(true);
      expect(back.find((r) => r.id === 'approved-with-decider')?.decided_by).toBe(DECIDER);
      expect(await tableExists(tx, 'leave_period')).toBe(false);
      expect(await columnExists(tx, 'app_setting', 'leave_requires_approval')).toBe(true);
    });
  });
});

// The notification sweep, added to 0023 on 26 Okt 2026: the leftover approval cards must stop asking
// for an answer without becoming unreadable. Same rolled-back transaction as the rest of this file.
const RECIPIENT = APPLICANT;
/** Pinned in the past: the news lane is ordered by `updated_at`, so the sweep must not move it. */
const SEEDED_AT = '2026-09-20 03:00:00+00';

/** One row per case the sweep has to tell apart; `resolved` is NULL for a row still waiting. */
const NOTIFICATIONS = [
  { id: 'stuck-request', kind: 'leave_requested', lane: 'action', resolved: null },
  // Closed by the old emit.leave.ts before 0023; the sweep must leave its reason alone.
  { id: 'already-closed', kind: 'leave_requested', lane: 'action', resolved: 'acted' },
  { id: 'old-decided', kind: 'leave_decided', lane: 'info', resolved: null },
  // Scope guards: a live work card and the kind that replaced the two above.
  { id: 'live-task', kind: 'task_assigned', lane: 'action', resolved: null },
  { id: 'recorded', kind: 'leave_recorded', lane: 'info', resolved: null },
] as const;

async function seedNotifications(tx: Tx): Promise<void> {
  for (const n of NOTIFICATIONS) {
    const resolvedAt = n.resolved ? `'${SEEDED_AT}'` : 'NULL';
    const reason = n.resolved ? `'${n.resolved}'` : 'NULL';
    await exec(
      tx,
      `INSERT INTO "notification"
         ("id","recipient_id","actor_id","project_id","lane","kind","ref_type","ref_id","dedupe_key",
          "bundle_count","payload","resolved_at","resolved_reason","created_at","updated_at")
       VALUES ('${n.id}','${RECIPIENT}','${DECIDER}',NULL,'${n.lane}','${n.kind}','leave','${n.id}',
               '${n.kind}:leave:${n.id}',1,'{}'::jsonb,${resolvedAt},${reason},
               '${SEEDED_AT}','${SEEDED_AT}')`,
    );
  }
}

interface NotifRow {
  id: string;
  lane: string;
  resolved_reason: string | null;
  resolved: boolean;
  moved: boolean;
}

/** Pre-0023 state + the seeded cards + 0023 run `runs` times, then the cards read back; always rolled back. */
async function sweptRows(runs: number): Promise<Map<string, NotifRow>> {
  const byId = new Map<string, NotifRow>();
  await inRolledBackTx(async (tx) => {
    await resetToPre0023(tx);
    await seedLegacyRequests(tx);
    await seedNotifications(tx);
    for (let i = 0; i < runs; i++) await runMigration(tx);
    const read = await rows<NotifRow>(
      tx,
      `SELECT "id","lane","resolved_reason",
              ("resolved_at" IS NOT NULL) AS resolved,
              ("updated_at" <> '${SEEDED_AT}') AS moved
       FROM "notification" WHERE "recipient_id" = '${RECIPIENT}' ORDER BY "id"`,
    );
    for (const r of read) byId.set(r.id, r);
  });
  return byId;
}

describe('migration 0023 sweeps the retired leave notifications', () => {
  test('canary: the stuck approval card really is open work before the sweep runs', async () => {
    await inRolledBackTx(async (tx) => {
      await resetToPre0023(tx);
      await seedLegacyRequests(tx);
      await seedNotifications(tx);
      const open = await rows<{ n: number }>(
        tx,
        `SELECT count(*)::int AS n FROM "notification"
         WHERE "recipient_id" = '${RECIPIENT}' AND "lane" = 'action' AND "resolved_at" IS NULL`,
      );
      // 'stuck-request' and 'live-task'; 'already-closed' is resolved already.
      expect(open[0].n).toBe(2);
    });
  });

  test('the leftover approval card is resolved and moves to the news lane', async () => {
    const byId = await sweptRows(1);
    const stuck = byId.get('stuck-request');
    expect(stuck?.resolved).toBe(true);
    expect(stuck?.resolved_reason).toBe('elsewhere');
    // Resolved alone would hide it from both tabs; as news it still reads as a card (CU-06 R3).
    expect(stuck?.lane).toBe('info');
  });

  test('an old outcome card is resolved too and stays in the news lane', async () => {
    const byId = await sweptRows(1);
    expect(byId.get('old-decided')?.resolved).toBe(true);
    expect(byId.get('old-decided')?.resolved_reason).toBe('elsewhere');
    expect(byId.get('old-decided')?.lane).toBe('info');
  });

  test('updated_at is left alone, so a swept card does not jump to the top of the news lane', async () => {
    const byId = await sweptRows(1);
    expect(byId.get('stuck-request')?.moved).toBe(false);
    expect(byId.get('old-decided')?.moved).toBe(false);
  });

  test('cards of other kinds are untouched: live work stays work, leave_recorded stays open', async () => {
    const byId = await sweptRows(1);
    expect(byId.get('live-task')?.resolved).toBe(false);
    expect(byId.get('live-task')?.lane).toBe('action');
    expect(byId.get('recorded')?.resolved).toBe(false);
  });

  test('a leave card the app had already closed keeps its own reason', async () => {
    const byId = await sweptRows(1);
    expect(byId.get('already-closed')?.resolved_reason).toBe('acted');
    expect(byId.get('already-closed')?.lane).toBe('action');
  });

  test('running the sweep twice changes nothing the first run did not', async () => {
    const once = await sweptRows(1);
    const twice = await sweptRows(2);
    expect([...twice.values()]).toEqual([...once.values()]);
  });

  test('nothing is left waiting for an answer on a retired leave kind', async () => {
    const byId = await sweptRows(1);
    const stillWaiting = [...byId.values()].filter((r) => r.lane === 'action' && !r.resolved);
    expect(stillWaiting.map((r) => r.id)).toEqual(['live-task']);
  });
});
