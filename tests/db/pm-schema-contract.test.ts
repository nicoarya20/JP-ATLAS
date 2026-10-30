import { describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '../../server/db';
import { introspectDrizzleSchema } from '../../server/db/schema-introspect';

// Frozen contract of the 15 PM tables (migrations 0015, 0016, 0019 and 0024, R02 §3.2): table names, column names,
// types and nullability written out by hand. Any drift between the Drizzle schema, the migrated test DB and this
// list turns the test red, so a column change must be made on purpose by editing the literal below in the same commit.
// Entry format: `<column> <type>`, with a trailing `?` when the column is nullable (R02 legend: `?` = NULL).
const EXPECTED_COLUMNS: Record<string, string[]> = {
  project: [
    'id text',
    'name text',
    'description text?',
    'status text',
    'priority text',
    'lead_id text?',
    'start_date date?',
    'due_date date?',
    'original_due_date date?',
    'tasks_need_review_default boolean',
    'completed_at timestamptz?',
    'deleted_at timestamptz?',
    'deleted_by text?',
    'created_by text?',
    'created_at timestamptz',
    'updated_at timestamptz',
  ],
  project_member: [
    'project_id text',
    'user_id text',
    'role text',
    'added_by text?',
    'created_at timestamptz',
  ],
  project_activity: [
    'id text',
    'project_id text',
    'actor_id text?',
    'actor_name text?',
    'action text',
    'payload jsonb?',
    'created_at timestamptz',
  ],
  task_kind: [
    'id text',
    'project_id text',
    'name text',
    'base_kind text',
    'position smallint',
    'archived_at timestamptz?',
    'created_at timestamptz',
    'updated_at timestamptz',
  ],
  task: [
    'id text',
    'project_id text',
    'number bigint',
    'phase_id text?',
    'kind_id text',
    'title text',
    'description text?',
    'status text',
    'priority text',
    'assignee_id text?',
    'reviewer_id text?',
    'needs_review boolean',
    'created_by text?',
    'start_date date?',
    'due_date date?',
    'estimate_hours numeric?',
    'reopen_count integer',
    'return_count integer',
    'cancel_category text?',
    'cancel_note text?',
    'started_at timestamptz?',
    'review_requested_at timestamptz?',
    'completed_at timestamptz?',
    'canceled_at timestamptz?',
    'last_activity_at timestamptz',
    'deleted_at timestamptz?',
    'deleted_by text?',
    'deleted_with_project_id text?',
    'created_at timestamptz',
    'updated_at timestamptz',
  ],
  task_checklist_item: [
    'id text',
    'task_id text',
    'text text',
    'is_done boolean',
    'done_by text?',
    'done_at timestamptz?',
    'position smallint',
    'created_at timestamptz',
    'updated_at timestamptz',
  ],
  task_comment: [
    'id text',
    'task_id text',
    'author_id text?',
    'author_name text?',
    'body text',
    'edited_at timestamptz?',
    'deleted_at timestamptz?',
    'created_at timestamptz',
  ],
  task_activity: [
    'id text',
    'task_id text',
    'actor_id text?',
    'actor_name text?',
    'action text',
    'payload jsonb?',
    'created_at timestamptz',
  ],
  project_phase: [
    'id text',
    'project_id text',
    'name text',
    'description text?',
    'position smallint',
    'start_date date?',
    'end_date date?',
    'status text',
    'started_at timestamptz?',
    'finished_at timestamptz?',
    'created_at timestamptz',
    'updated_at timestamptz',
  ],
  project_milestone: [
    'id text',
    'project_id text',
    'phase_id text?',
    'title text',
    'description text?',
    'due_date date',
    'reached_at timestamptz?',
    'created_at timestamptz',
    'updated_at timestamptz',
  ],
  project_deadline_extension: [
    'id text',
    'project_id text',
    'old_due_date date',
    'new_due_date date',
    'reason_category text',
    'reason text',
    'extended_by text?',
    'created_at timestamptz',
  ],
  project_condition_override: [
    'id text',
    'project_id text',
    'condition text',
    'reason text',
    'set_by text?',
    'expires_at timestamptz?',
    'cleared_at timestamptz?',
    'created_at timestamptz',
  ],
  project_template: [
    'id text',
    'name text',
    'description text?',
    'source text',
    'created_by text?',
    'created_at timestamptz',
    'updated_at timestamptz',
  ],
  project_template_phase: [
    'id text',
    'template_id text',
    'name text',
    'description text?',
    'position smallint',
    'start_offset_days integer?',
    'end_offset_days integer?',
    'created_at timestamptz',
    'updated_at timestamptz',
  ],
  project_template_task: [
    'id text',
    'template_id text',
    'template_phase_id text?',
    'title text',
    'description text?',
    'priority text?',
    'kind_name text?',
    'due_offset_days integer?',
    'position smallint',
    'created_at timestamptz',
    'updated_at timestamptz',
  ],
};
const PM_TABLES = Object.keys(EXPECTED_COLUMNS);
// Deliberately broad: a future PM table (project_phase, task_tag, ...) must be added to the contract on purpose.
const PM_TABLE_PATTERN = '^(project|task)(_|$)';

// information_schema `data_type` -> the short names used above (and by schema-introspect).
const DB_TYPE: Record<string, string> = {
  text: 'text',
  boolean: 'boolean',
  date: 'date',
  jsonb: 'jsonb',
  smallint: 'smallint',
  integer: 'integer',
  bigint: 'bigint',
  numeric: 'numeric',
  'timestamp with time zone': 'timestamptz',
  'timestamp without time zone': 'timestamp',
};

const sortedLines = (lines: string[]) => [...lines].sort();

/** Column list of a table straight from the migrated test DB, in contract format. */
async function dbColumns(table: string): Promise<string[]> {
  const rows = await db.execute<{ name: string; type: string; nullable: string }>(sql`
    SELECT column_name AS name, data_type AS type, is_nullable AS nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}`);
  return sortedLines(
    [...rows].map(
      (r) =>
        `${r.name} ${DB_TYPE[r.type] ?? `UNMAPPED(${r.type})`}${r.nullable === 'YES' ? '?' : ''}`,
    ),
  );
}

describe('PM schema contract (project + task tables)', () => {
  it('the migrated test DB holds exactly the 15 PM tables', async () => {
    const rows = await db.execute<{ name: string }>(sql`
      SELECT table_name AS name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name ~ ${PM_TABLE_PATTERN}`);
    expect([...rows].map((r) => r.name).sort()).toEqual([...PM_TABLES].sort());
  });

  it('the Drizzle schema exports exactly the same 15 PM tables', () => {
    const names = introspectDrizzleSchema()
      .tables.map((t) => t.name)
      .filter((name) => new RegExp(PM_TABLE_PATTERN).test(name));
    expect(names.sort()).toEqual([...PM_TABLES].sort());
  });

  it.each([...PM_TABLES])('Drizzle introspection of %s matches the frozen column list', (table) => {
    const meta = introspectDrizzleSchema().tables.find((t) => t.name === table);
    expect(meta).toBeDefined();
    const columns = (meta?.columns ?? []).map(
      (c) => `${c.dbName} ${c.type}${c.notNull ? '' : '?'}`,
    );
    expect(sortedLines(columns)).toEqual(sortedLines(EXPECTED_COLUMNS[table]));
  });

  it.each([...PM_TABLES])(
    'the migrated test DB table %s matches the frozen column list',
    async (table) => {
      expect(await dbColumns(table)).toEqual(sortedLines(EXPECTED_COLUMNS[table]));
    },
  );

  it('task.estimate_hours keeps its numeric(6,1) precision, which the short type name hides', async () => {
    const [row] = await db.execute<{ precision: number; scale: number }>(sql`
      SELECT numeric_precision AS precision, numeric_scale AS scale FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'estimate_hours'`);
    expect({ precision: Number(row.precision), scale: Number(row.scale) }).toEqual({
      precision: 6,
      scale: 1,
    });
  });
});
