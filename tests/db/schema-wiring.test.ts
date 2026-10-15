import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { is } from 'drizzle-orm';
import { getTableConfig, PgDialect, PgTable } from 'drizzle-orm/pg-core';
import * as barrel from '../../server/db/schema';
import {
  project,
  projectActivity,
  projectMember,
  task,
  taskActivity,
  taskChecklistItem,
  taskComment,
  taskKind,
} from '../../server/db/schema';

const DB_DIR = path.join(import.meta.dir, '../../server/db');
const SCHEMA_FILE = /^schema\.[a-z][a-z-]*\.ts$/;
// Modules registered up front so later tasks never edit the barrel or the drizzle config.
const PROJECT_STUBS = ['profile', 'project', 'project-history', 'task', 'task-detail'];

const schemaModules = readdirSync(DB_DIR)
  .filter((f) => SCHEMA_FILE.test(f))
  .map((f) => f.replace(/\.ts$/, ''));
const barrelSource = readFileSync(path.join(DB_DIR, 'schema.ts'), 'utf8');

async function tablesOf(mod: string): Promise<[string, unknown][]> {
  const exported = await import(path.join(DB_DIR, mod));
  return Object.entries(exported).filter(([, v]) => is(v as object, PgTable));
}

describe('schema barrel wiring', () => {
  test('finds the schema modules on disk', () => {
    expect(schemaModules.length).toBeGreaterThanOrEqual(4 + PROJECT_STUBS.length);
  });

  test.each(PROJECT_STUBS)('schema.%s.ts exists and is re-exported by the barrel', (name) => {
    expect(schemaModules).toContain(`schema.${name}`);
    expect(barrelSource).toContain(`export * from './schema.${name}';`);
  });

  test('every schema module that defines tables is re-exported by the barrel with the same objects', async () => {
    for (const mod of schemaModules) {
      for (const [exportName, table] of await tablesOf(mod)) {
        expect((barrel as Record<string, unknown>)[exportName]).toBe(table);
      }
    }
  });

  test('every schema module on disk is re-exported by the barrel', () => {
    // schema.columns.ts only holds column helpers and is deliberately not part of the barrel.
    for (const mod of schemaModules.filter((m) => m !== 'schema.columns')) {
      expect(barrelSource).toContain(`export * from './${mod}';`);
    }
  });

  test('no two schema modules export the same name (export * would silently drop it)', async () => {
    const seen = new Map<string, string>();
    for (const mod of schemaModules) {
      const names = Object.keys(await import(path.join(DB_DIR, mod)));
      for (const n of names) {
        expect(seen.has(n) ? `${n} in ${seen.get(n)} and ${mod}` : null).toBeNull();
        seen.set(n, mod);
      }
    }
  });
});

describe('drizzle.config.ts schema glob', () => {
  const configSource = readFileSync(path.join(import.meta.dir, '../../drizzle.config.ts'), 'utf8');

  test('uses the schema.*.ts glob so new modules are picked up automatically', () => {
    expect(configSource).toContain("schema: './server/db/schema.*.ts'");
  });

  test('the glob matches every registered module and not the barrel itself', () => {
    const glob = new Bun.Glob('schema.*.ts');
    expect(glob.match('schema.ts')).toBe(false);
    for (const mod of schemaModules) expect(glob.match(`${mod}.ts`)).toBe(true);
  });
});

const dialect = new PgDialect();
const cfg = (t: PgTable) => getTableConfig(t);
const col = (t: PgTable, name: string) => cfg(t).columns.find((c) => c.name === name);
const checkSql = (t: PgTable, name: string) => {
  const c = cfg(t).checks.find((x) => x.name === name);
  return c ? dialect.sqlToQuery(c.value).sql : undefined;
};
const fk = (t: PgTable, column: string) =>
  cfg(t).foreignKeys.find((f) => f.reference().columns[0].name === column);
const indexOf = (t: PgTable, name: string) => cfg(t).indexes.find((i) => i.config.name === name);

