import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { is } from 'drizzle-orm';
import { getTableConfig, PgDialect, PgTable } from 'drizzle-orm/pg-core';
import * as barrel from '../../server/db/schema';
import { project, projectActivity, projectMember } from '../../server/db/schema';

const DB_DIR = path.join(import.meta.dir, '../../server/db');
const SCHEMA_FILE = /^schema\.[a-z][a-z-]*\.ts$/;
// Empty modules registered up front so later tasks never edit the barrel or the drizzle config.
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

describe('project tables (S0B-02)', () => {
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
