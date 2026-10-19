import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../../server/db';
import { testUser } from '../support/accounts';

// Proves migration 0019 (S5a-01): idempotent, creates the four plan tables and the single task.phase_id
// column, FKs null/cascade as designed, rollback undoes it. Every test runs in a transaction that is
// rolled back, so the shared test DB is unchanged.
const TAG = '0019_project_plan';
const MIGRATION = path.join(import.meta.dir, `../../server/db/migrations/${TAG}.sql`);
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

const TABLES = [
  'project_phase',
  'project_milestone',
  'project_deadline_extension',
  'project_condition_override',
];
const INDEXES = [
  'project_phase_project_id_position_idx',
  'project_milestone_project_id_due_date_idx',
  'project_deadline_extension_project_id_created_at_idx',
  'project_condition_override_project_id_created_at_idx',
  'task_phase_id_idx',
];
const CHECKS = [
  'project_phase_status_check',
  'project_phase_end_after_start_check',
  'project_deadline_extension_reason_category_check',
  'project_deadline_extension_later_check',
  'project_condition_override_condition_check',
];
const FKS = [
  'project_phase_project_id_project_id_fk',
  'project_milestone_project_id_project_id_fk',
  'project_milestone_phase_id_project_phase_id_fk',
  'project_deadline_extension_project_id_project_id_fk',
  'project_deadline_extension_extended_by_user_id_fk',
  'project_condition_override_project_id_project_id_fk',
  'project_condition_override_set_by_user_id_fk',
  'task_phase_id_project_phase_id_fk',
];
const PG_CHECK_VIOLATION = '23514';
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
const existingConstraints = (tx: Tx, type: 'c' | 'f', names: string[]) =>
  listNames(
    tx,
    `SELECT conname AS name FROM pg_constraint WHERE contype = '${type}' AND conname IN (${inList(names)})`,
  );
