import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { db, schema } from '../../server/db';
import { introspectDrizzleSchema } from '../../server/db/schema-introspect';
import { schemaStats } from '../../server/db/schema-stats';
import { testUser } from '../support/accounts';

// Proves migration 0016 (S0B-06): idempotent, creates the five task tables, FKs cascade/null/restrict as
// designed, rollback undoes it. Every test runs in a transaction that is rolled back, so the test DB is unchanged.
const TAG = '0016_task_core';
const MIGRATIONS_DIR = path.join(import.meta.dir, '../../server/db/migrations');
const MIGRATION = path.join(MIGRATIONS_DIR, `${TAG}.sql`);
const ROLLBACK = path.join(import.meta.dir, `../../server/db/rollback/${TAG}.down.sql`);

const STATEMENTS = readFileSync(MIGRATION, 'utf8')
  .split('--> statement-breakpoint')
  .filter((chunk) => chunk.replace(/^\s*--.*$/gm, '').trim().length > 0);
const DOWN_STATEMENTS = readFileSync(ROLLBACK, 'utf8')
  .split('\n')
  .filter((line) => !line.startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

const TABLES = ['task', 'task_kind', 'task_checklist_item', 'task_comment', 'task_activity'];
const PM_TABLES = ['project', 'project_member', 'project_activity', ...TABLES];
const INDEXES = [
  'task_number_uidx',
  'task_project_id_status_idx',
  'task_assignee_id_status_due_date_idx',
  'task_project_id_reviewer_id_idx',
  'task_deleted_at_idx',
  'task_deleted_with_project_id_idx',
  'task_kind_project_id_name_uidx',
  'task_checklist_item_task_id_position_idx',
  'task_comment_task_id_created_at_idx',
  'task_activity_task_id_created_at_idx',
];
const CHECKS = [
  'task_status_check',
  'task_priority_check',
  'task_cancel_category_check',
  'task_due_after_start_check',
  'task_reviewer_not_assignee_check',
  'task_canceled_needs_category_check',
  'task_other_needs_note_check',
  'task_counters_check',
  'task_kind_base_kind_check',
];
const PG_CHECK_VIOLATION = '23514';
const PG_UNIQUE_VIOLATION = '23505';
const PG_FK_VIOLATION = '23503';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
class Rollback extends Error {}

const exec = (tx: Tx, text: string) => tx.execute(sql.raw(text));
const inList = (names: string[]) => names.map((n) => `'${n}'`).join(',');

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
  for (const stmt of DOWN_STATEMENTS) await exec(tx, stmt);
};

const listNames = async (tx: Tx, query: string) =>
  (await rows<{ name: string }>(tx, query)).map((r) => r.name).sort();

const existingTables = (tx: Tx) =>
  listNames(
    tx,
    `SELECT table_name AS name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN (${inList(TABLES)})`,
  );
const existingIndexes = (tx: Tx) =>
  listNames(
    tx,
    `SELECT indexname AS name FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (${inList(INDEXES)})`,
  );
const existingChecks = (tx: Tx) =>
  listNames(
    tx,
    `SELECT conname AS name FROM pg_constraint WHERE contype = 'c' AND conname IN (${inList(CHECKS)})`,
  );
const existingSequences = (tx: Tx) =>
  listNames(
    tx,
    `SELECT sequencename AS name FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'task_number_seq'`,
  );

const count = async (tx: Tx, table: string, where: string) =>
  Number(
    (await rows<{ n: string }>(tx, `SELECT count(*) AS n FROM "${table}" WHERE ${where}`))[0].n,
  );

/** Runs one statement in a savepoint and returns the Postgres error code + constraint it raised. */
async function violation(tx: Tx, text: string) {
  try {
    await tx.transaction((sp) => exec(sp, text));
  } catch (e) {
    const cause = ((e as { cause?: unknown }).cause ?? e) as {
      code?: string;
      constraint_name?: string;
    };
    return { code: cause.code, constraint: cause.constraint_name };
  }
  throw new Error(`statement was accepted but should have been rejected: ${text}`);
}

