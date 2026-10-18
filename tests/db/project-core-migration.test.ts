import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { db, schema } from '../../server/db';
import { testUser } from '../support/accounts';

// Proves migration 0015 (S0B-03, P2): re-running it is harmless, it creates the three project tables with
// their indexes/CHECKs, the foreign keys cascade or null as designed, and the rollback script undoes it.
// Everything runs in a transaction that is always rolled back, so the shared test DB is never changed.
const TAG = '0015_project_core';
const MIGRATIONS_DIR = path.join(import.meta.dir, '../../server/db/migrations');
const MIGRATION = path.join(MIGRATIONS_DIR, `${TAG}.sql`);
const ROLLBACK = path.join(import.meta.dir, `../../server/db/rollback/${TAG}.down.sql`);

const STATEMENTS = readFileSync(MIGRATION, 'utf8')
  .split('--> statement-breakpoint')
  .filter((chunk) => chunk.replace(/^\s*--.*$/gm, '').trim().length > 0);
const downStatements = (file: string) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => !line.startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
const DOWN_STATEMENTS = downStatements(ROLLBACK);
// Migrations are rolled back newest first: 0017's `notification` and 0016's `task` tables both reference
// `project`, so their rollbacks must run before it (a later migration that points at `project` joins this list).
const DEPENDENT_DOWN_STATEMENTS = ['0017_notification_core', '0016_task_core'].flatMap((tag) =>
  downStatements(path.join(import.meta.dir, `../../server/db/rollback/${tag}.down.sql`)),
);

const TABLES = ['project', 'project_member', 'project_activity'];
const INDEXES = [
  'project_status_due_date_idx',
  'project_deleted_at_idx',
  'project_member_user_id_idx',
  'project_activity_project_id_created_at_idx',
];
const CHECKS = [
  'project_status_check',
  'project_priority_check',
  'project_due_after_start_check',
  'project_member_role_check',
];

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
class Rollback extends Error {}

const exec = (tx: Tx, text: string) => tx.execute(sql.raw(text));

/** Rows of a raw query, typed by the caller. */
async function rows<T>(tx: Tx, text: string): Promise<T[]> {
  return [...(await exec(tx, text))] as T[];
}