const taskPhaseColumns = (tx: Tx) =>
  rows<{ data_type: string; is_nullable: string }>(
    tx,
    `SELECT data_type, is_nullable FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'phase_id'`,
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

/** A project with one kind, one phase, one milestone, one extension, one override and a task in the phase. */
async function seedPlan(tx: Tx) {
  const creator = testUser();
  await tx.insert(schema.user).values(creator);
  const [project] = await tx
    .insert(schema.project)
    .values({ name: 'Proyek uji', createdBy: creator.id, dueDate: '2026-12-31' }) // test-only
    .returning();
  const [kind] = await tx
    .insert(schema.taskKind)
    .values({ projectId: project.id, name: 'Tugas', baseKind: 'task', position: 0 }) // test-only
    .returning();
  const [phase] = await tx
    .insert(schema.projectPhase)
    .values({ projectId: project.id, name: 'Persiapan', position: 0 }) // test-only
    .returning();
  const [milestone] = await tx
    .insert(schema.projectMilestone)
    .values({
      projectId: project.id,
      phaseId: phase.id,
      title: 'Rapat awal',
      dueDate: '2026-11-01',
    }) // test-only
    .returning();
  await tx.insert(schema.projectDeadlineExtension).values({
    projectId: project.id,
    oldDueDate: '2026-12-01',
    newDueDate: '2026-12-31',
    reasonCategory: 'scope_change',
    reason: 'Ada pekerjaan tambahan', // test-only
    extendedBy: creator.id,
  });
  await tx.insert(schema.projectConditionOverride).values({
    projectId: project.id,
    condition: 'at_risk',
    reason: 'Menunggu persetujuan klien', // test-only
    setBy: creator.id,
  });
  const [task] = await tx
    .insert(schema.task)
    .values({
      projectId: project.id,
      kindId: kind.id,
      phaseId: phase.id,
      title: 'Tugas uji', // test-only
      createdBy: creator.id,
    })
    .returning();
  return { creator, project, kind, phase, milestone, task };
}

describe('migration 0019 project_plan', () => {
  test('creates the 4 tables, 5 indexes, 5 CHECKs, 8 FKs and a nullable task.phase_id', async () => {
    await inRolledBackTx(async (tx) => {
      expect(await existingTables(tx)).toEqual([...TABLES].sort());
      expect(await existingIndexes(tx)).toEqual([...INDEXES].sort());
      expect(await existingConstraints(tx, 'c', CHECKS)).toEqual([...CHECKS].sort());
      expect(await existingConstraints(tx, 'f', FKS)).toEqual([...FKS].sort());
      expect(await taskPhaseColumns(tx)).toEqual([{ data_type: 'text', is_nullable: 'YES' }]);
    });
  });

  test('every new time column is timestamptz', async () => {
    await inRolledBackTx(async (tx) => {
      const bad = await rows<{ table_name: string; column_name: string; data_type: string }>(
        tx,
        `SELECT table_name, column_name, data_type FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name IN (${inList(TABLES)})
           AND data_type LIKE 'timestamp%' AND data_type <> 'timestamp with time zone'`,
      );
      expect(bad).toEqual([]);
    });
  });

  test('re-running every statement on a migrated DB raises no error and changes nothing', async () => {
    await inRolledBackTx(async (tx) => {
      await runMigration(tx);
      await runMigration(tx);
      expect(await existingTables(tx)).toEqual([...TABLES].sort());
      expect(await existingIndexes(tx)).toEqual([...INDEXES].sort());
      expect(await existingConstraints(tx, 'c', CHECKS)).toEqual([...CHECKS].sort());
      expect(await existingConstraints(tx, 'f', FKS)).toEqual([...FKS].sort());
      expect(await taskPhaseColumns(tx)).toHaveLength(1);
    });
  });

  test('a task created without a phase reads back with phaseId null', async () => {
    await inRolledBackTx(async (tx) => {
      const { project, kind, creator } = await seedPlan(tx);
      const [legacy] = await tx
        .insert(schema.task)
        .values({
          projectId: project.id,
          kindId: kind.id,
          title: 'Tugas lama',
          createdBy: creator.id,
        }) // test-only
        .returning();
      const [back] = await tx.select().from(schema.task).where(eq(schema.task.id, legacy.id));
      expect(back.phaseId).toBeNull();
      expect(back.title).toBe('Tugas lama'); // test-only
    });
  });

  test('deleting a phase nulls task.phase_id and milestone.phase_id but keeps both rows', async () => {
    await inRolledBackTx(async (tx) => {
      const { phase, task, milestone } = await seedPlan(tx);
      await tx.delete(schema.projectPhase).where(eq(schema.projectPhase.id, phase.id));
      const [t] = await tx.select().from(schema.task).where(eq(schema.task.id, task.id));
      const [m] = await tx
        .select()
        .from(schema.projectMilestone)
        .where(eq(schema.projectMilestone.id, milestone.id));
      expect(t.phaseId).toBeNull();
      expect(m.phaseId).toBeNull();
      expect(m.title).toBe('Rapat awal'); // test-only
    });
  });

  test('deleting the project cascades to phases, milestones, extensions and overrides', async () => {
    await inRolledBackTx(async (tx) => {
      const { project } = await seedPlan(tx);
      const where = `project_id = '${project.id}'`;
      for (const table of TABLES) expect(await count(tx, table, where)).toBe(1);
      await tx.delete(schema.project).where(eq(schema.project.id, project.id));
      for (const table of TABLES) expect(await count(tx, table, where)).toBe(0);
    });
  });

  test('deleting the author keeps the history rows with the author nulled', async () => {
    await inRolledBackTx(async (tx) => {
      const { creator, project } = await seedPlan(tx);
      await tx.delete(schema.user).where(eq(schema.user.id, creator.id));
      const where = `project_id = '${project.id}'`;
      expect(
        await count(tx, 'project_deadline_extension', `${where} AND extended_by IS NULL`),
      ).toBe(1);
      expect(await count(tx, 'project_condition_override', `${where} AND set_by IS NULL`)).toBe(1);
    });
  });

  test('CHECK constraints reject bad status, reversed dates, non-forward extensions and bad values', async () => {
    await inRolledBackTx(async (tx) => {
      const { project, phase } = await seedPlan(tx);
      const p = `'${project.id}'`;
      const bad = [
        [
          `UPDATE project_phase SET status = 'active' WHERE id = '${phase.id}'`,
          'project_phase_status_check',
        ],
        [
          `UPDATE project_phase SET start_date = '2026-10-10', end_date = '2026-10-09' WHERE id = '${phase.id}'`,
          'project_phase_end_after_start_check',
        ],
        [
          `INSERT INTO project_deadline_extension (id, project_id, old_due_date, new_due_date, reason_category, reason)
           VALUES ('x1', ${p}, '2026-12-31', '2026-12-31', 'other', 'sama')`,
          'project_deadline_extension_later_check',
        ],
        [
          `INSERT INTO project_deadline_extension (id, project_id, old_due_date, new_due_date, reason_category, reason)
           VALUES ('x2', ${p}, '2026-12-31', '2027-01-31', 'unknown', 'salah')`,
          'project_deadline_extension_reason_category_check',
        ],
        [
          `INSERT INTO project_condition_override (id, project_id, condition, reason) VALUES ('x3', ${p}, 'bad', 'salah')`,
          'project_condition_override_condition_check',
        ],
      ];
      for (const [stmt, constraint] of bad) {
        expect(await violation(tx, stmt)).toEqual({ code: PG_CHECK_VIOLATION, constraint });
      }
    });
  });

  test('task.phase_id rejects a phase that does not exist', async () => {
    await inRolledBackTx(async (tx) => {
      const { task } = await seedPlan(tx);
      expect(
        await violation(tx, `UPDATE task SET phase_id = 'no-such-phase' WHERE id = '${task.id}'`),
      ).toEqual({ code: PG_FK_VIOLATION, constraint: 'task_phase_id_project_phase_id_fk' });
    });
  });

  test('rollback drops the tables and the column but keeps tasks; re-applying restores them', async () => {
    await inRolledBackTx(async (tx) => {
      const { task } = await seedPlan(tx);
      await runRollback(tx);
      await runRollback(tx);
      expect(await existingTables(tx)).toEqual([]);
      expect(await existingIndexes(tx)).toEqual([]);
      expect(await taskPhaseColumns(tx)).toEqual([]);
      expect(await count(tx, 'task', `id = '${task.id}'`)).toBe(1);
      await runMigration(tx);
      expect(await existingTables(tx)).toEqual([...TABLES].sort());
      expect(await taskPhaseColumns(tx)).toHaveLength(1);
      expect(await count(tx, 'task', `id = '${task.id}' AND phase_id IS NULL`)).toBe(1);
    });
  });
});
