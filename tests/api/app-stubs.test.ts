/**
 * Structure guard for the /api/app modules (S0B-18): empty stubs stay empty and listed until a
 * slice fills them, every module stays thin (no Drizzle, ≤10 routes), and app.ts mounts the gate first.
 */
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Elysia } from 'elysia';

const API_DIR = path.join(import.meta.dir, '../../server/api');
const MAX_ROUTES_PER_INSTANCE = 10;
const STUB_LABEL = /^\/\/ STUB\((S1|S2)\): diisi irisan .+; hapus dari tes app-stubs saat terisi$/m;

/** The stubs S0B-18 creates. A slice that fills one deletes its row here and the STUB comment there. */
const STUBS = [
  { file: 'app-projects.trash.ts', plugin: 'projectTrashApi', prefix: '/projects' },
  { file: 'app-team.picker.ts', plugin: 'teamPickerApi', prefix: '/team' },
  { file: 'app-trash.ts', plugin: 'trashApi', prefix: '/trash' },
  { file: 'app-tasks.workflow.ts', plugin: 'taskWorkflowApi', prefix: '/tasks' },
  { file: 'app-tasks.detail.ts', plugin: 'taskDetailApi', prefix: '/tasks' },
];

/** Plugins slices have filled with routes (S1-02 projects, S1-06 profile, S2-03 tasks): no longer stubs, still mounted by app.ts. */
const FILLED = ['profileApi', 'projectsApi', 'projectMembersApi', 'tasksApi'];

/** Modules that already predate the no-Drizzle rule; new ones must not join this list. */
const DB_ALLOWED = ['app-avatar.ts']; // legacy: avatar upload touches the user row directly

const read = (file: string) => readFileSync(path.join(API_DIR, file), 'utf8');
const appFiles = () => readdirSync(API_DIR).filter((f) => /^app(-.+)?\.ts$/.test(f));
const lines = (file: string) => read(file).trimEnd().split('\n').length;

/** Import lines that reach the database layer from a route module. */
function dbImports(source: string): string[] {
  return source
    .split('\n')
    .filter((l) => /^\s*import\b/.test(l) || /\bfrom\s+['"]/.test(l))
    .filter(
      (l) => /['"]drizzle-orm(\/[^'"]*)?['"]/.test(l) || /['"](\.\.?\/)+db(\/[^'"]*)?['"]/.test(l),
    );
}

describe('stubs', () => {
  test.each(STUBS)('$file is an empty prefixed plugin carrying the STUB label', async (s) => {
    const mod = (await import(path.join(API_DIR, s.file))) as Record<string, unknown>;
    const plugin = mod[s.plugin];
    expect(plugin).toBeInstanceOf(Elysia);
    expect((plugin as Elysia).routes).toHaveLength(0);
    expect(read(s.file)).toMatch(STUB_LABEL);
    expect(read(s.file)).toContain(`prefix: '${s.prefix}'`);
  });

  test('the STUB labels in server/api are exactly the listed stubs', () => {
    const labelled = appFiles().filter((f) => /\/\/ STUB\(/.test(read(f)));
    expect(labelled.sort()).toEqual(STUBS.map((s) => s.file).sort());
  });
});

describe('app.ts', () => {
  const source = read('app.ts');
  const mounts = [...source.matchAll(/\.use\((\w+)\)/g)].map((m) => m[1]);

  test('mounts the gate first, then every stub and every filled plugin', () => {
    expect(mounts[0]).toBe('appContext');
    // Order past the gate is free: only the gate must come first (a parent's hooks reach later routes only).
    expect(mounts.slice(1).sort()).toEqual([...FILLED, ...STUBS.map((s) => s.plugin)].sort());
  });

  test('hosts the example routes without role casts', () => {
    expect(source).not.toContain('NonNullable');
  });
});

describe('module hygiene', () => {
  test('the scanner flags db and drizzle imports and ignores the rest', () => {
    expect(dbImports(`import { eq } from 'drizzle-orm';`)).toHaveLength(1);
    expect(dbImports(`import { db } from '../db';`)).toHaveLength(1);
    expect(dbImports(`import { user } from "../db/schema";`)).toHaveLength(1);
    expect(
      dbImports(`import { Elysia } from 'elysia';\nimport { x } from './app-db-view';`),
    ).toEqual([]);
  });

  test('no app-*.ts imports Drizzle or the db (except the listed legacy module)', () => {
    const offenders = appFiles()
      .filter((f) => !DB_ALLOWED.includes(f))
      .filter((f) => dbImports(read(f)).length > 0);
    expect(offenders).toEqual([]);
  });

  test('every module instance stays within the route budget', async () => {
    const modules = appFiles().filter((f) => f !== 'app.ts'); // app.ts aggregates the others
    for (const file of modules) {
      const mod = (await import(path.join(API_DIR, file))) as Record<string, unknown>;
      for (const value of Object.values(mod)) {
        if (value instanceof Elysia) {
          expect(value.routes.length).toBeLessThanOrEqual(MAX_ROUTES_PER_INSTANCE);
        }
      }
    }
  });

  test.each([
    ['app.ts', 60],
    ['app-context.ts', 90],
    ['app-common.ts', 80],
    ['app-projects.ts', 150],
    ['app-projects.members.ts', 150],
    ['app-profile.ts', 150],
    ['app-tasks.ts', 150],
    ['app-tasks.write.ts', 150],
    ['app-tasks.schema.ts', 150],
    ...STUBS.map((s) => [s.file, 150] as const),
  ] as const)('%s stays within %d lines', (file, max) => {
    expect(lines(file)).toBeLessThanOrEqual(max);
  });
});