/** Seeds a project with one kind and a fully populated task (creator, assignee, reviewer, detail rows). */
async function seedTask(tx: Tx) {
  const creator = testUser();
  const assignee = testUser();
  const reviewer = testUser();
  await tx.insert(schema.user).values([creator, assignee, reviewer]);
  const [project] = await tx
    .insert(schema.project)
    .values({ name: 'Proyek uji', createdBy: creator.id }) // test-only
    .returning();
  const [kind] = await tx
    .insert(schema.taskKind)
    .values({ projectId: project.id, name: 'Tugas', baseKind: 'task', position: 0 }) // test-only
    .returning();
  const [task] = await tx
    .insert(schema.task)
    .values({
      projectId: project.id,
      kindId: kind.id,
      title: 'Tugas uji', // test-only
      createdBy: creator.id,
      assigneeId: assignee.id,
      reviewerId: reviewer.id,
    })
    .returning();
  await tx.insert(schema.taskChecklistItem).values({
    taskId: task.id,
    text: 'Langkah uji', // test-only
    position: 0,
    doneBy: assignee.id,
  });
  await tx
    .insert(schema.taskComment)
    .values({ taskId: task.id, authorId: assignee.id, authorName: 'Test User', body: 'Halo' }); // test-only
  await tx.insert(schema.taskActivity).values({
    taskId: task.id,
    actorId: creator.id,
    actorName: 'Test User',
    action: 'task.created',
  });
  return { creator, assignee, reviewer, project, kind, task };
}