/** Runs `fn` in a transaction that is always rolled back, so the shared test DB never changes. */
async function inRolledBackTx(fn: (tx: Tx) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // Guarded statements raise "already exists, skipping" NOTICEs on a re-run; that is the expected outcome.
      await exec(tx, 'SET LOCAL client_min_messages = warning');
      await fn(tx);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

const runMigration = async (tx: Tx) => {
  for (const stmt of STATEMENTS) await exec(tx, stmt);
};
const runRollback = async (tx: Tx) => {
  for (const stmt of [...DEPENDENT_DOWN_STATEMENTS, ...DOWN_STATEMENTS]) await exec(tx, stmt);
};

const listNames = async (tx: Tx, query: string) =>
  (await rows<{ name: string }>(tx, query)).map((r) => r.name).sort();

const existingTables = (tx: Tx) =>
  listNames(
    tx,
    `SELECT table_name AS name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('project','project_member','project_activity')`,
  );
const existingIndexes = (tx: Tx) =>
  listNames(
    tx,
    `SELECT indexname AS name FROM pg_indexes WHERE schemaname = 'public'
     AND indexname IN (${INDEXES.map((i) => `'${i}'`).join(',')})`,
  );
const existingChecks = (tx: Tx) =>
  listNames(
    tx,
    `SELECT conname AS name FROM pg_constraint
     WHERE contype = 'c' AND conname IN (${CHECKS.map((c) => `'${c}'`).join(',')})`,
  );

const count = async (tx: Tx, table: string, where: string) =>
  Number(
    (await rows<{ n: string }>(tx, `SELECT count(*) AS n FROM "${table}" WHERE ${where}`))[0].n,
  );

/** Inserts one user, one project led by and created by that user, plus a member and an activity row. */
async function seedProject(tx: Tx) {
  const owner = testUser();
  const projectId = `test-project-${crypto.randomUUID()}`;
  await tx.insert(schema.user).values(owner);
  await tx.insert(schema.project).values({
    id: projectId,
    name: 'Proyek uji', // test-only
    leadId: owner.id,
    createdBy: owner.id,
  });
  await tx
    .insert(schema.projectMember)
    .values({ projectId, userId: owner.id, role: 'manager', addedBy: owner.id });
  await tx
    .insert(schema.projectActivity)
    .values({ projectId, actorId: owner.id, actorName: 'Test User', action: 'project.created' });
  return { ownerId: owner.id, projectId };
}

describe('migration 0015 project_core', () => {
  test('creates the 3 tables, 4 indexes and 4 CHECK constraints', async () => {
    await inRolledBackTx(async (tx) => {
      expect(await existingTables(tx)).toEqual([...TABLES].sort());
      expect(await existingIndexes(tx)).toEqual([...INDEXES].sort());
      expect(await existingChecks(tx)).toEqual([...CHECKS].sort());
    });
  });

  test('re-running every statement on a migrated DB raises no error and changes nothing', async () => {
    await inRolledBackTx(async (tx) => {
      await runMigration(tx);
      await runMigration(tx);
      expect(await existingTables(tx)).toEqual([...TABLES].sort());
      expect(await existingIndexes(tx)).toEqual([...INDEXES].sort());
      expect(await existingChecks(tx)).toEqual([...CHECKS].sort());
    });
  });

  test('rollback script removes everything, is itself re-runnable, and 0015 rebuilds it from scratch', async () => {
    await inRolledBackTx(async (tx) => {
      await runRollback(tx);
      await runRollback(tx);
      expect(await existingTables(tx)).toEqual([]);
      expect(await existingIndexes(tx)).toEqual([]);
      expect(await existingChecks(tx)).toEqual([]);

      await runMigration(tx);
      expect(await existingTables(tx)).toEqual([...TABLES].sort());
      expect(await existingIndexes(tx)).toEqual([...INDEXES].sort());
      expect(await existingChecks(tx)).toEqual([...CHECKS].sort());
    });
  });

  test('rollback script quotes the journal timestamp that the operator must delete', () => {
    const journal = JSON.parse(
      readFileSync(path.join(MIGRATIONS_DIR, 'meta/_journal.json'), 'utf8'),
    );
    const entry = (journal.entries as { tag: string; when: number }[]).find((e) => e.tag === TAG);
    expect(entry).toBeDefined();
    expect(readFileSync(ROLLBACK, 'utf8')).toContain(`created_at = ${entry?.when}`);
  });

  test('deleting a project cascades to project_member and project_activity', async () => {
    await inRolledBackTx(async (tx) => {
      const { projectId } = await seedProject(tx);
      const scope = `"project_id" = '${projectId}'`;
      expect(await count(tx, 'project_member', scope)).toBe(1);
      expect(await count(tx, 'project_activity', scope)).toBe(1);

      await exec(tx, `DELETE FROM "project" WHERE "id" = '${projectId}'`);

      expect(await count(tx, 'project_member', scope)).toBe(0);
      expect(await count(tx, 'project_activity', scope)).toBe(0);
    });
  });

  test('deleting a user nulls project.lead_id/created_by and keeps the project and its history', async () => {
    await inRolledBackTx(async (tx) => {
      const { ownerId, projectId } = await seedProject(tx);

      await exec(tx, `DELETE FROM "user" WHERE "id" = '${ownerId}'`);

      const [project] = await rows<{ lead_id: string | null; created_by: string | null }>(
        tx,
        `SELECT "lead_id","created_by" FROM "project" WHERE "id" = '${projectId}'`,
      );
      expect(project.lead_id).toBeNull();
      expect(project.created_by).toBeNull();
      // The account simply leaves the project; history survives with a readable actor_name.
      expect(await count(tx, 'project_member', `"project_id" = '${projectId}'`)).toBe(0);
      const [activity] = await rows<{ actor_id: string | null; actor_name: string }>(
        tx,
        `SELECT "actor_id","actor_name" FROM "project_activity" WHERE "project_id" = '${projectId}'`,
      );
      expect(activity.actor_id).toBeNull();
      expect(activity.actor_name).toBe('Test User');
    });
  });
});