describe('project tables (S0B-02)', () => {
  test('table names are singular snake_case', () => {
    expect(cfg(project).name).toBe('project');
    expect(cfg(projectMember).name).toBe('project_member');
    expect(cfg(projectActivity).name).toBe('project_activity');
  });

  test('project: text id with client-side uuid default and the documented defaults', () => {
    expect(col(project, 'id')?.dataType).toBe('string');
    expect(col(project, 'id')?.primary).toBe(true);
    expect(col(project, 'id')?.defaultFn?.()).toMatch(/^[0-9a-f-]{36}$/);
    expect(col(project, 'status')?.default).toBe('draft');
    expect(col(project, 'priority')?.default).toBe('medium');
    expect(col(project, 'tasks_need_review_default')?.default).toBe(false);
    expect(col(project, 'tasks_need_review_default')?.notNull).toBe(true);
    expect(col(project, 'original_due_date')).toBeDefined();
  });

  test('project: actor FKs are nullable and ON DELETE SET NULL', () => {
    for (const name of ['lead_id', 'created_by', 'deleted_by']) {
      expect(col(project, name)?.notNull).toBe(false);
      expect(fk(project, name)?.onDelete).toBe('set null');
    }
  });

  test('project: timestamps are timestamptz and dates are date strings', () => {
    for (const name of ['created_at', 'updated_at', 'completed_at', 'deleted_at']) {
      expect(col(project, name)?.getSQLType()).toBe('timestamp with time zone');
    }
    for (const name of ['start_date', 'due_date', 'original_due_date']) {
      expect(col(project, name)?.getSQLType()).toBe('date');
    }
  });

  test('project: CHECK constraints for status, priority and due_date >= start_date', () => {
    expect(checkSql(project, 'project_status_check')).toContain(
      "in ('draft', 'active', 'on_hold', 'completed', 'canceled')",
    );
    expect(checkSql(project, 'project_priority_check')).toContain(
      "in ('low', 'medium', 'high', 'critical')",
    );
    expect(checkSql(project, 'project_due_after_start_check')).toContain('>=');
  });

  test('project: partial indexes for live listing and trash', () => {
    const live = indexOf(project, 'project_status_due_date_idx');
    expect(live?.config.columns.map((c) => (c as { name: string }).name)).toEqual([
      'status',
      'due_date',
    ]);
    expect(live?.config.where).toBeDefined();
    expect(dialect.sqlToQuery(live?.config.where as never).sql).toContain('IS NULL');
    const trash = indexOf(project, 'project_deleted_at_idx');
    expect(dialect.sqlToQuery(trash?.config.where as never).sql).toContain('IS NOT NULL');
  });

  test('project_member: composite PK, cascade FKs, role CHECK and user_id index', () => {
    const pkCols = cfg(projectMember).primaryKeys[0].columns.map((c) => c.name);
    expect(pkCols).toEqual(['project_id', 'user_id']);
    expect(fk(projectMember, 'project_id')?.onDelete).toBe('cascade');
    expect(fk(projectMember, 'user_id')?.onDelete).toBe('cascade');
    expect(fk(projectMember, 'added_by')?.onDelete).toBe('set null');
    expect(col(projectMember, 'added_by')?.notNull).toBe(false);
    expect(col(projectMember, 'role')?.default).toBe('member');
    expect(checkSql(projectMember, 'project_member_role_check')).toContain(
      "in ('manager', 'member', 'viewer')",
    );
    expect(indexOf(projectMember, 'project_member_user_id_idx')).toBeDefined();
  });

  test('project_activity: snapshot name, jsonb payload, cascade project and set-null actor', () => {
    expect(col(projectActivity, 'actor_name')?.notNull).toBe(false);
    expect(col(projectActivity, 'payload')?.getSQLType()).toBe('jsonb');
    expect(fk(projectActivity, 'project_id')?.onDelete).toBe('cascade');
    expect(fk(projectActivity, 'actor_id')?.onDelete).toBe('set null');
    const idx = indexOf(projectActivity, 'project_activity_project_id_created_at_idx');
    expect(idx?.config.columns.map((c) => (c as { name: string }).name)).toEqual([
      'project_id',
      'created_at',
    ]);
  });

  test('the out-of-scope S5 tables are not defined yet', async () => {
    const names = new Set<string>();
    for (const mod of schemaModules) {
      for (const [, t] of await tablesOf(mod)) names.add(cfg(t as PgTable).name);
    }
    for (const n of ['project_phase', 'project_milestone', 'project_deadline_extension']) {
      expect(names.has(n)).toBe(false);
    }
  });
});