describe('migration 0016 task_core', () => {
  test('creates the 5 tables, 10 indexes, 9 CHECK constraints and the task_number_seq identity', async () => {
    await inRolledBackTx(async (tx) => {
      expect(await existingTables(tx)).toEqual([...TABLES].sort());
      expect(await existingIndexes(tx)).toEqual([...INDEXES].sort());
      expect(await existingChecks(tx)).toEqual([...CHECKS].sort());
      expect(await existingSequences(tx)).toEqual(['task_number_seq']);
    });
  });

  test('re-running every statement on a migrated DB raises no error and changes nothing', async () => {
    await inRolledBackTx(async (tx) => {
      const before = await rows<{ last_value: string | null }>(
        tx,
        `SELECT last_value FROM pg_sequences WHERE sequencename = 'task_number_seq'`,
      );
      await runMigration(tx);
      await runMigration(tx);
      expect(await existingTables(tx)).toEqual([...TABLES].sort());
      expect(await existingIndexes(tx)).toEqual([...INDEXES].sort());
      expect(await existingChecks(tx)).toEqual([...CHECKS].sort());
      // The identity lives inside CREATE TABLE IF NOT EXISTS, so a re-run must not reset or recreate it.
      expect(
        await rows(
          tx,
          `SELECT last_value FROM pg_sequences WHERE sequencename = 'task_number_seq'`,
        ),
      ).toEqual(before);
    });
  });

  test('rollback script removes everything, is itself re-runnable, and 0016 rebuilds it from scratch', async () => {
    await inRolledBackTx(async (tx) => {
      await runRollback(tx);
      await runRollback(tx);
      expect(await existingTables(tx)).toEqual([]);
      expect(await existingIndexes(tx)).toEqual([]);
      expect(await existingChecks(tx)).toEqual([]);
      expect(await existingSequences(tx)).toEqual([]);
      // The project tables belong to 0015 and must survive a 0016 rollback.
      expect(
        await listNames(
          tx,
          `SELECT table_name AS name FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name IN ('project','project_member','project_activity')`,
        ),
      ).toEqual(['project', 'project_activity', 'project_member']);

      await runMigration(tx);
      expect(await existingTables(tx)).toEqual([...TABLES].sort());
      expect(await existingIndexes(tx)).toEqual([...INDEXES].sort());
      expect(await existingChecks(tx)).toEqual([...CHECKS].sort());
      expect(await existingSequences(tx)).toEqual(['task_number_seq']);
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

  test('two tasks of the same project receive increasing numbers', async () => {
    await inRolledBackTx(async (tx) => {
      const { project, kind } = await seedTask(tx);
      const [second] = await tx
        .insert(schema.task)
        .values({ projectId: project.id, kindId: kind.id, title: 'Tugas kedua' }) // test-only
        .returning({ number: schema.task.number });
      const numbers = await rows<{ number: string }>(
        tx,
        `SELECT "number" FROM "task" WHERE "project_id" = '${project.id}' ORDER BY "created_at", "number"`,
      );
      expect(numbers).toHaveLength(2);
      expect(Number(numbers[0].number)).toBeGreaterThan(0);
      expect(Number(numbers[1].number)).toBeGreaterThan(Number(numbers[0].number));
      expect(second.number).toBe(Number(numbers[1].number));
    });
  });

  test('deleting a project cascades to its tasks, kinds, checklist, comments and activity', async () => {
    await inRolledBackTx(async (tx) => {
      const { project, task } = await seedTask(tx);
      const byTask = `"task_id" = '${task.id}'`;
      expect(await count(tx, 'task', `"project_id" = '${project.id}'`)).toBe(1);
      expect(await count(tx, 'task_checklist_item', byTask)).toBe(1);
      expect(await count(tx, 'task_comment', byTask)).toBe(1);
      expect(await count(tx, 'task_activity', byTask)).toBe(1);

      // One statement removes tasks and kinds together; NO ACTION is checked at statement end, so it passes.
      await exec(tx, `DELETE FROM "project" WHERE "id" = '${project.id}'`);

      expect(await count(tx, 'task', `"id" = '${task.id}'`)).toBe(0);
      expect(await count(tx, 'task_kind', `"project_id" = '${project.id}'`)).toBe(0);
      expect(await count(tx, 'task_checklist_item', byTask)).toBe(0);
      expect(await count(tx, 'task_comment', byTask)).toBe(0);
      expect(await count(tx, 'task_activity', byTask)).toBe(0);
    });
  });

  test('deleting a task_kind that a task still uses is rejected (NO ACTION)', async () => {
    await inRolledBackTx(async (tx) => {
      const { kind } = await seedTask(tx);
      const err = await violation(tx, `DELETE FROM "task_kind" WHERE "id" = '${kind.id}'`);
      expect(err.code).toBe(PG_FK_VIOLATION);
      expect(err.constraint).toBe('task_kind_id_task_kind_id_fk');
      expect(await count(tx, 'task_kind', `"id" = '${kind.id}'`)).toBe(1);
    });
  });

  test('deleting users nulls task.created_by/assignee_id/reviewer_id and keeps the task and its history', async () => {
    await inRolledBackTx(async (tx) => {
      const { creator, assignee, reviewer, task } = await seedTask(tx);

      await exec(
        tx,
        `DELETE FROM "user" WHERE "id" IN ('${creator.id}','${assignee.id}','${reviewer.id}')`,
      );

      const [row] = await rows<{
        created_by: string | null;
        assignee_id: string | null;
        reviewer_id: string | null;
      }>(
        tx,
        `SELECT "created_by","assignee_id","reviewer_id" FROM "task" WHERE "id" = '${task.id}'`,
      );
      expect(row).toEqual({ created_by: null, assignee_id: null, reviewer_id: null });
      const [checklist] = await rows<{ done_by: string | null }>(
        tx,
        `SELECT "done_by" FROM "task_checklist_item" WHERE "task_id" = '${task.id}'`,
      );
      expect(checklist.done_by).toBeNull();
      // Comments and activity outlive the account and keep a readable name.
      const [comment] = await rows<{ author_id: string | null; author_name: string }>(
        tx,
        `SELECT "author_id","author_name" FROM "task_comment" WHERE "task_id" = '${task.id}'`,
      );
      expect(comment).toEqual({ author_id: null, author_name: 'Test User' });
      const [activity] = await rows<{ actor_id: string | null; actor_name: string }>(
        tx,
        `SELECT "actor_id","actor_name" FROM "task_activity" WHERE "task_id" = '${task.id}'`,
      );
      expect(activity).toEqual({ actor_id: null, actor_name: 'Test User' });
    });
  });

  test('every CHECK constraint rejects a wild value and accepts the matching valid one', async () => {
    await inRolledBackTx(async (tx) => {
      const { project, creator, task } = await seedTask(tx);
      const update = (set: string) => `UPDATE "task" SET ${set} WHERE "id" = '${task.id}'`;
      const insertKind = (base: string) =>
        `INSERT INTO "task_kind" ("id","project_id","name","base_kind","position")
         VALUES ('k-${crypto.randomUUID()}','${project.id}','Jenis ${crypto.randomUUID()}','${base}',1)`;

      const rejected: [string, string][] = [
        ['task_status_check', update(`"status" = 'bogus'`)],
        ['task_priority_check', update(`"priority" = 'urgent'`)],
        ['task_cancel_category_check', update(`"cancel_category" = 'bogus'`)],
        [
          'task_due_after_start_check',
          update(`"start_date" = '2026-06-10', "due_date" = '2026-06-09'`),
        ],
        ['task_reviewer_not_assignee_check', update(`"reviewer_id" = "assignee_id"`)],
        ['task_canceled_needs_category_check', update(`"status" = 'canceled'`)],
        ['task_other_needs_note_check', update(`"cancel_category" = 'other'`)],
        ['task_counters_check', update(`"reopen_count" = -1`)],
        ['task_counters_check', update(`"return_count" = -1`)],
        ['task_kind_base_kind_check', insertKind('bogus')],
      ];
      for (const [constraint, statement] of rejected) {
        expect(await violation(tx, statement)).toEqual({ code: PG_CHECK_VIOLATION, constraint });
      }

      // The same columns accept their valid values, so a rejection above is the CHECK and not a typo.
      await exec(
        tx,
        update(`"status" = 'canceled', "cancel_category" = 'other', "cancel_note" = 'alasan'`),
      );
      await exec(tx, update(`"start_date" = '2026-06-10', "due_date" = '2026-06-10'`));
      await exec(tx, update(`"reviewer_id" = '${creator.id}'`));
      await exec(tx, insertKind('idea'));
    });
  });

  test('task numbers and kind names per project are unique', async () => {
    await inRolledBackTx(async (tx) => {
      const { project, kind, task } = await seedTask(tx);
      const [{ number }] = await rows<{ number: string }>(
        tx,
        `SELECT "number" FROM "task" WHERE "id" = '${task.id}'`,
      );
      const dupNumber = await violation(
        tx,
        `INSERT INTO "task" ("id","project_id","kind_id","title","number")
         VALUES ('t-${crypto.randomUUID()}','${project.id}','${kind.id}','Dobel',${number})`,
      );
      expect(dupNumber).toEqual({ code: PG_UNIQUE_VIOLATION, constraint: 'task_number_uidx' });

      // Case-insensitive: "TUGAS" collides with the existing "Tugas".
      const dupKind = await violation(
        tx,
        `INSERT INTO "task_kind" ("id","project_id","name","base_kind","position")
         VALUES ('k-${crypto.randomUUID()}','${project.id}','TUGAS','task',1)`,
      );
      expect(dupKind).toEqual({
        code: PG_UNIQUE_VIOLATION,
        constraint: 'task_kind_project_id_name_uidx',
      });
    });
  });

  test('db-schema introspection lists the 8 PM tables and schemaStats can count every one', async () => {
    const names = introspectDrizzleSchema().tables.map((t) => t.id);
    for (const table of PM_TABLES) expect(names).toContain(table);
    // Before 0016 this threw 42P01 (undefined_table) for the task tables.
    const stats = await schemaStats(names);
    const byTable = new Map(stats.tables.map((t) => [t.table, t]));
    for (const table of PM_TABLES) expect(byTable.get(table)?.rows).toBeGreaterThanOrEqual(0);
    expect(stats.migrations.pending).toBe(0);
  });
});
