import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { GUARDED_FROM, splitStatements } from '../../scripts/db-generate.rewrite';
import { db } from '../../server/db';

const MIGRATIONS_DIR = path.join(import.meta.dir, '../../server/db/migrations');

/**
 * Migrations known NOT to survive a re-run, keyed by journal idx with the reason. Empty on purpose:
 * R14 §3.1 wants "safe to re-run on prod" proven, so an entry here must be justified, never silent.
 */
const KNOWN_NON_IDEMPOTENT: Record<number, string> = {};

class Rollback extends Error {}

/** Same journal read the drizzle migrator does; kept inline because tests may not depend on server code paths. */
function guardedMigrations(): { idx: number; tag: string; statements: string[] }[] {
  const journal = JSON.parse(readFileSync(path.join(MIGRATIONS_DIR, 'meta/_journal.json'), 'utf8'));
  return (journal.entries as { idx: number; tag: string }[])
    .filter((e) => e.idx >= GUARDED_FROM)
    .map((e) => ({
      ...e,
      statements: readFileSync(path.join(MIGRATIONS_DIR, `${e.tag}.sql`), 'utf8')
        .split('--> statement-breakpoint')
        .filter((chunk) => splitStatements(chunk).length > 0),
    }));
}

/** Runs the statements in one transaction and always rolls back, so the shared test DB is never changed. */
async function replayRolledBack(statements: string[]): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // Guarded statements report "already exists, skipping" as NOTICEs; they are the expected outcome here.
      await tx.execute(sql.raw('SET LOCAL client_min_messages = warning'));
      for (const stmt of statements) await tx.execute(sql.raw(stmt));
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

const migrations = guardedMigrations();
const checked = migrations.filter((m) => !(m.idx in KNOWN_NON_IDEMPOTENT));

test('replaying every guarded migration on an already-migrated DB changes nothing and raises no error', async () => {
  const statements = checked.flatMap((m) => m.statements);
  try {
    await replayRolledBack(statements);
  } catch (e) {
    throw new Error(`Migrasi tidak idempoten saat dijalankan ulang: ${(e as Error).message}`);
  }
  expect(statements.length).toBeGreaterThan(0);
});

test('canary: an unguarded CREATE TABLE on an existing table does fail the replay', async () => {
  // Proves replayRolledBack really reports non-idempotent SQL instead of swallowing it.
  await expect(replayRolledBack(['CREATE TABLE "audit_log" ("id" text)'])).rejects.toThrow();
});

test('canary: the replay leaves no trace (rolled back)', async () => {
  await replayRolledBack(['CREATE TABLE "idem_probe_tmp" ("id" text)']);
  const rows = await db.execute(sql`SELECT to_regclass('public.idem_probe_tmp') AS t`);
  expect(rows[0]?.t).toBeNull();
});

for (const [idx, reason] of Object.entries(KNOWN_NON_IDEMPOTENT)) {
  test(`exception for migration ${idx} still applies: ${reason}`, async () => {
    const m = migrations.find((x) => x.idx === Number(idx));
    await expect(replayRolledBack(m?.statements ?? [])).rejects.toThrow();
  });
}