const colNames = (cols: unknown[]) => cols.map((c) => (c as { name: string }).name);
const whereSql = (idx?: ReturnType<typeof indexOf>) =>
  dialect.sqlToQuery(idx?.config.where as never).sql;

describe('task tables (S0B-05)', () => {
  test('table names are singular snake_case', () => {
    expect(cfg(taskKind).name).toBe('task_kind');
    expect(cfg(task).name).toBe('task');
    expect(cfg(taskChecklistItem).name).toBe('task_checklist_item');
    expect(cfg(taskComment).name).toBe('task_comment');
    expect(cfg(taskActivity).name).toBe('task_activity');
  });

  test('task.number is a bigint BY DEFAULT identity on task_number_seq with a unique index', () => {
    const number = col(task, 'number');
    expect(number?.getSQLType()).toBe('bigint');
    expect(number?.generatedIdentity?.type).toBe('byDefault');
    expect(number?.generatedIdentity?.sequenceName).toBe('task_number_seq');
    const idx = indexOf(task, 'task_number_uidx');
    expect(idx?.config.unique).toBe(true);
    expect(colNames(idx?.config.columns ?? [])).toEqual(['number']);
  });

  test('task: documented defaults and column types', () => {
    expect(col(task, 'id')?.defaultFn?.()).toMatch(/^[0-9a-f-]{36}$/);
    expect(col(task, 'status')?.default).toBe('todo');
    expect(col(task, 'priority')?.default).toBe('medium');
    expect(col(task, 'needs_review')?.default).toBe(false);
    expect(col(task, 'reopen_count')?.default).toBe(0);
    expect(col(task, 'return_count')?.default).toBe(0);
    expect(col(task, 'last_activity_at')?.hasDefault).toBe(true);
    expect(col(task, 'last_activity_at')?.notNull).toBe(true);
    expect(col(task, 'estimate_hours')?.getSQLType()).toBe('numeric(6, 1)');
    for (const name of ['start_date', 'due_date']) {
      expect(col(task, name)?.getSQLType()).toBe('date');
    }
    for (const name of ['started_at', 'review_requested_at', 'completed_at', 'canceled_at']) {
      expect(col(task, name)?.getSQLType()).toBe('timestamp with time zone');
    }
  });

  test('task: kind_id is NOT NULL with NO ACTION and project_id cascades', () => {
    expect(col(task, 'kind_id')?.notNull).toBe(true);
    expect(fk(task, 'kind_id')?.onDelete).toBe('no action');
    expect(fk(task, 'project_id')?.onDelete).toBe('cascade');
    expect(fk(taskKind, 'project_id')?.onDelete).toBe('cascade');
  });

  test('task: actor FKs are nullable and ON DELETE SET NULL', () => {
    for (const name of ['assignee_id', 'reviewer_id', 'created_by', 'deleted_by']) {
      expect(col(task, name)?.notNull).toBe(false);
      expect(fk(task, name)?.onDelete).toBe('set null');
    }
    expect(col(task, 'deleted_with_project_id')?.notNull).toBe(false);
    expect(fk(task, 'deleted_with_project_id')?.onDelete).toBe('set null');
  });

  test('task: phase_id is not created while project_phase is deferred', () => {
    expect(col(task, 'phase_id')).toBeUndefined();
  });

  test('task: the S2 transition columns stay in the table', () => {
    for (const name of [
      'reviewer_id',
      'needs_review',
      'review_requested_at',
      'reopen_count',
      'return_count',
      'cancel_category',
      'cancel_note',
    ]) {
      expect(col(task, name)).toBeDefined();
    }
  });

  test('task: enum CHECK constraints use the shared tuples', () => {
    expect(checkSql(task, 'task_status_check')).toContain(
      "in ('todo', 'in_progress', 'in_review', 'done', 'canceled')",
    );
    expect(checkSql(task, 'task_priority_check')).toContain(
      "in ('low', 'medium', 'high', 'critical')",
    );
    expect(checkSql(task, 'task_cancel_category_check')).toContain(
      "in ('duplicate', 'not_needed', 'out_of_scope', 'created_by_mistake', 'other')",
    );
    expect(checkSql(taskKind, 'task_kind_base_kind_check')).toContain(
      "in ('task', 'issue', 'idea')",
    );
  });

  test('task: relational CHECK constraints', () => {
    expect(checkSql(task, 'task_due_after_start_check')).toContain('>=');
    expect(checkSql(task, 'task_reviewer_not_assignee_check')).toContain('<>');
    expect(checkSql(task, 'task_canceled_needs_category_check')).toContain("<> 'canceled'");
    expect(checkSql(task, 'task_other_needs_note_check')).toContain("IS DISTINCT FROM 'other'");
    expect(checkSql(task, 'task_counters_check')).toContain('>= 0');
    expect(cfg(task).checks).toHaveLength(8);
  });

  test('task: partial indexes for live lists, review queue and trash', () => {
    const byStatus = indexOf(task, 'task_project_id_status_idx');
    expect(colNames(byStatus?.config.columns ?? [])).toEqual(['project_id', 'status']);
    expect(whereSql(byStatus)).toContain('IS NULL');
    const mine = indexOf(task, 'task_assignee_id_status_due_date_idx');
    expect(colNames(mine?.config.columns ?? [])).toEqual(['assignee_id', 'status', 'due_date']);
    expect(whereSql(mine)).toContain('IS NULL');
    const review = indexOf(task, 'task_project_id_reviewer_id_idx');
    expect(colNames(review?.config.columns ?? [])).toEqual(['project_id', 'reviewer_id']);
    expect(whereSql(review)).toContain("'in_review'");
    expect(whereSql(indexOf(task, 'task_deleted_at_idx'))).toContain('IS NOT NULL');
    expect(whereSql(indexOf(task, 'task_deleted_with_project_id_idx'))).toContain('IS NOT NULL');
  });

  test('task_kind: unique index on (project_id, lower(name)) and a required position', () => {
    const idx = indexOf(taskKind, 'task_kind_project_id_name_uidx');
    expect(idx?.config.unique).toBe(true);
    expect(idx?.config.columns).toHaveLength(2);
    const rendered = dialect.sqlToQuery(idx?.config.columns[1] as never).sql;
    expect(rendered.toLowerCase()).toContain('lower(');
    expect(col(taskKind, 'position')?.notNull).toBe(true);
    expect(col(taskKind, 'archived_at')?.notNull).toBe(false);
  });

  test('task_checklist_item: cascade task, set-null done_by and (task_id, position) index', () => {
    expect(fk(taskChecklistItem, 'task_id')?.onDelete).toBe('cascade');
    expect(fk(taskChecklistItem, 'done_by')?.onDelete).toBe('set null');
    expect(col(taskChecklistItem, 'is_done')?.default).toBe(false);
    const idx = indexOf(taskChecklistItem, 'task_checklist_item_task_id_position_idx');
    expect(colNames(idx?.config.columns ?? [])).toEqual(['task_id', 'position']);
  });

  test('task_comment and task_activity: snapshot names, set-null actors and timeline indexes', () => {
    expect(fk(taskComment, 'task_id')?.onDelete).toBe('cascade');
    expect(fk(taskComment, 'author_id')?.onDelete).toBe('set null');
    expect(col(taskComment, 'author_name')?.notNull).toBe(false);
    expect(col(taskComment, 'deleted_at')?.notNull).toBe(false);
    expect(fk(taskActivity, 'task_id')?.onDelete).toBe('cascade');
    expect(fk(taskActivity, 'actor_id')?.onDelete).toBe('set null');
    expect(col(taskActivity, 'payload')?.getSQLType()).toBe('jsonb');
    for (const [t, name] of [
      [taskComment, 'task_comment_task_id_created_at_idx'],
      [taskActivity, 'task_activity_task_id_created_at_idx'],
    ] as const) {
      expect(colNames(indexOf(t, name)?.config.columns ?? [])).toEqual(['task_id', 'created_at']);
    }
  });

  test('the out-of-scope task tables are not defined yet', async () => {
    const names = new Set<string>();
    for (const mod of schemaModules) {
      for (const [, t] of await tablesOf(mod)) names.add(cfg(t as PgTable).name);
    }
    for (const n of ['task_review', 'task_dependency', 'task_attachment', 'tag', 'task_tag']) {
      expect(names.has(n)).toBe(false);
    }
  });
});
