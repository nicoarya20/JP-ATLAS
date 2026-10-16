import { describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '../../server/db';
import { introspectDrizzleSchema } from '../../server/db/schema-introspect';

// Index contract of the 8 PM tables (R02 §3.2 + §3.7). Primary keys are checked separately because Postgres lists
// them as indexes too; the 14 below are the secondary and unique ones. `where` is the partial-index predicate.
const TAG = 'pm_indexes_contract';
type ExpectedIndex = { table: string; columns: string[]; unique: boolean; where?: string };
const LIVE = 'deleted_at IS NULL';
const TRASHED = 'deleted_at IS NOT NULL';
const EXPECTED_INDEXES: Record<string, ExpectedIndex> = {
  project_status_due_date_idx: {
    table: 'project',
    columns: ['status', 'due_date'],
    unique: false,
    where: LIVE,
  },
  project_deleted_at_idx: {
    table: 'project',
    columns: ['deleted_at'],
    unique: false,
    where: TRASHED,
  },
  project_member_user_id_idx: { table: 'project_member', columns: ['user_id'], unique: false },
  project_activity_project_id_created_at_idx: {
    table: 'project_activity',
    columns: ['project_id', 'created_at'],
    unique: false,
  },
  task_kind_project_id_name_uidx: {
    table: 'task_kind',
    columns: ['project_id', 'lower(name)'],
    unique: true,
  },
  task_number_uidx: { table: 'task', columns: ['number'], unique: true },
  task_project_id_status_idx: {
    table: 'task',
    columns: ['project_id', 'status'],
    unique: false,
    where: LIVE,
  },
  task_assignee_id_status_due_date_idx: {
    table: 'task',
    columns: ['assignee_id', 'status', 'due_date'],
    unique: false,
    where: LIVE,
  },
  task_project_id_reviewer_id_idx: {
    table: 'task',
    columns: ['project_id', 'reviewer_id'],
    unique: false,
    where: `status = 'in_review' AND ${LIVE}`,
  },
  task_deleted_at_idx: { table: 'task', columns: ['deleted_at'], unique: false, where: TRASHED },
  task_deleted_with_project_id_idx: {
    table: 'task',
    columns: ['deleted_with_project_id'],
    unique: false,
    where: 'deleted_with_project_id IS NOT NULL',
  },
  task_checklist_item_task_id_position_idx: {
    table: 'task_checklist_item',
    columns: ['task_id', 'position'],
    unique: false,
  },
  task_comment_task_id_created_at_idx: {
    table: 'task_comment',
    columns: ['task_id', 'created_at'],
    unique: false,
  },
  task_activity_task_id_created_at_idx: {
    table: 'task_activity',
    columns: ['task_id', 'created_at'],
    unique: false,
  },
};
const PM_TABLES = [
  'project',
  'project_member',
  'project_activity',
  'task_kind',
  'task',
  'task_checklist_item',
  'task_comment',
  'task_activity',
];
// Every PM table is keyed by `id` except the join table, whose composite key doubles as its project-first index.
const EXPECTED_PRIMARY_KEYS: Record<string, string[]> = Object.fromEntries(
  PM_TABLES.map((t) => [t, t === 'project_member' ? ['project_id', 'user_id'] : ['id']]),
);

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
class Rollback extends Error {}

/** Runs `fn` in a transaction that is always rolled back, so a `SET LOCAL` can never outlive the test. */
async function inRolledBackTx(fn: (tx: Tx) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

/** Normalizes a predicate so drizzle text and `pg_get_expr` output compare equal (case, parens, casts). */
const normalizePredicate = (text: string) =>
  text.replaceAll('::text', '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

type IndexRow = {
  name: string;
  table: string;
  unique: boolean;
  columns: string[];
  predicate: string | null;
};

/** Non-primary indexes of the PM tables as Postgres reports them. */
async function dbIndexes(): Promise<IndexRow[]> {
  const rows = await db.execute<IndexRow>(sql`
    SELECT i.relname AS name, t.relname AS "table", ix.indisunique AS "unique",
      ARRAY(SELECT pg_get_indexdef(ix.indexrelid, k + 1, true)
            FROM generate_series(0, ix.indnkeyatts - 1) k ORDER BY k) AS columns,
      pg_get_expr(ix.indpred, ix.indrelid) AS predicate
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND NOT ix.indisprimary
      AND t.relname IN (${sql.join(
        PM_TABLES.map((t) => sql`${t}`),
        sql`, `,
      )})
    ORDER BY i.relname`);
  return [...rows];
}

/** Collects every "Index Name" in a JSON EXPLAIN plan tree. */
function planIndexes(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(planIndexes);
  if (node === null || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) =>
    key === 'Index Name' ? [String(value)] : planIndexes(value),
  );
}

/** Index names the planner picks for `query` with sequential scans switched off (transaction-local). */
async function explainIndexes(query: string): Promise<string[]> {
  let used: string[] = [];
  await inRolledBackTx(async (tx) => {
    await tx.execute(sql`SET LOCAL enable_seqscan = off`);
    const [row] = await tx.execute<{ 'QUERY PLAN': unknown }>(
      sql.raw(`EXPLAIN (FORMAT JSON) ${query}`),
    );
    const plan = row['QUERY PLAN'];
    used = planIndexes(typeof plan === 'string' ? JSON.parse(plan) : plan);
  });
  return used;
}

describe('PM index contract (R02 §3.2 / §3.7)', () => {
  it('Drizzle introspection lists exactly the expected secondary indexes of the 8 PM tables', () => {
    const actual = Object.fromEntries(
      introspectDrizzleSchema()
        .tables.filter((t) => PM_TABLES.includes(t.name))
        .flatMap((t) =>
          t.indexes.map((ix) => [
            ix.name,
            { table: t.name, columns: ix.columns, unique: ix.unique, where: ix.where },
          ]),
        ),
    );
    const normalize = (ix: {
      table: string;
      columns: string[];
      unique: boolean;
      where?: string;
    }) => ({
      ...ix,
      where: ix.where === undefined ? undefined : normalizePredicate(ix.where),
    });
    expect(Object.keys(actual).sort()).toEqual(Object.keys(EXPECTED_INDEXES).sort());
    for (const [name, expected] of Object.entries(EXPECTED_INDEXES)) {
      expect({ name, ...normalize(actual[name]) }).toEqual({ name, ...normalize(expected) });
    }
  });

  it('the migrated test DB holds exactly the expected indexes, with the same columns and predicates', async () => {
    const rows = await dbIndexes();
    expect(rows.map((r) => r.name).sort()).toEqual(Object.keys(EXPECTED_INDEXES).sort());
    for (const row of rows) {
      const expected = EXPECTED_INDEXES[row.name];
      expect({
        name: row.name,
        table: row.table,
        // Postgres quotes names it treats as keywords ("position"); quoting is not part of the contract.
        columns: row.columns.map((c) => c.replaceAll('"', '')),
        unique: row.unique,
      }).toEqual({
        name: row.name,
        table: expected.table,
        columns: expected.columns,
        unique: expected.unique,
      });
      expect({
        name: row.name,
        where: row.predicate === null ? undefined : normalizePredicate(row.predicate),
      }).toEqual({
        name: row.name,
        where: expected.where === undefined ? undefined : normalizePredicate(expected.where),
      });
    }
  });

  it('primary keys of the PM tables are the expected columns', async () => {
    const rows = await db.execute<{ table: string; columns: string[] }>(sql`
      SELECT t.relname AS "table",
        ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum ORDER BY k.ord) AS columns
      FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
      WHERE c.contype = 'p' AND t.relnamespace = 'public'::regnamespace
        AND t.relname IN (${sql.join(
          PM_TABLES.map((t) => sql`${t}`),
          sql`, `,
        )})`);
    const actual = Object.fromEntries([...rows].map((r) => [r.table, r.columns]));
    expect(actual).toEqual(EXPECTED_PRIMARY_KEYS);
  });

  it('"project list by status" is served by project_status_due_date_idx', async () => {
    const used = await explainIndexes(
      `SELECT id FROM project WHERE status = 'active' AND deleted_at IS NULL ORDER BY due_date`,
    );
    expect(used).toEqual(['project_status_due_date_idx']);
  });

  it('"tasks by assignee" is served by task_assignee_id_status_due_date_idx', async () => {
    const used = await explainIndexes(
      `SELECT id FROM task WHERE assignee_id = '${TAG}-user' AND status = 'in_progress' AND deleted_at IS NULL ORDER BY due_date`,
    );
    expect(used).toEqual(['task_assignee_id_status_due_date_idx']);
  });

  it('control: a query on an unindexed column uses no index even with seq scans disabled', async () => {
    // Proves the two assertions above are not vacuous: EXPLAIN only names an index when one is really chosen.
    expect(await explainIndexes(`SELECT id FROM project WHERE description = '${TAG}'`)).toEqual([]);
  });

  it('SET LOCAL enable_seqscan does not outlive its transaction', async () => {
    await explainIndexes(`SELECT id FROM project WHERE status = 'active'`);
    const [row] = await db.execute<{ enable_seqscan: string }>(sql`SHOW enable_seqscan`);
    expect(row.enable_seqscan).toBe('on');
  });
});
