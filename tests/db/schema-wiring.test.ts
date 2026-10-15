import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import * as barrel from '../../server/db/schema';

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
