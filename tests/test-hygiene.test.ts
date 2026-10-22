/** Ratchet for test hygiene: `mock.module` is banned (allowlist is empty), deletes need a WHERE, long sleeps are banned in new files. */
import { describe, expect, test } from 'bun:test';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dir, '..');
const SELF = 'tests/test-hygiene.test.ts';
// Above this a sleep is a guess at timing, not a wait; poll a condition instead.
const MAX_SLEEP_MS = 100;

/**
 * Files allowed to use `mock.module`. The ratchet reached 0 (S0B-23): the list is empty and must stay so.
 * `mock.module` replaces a module for the whole bun process and leaks into unrelated files,
 * so use `spyOn` or `installAuthSpies()` instead (pattern: tests/api/posts.test.ts).
 */
const MOCK_MODULE_ALLOWLIST: readonly string[] = [];

/** Files that predate the unfiltered-delete rule and still contain one. Empty today; never add to it. */
const UNSAFE_DELETE_ALLOWLIST: readonly string[] = [];

/** Pre-existing files whose sleep exceeds MAX_SLEEP_MS (poll loops with a bounded retry count). */
const LONG_SLEEP_ALLOWLIST: readonly string[] = [
  'tests/dev-server-hmr.test.ts',
  'tests/local-pg/hardening.test.ts',
];

const MOCK_MODULE = /mock\.module/;
// `db`/`tx` receiver only, so Map/Set/S3 `.delete(key)` are not flagged; \s* spans biome's multi-line chains.
const DELETE_WITHOUT_WHERE = /\b(?:db|tx)\s*\.delete\(\s*[\w.]+\s*\)(?!\s*\.where\()/;
const SLEEP_CALL = /Bun\.sleep\(\s*(\d[\d_]*)\s*\)/g;

export function usesMockModule(source: string): boolean {
  return MOCK_MODULE.test(source);
}

export function hasUnsafeDelete(source: string): boolean {
  return DELETE_WITHOUT_WHERE.test(source);
}

export function hasLongSleep(source: string, maxMs = MAX_SLEEP_MS): boolean {
  for (const m of source.matchAll(SLEEP_CALL)) {
    if (Number(m[1].replaceAll('_', '')) > maxMs) return true;
  }
  return false;
}

export type HygieneReport = {
  newMockModule: string[];
  staleMockModule: string[];
  unsafeDeletes: string[];
  longSleeps: string[];
};

/** Checks `files` (repo-relative path -> source) against the ratchet; every list in the report must be empty. */
export function checkHygiene(
  files: ReadonlyMap<string, string>,
  mockAllowlist: readonly string[] = MOCK_MODULE_ALLOWLIST,
): HygieneReport {
  const mockers = new Set<string>();
  const unsafeDeletes: string[] = [];
  const longSleeps: string[] = [];
  for (const [file, source] of files) {
    if (file === SELF) continue; // its fixtures contain the banned patterns on purpose
    if (usesMockModule(source)) mockers.add(file);
    if (hasUnsafeDelete(source) && !UNSAFE_DELETE_ALLOWLIST.includes(file))
      unsafeDeletes.push(file);
    if (hasLongSleep(source) && !LONG_SLEEP_ALLOWLIST.includes(file)) longSleeps.push(file);
  }
  return {
    newMockModule: [...mockers].filter((f) => !mockAllowlist.includes(f)).sort(),
    staleMockModule: mockAllowlist.filter((f) => !mockers.has(f)).sort(),
    unsafeDeletes: unsafeDeletes.sort(),
    longSleeps: longSleeps.sort(),
  };
}

async function readTestTree(): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  for await (const rel of new Bun.Glob('tests/**/*').scan({ cwd: REPO_ROOT, onlyFiles: true })) {
    files.set(rel, await Bun.file(path.join(REPO_ROOT, rel)).text());
  }
  return files;
}

describe('test hygiene ratchet (real tests/ tree)', () => {
  test('no new file uses mock.module', async () => {
    const { newMockModule } = checkHygiene(await readTestTree());
    expect(
      newMockModule,
      'mock.module leaks across files; use spyOn like tests/api/posts.test.ts',
    ).toEqual([]);
  });

  test('converted files are removed from the mock.module allowlist', async () => {
    const { staleMockModule } = checkHygiene(await readTestTree());
    expect(
      staleMockModule,
      'no longer use mock.module; delete them from MOCK_MODULE_ALLOWLIST',
    ).toEqual([]);
  });

  test('no db.delete() without .where()', async () => {
    const { unsafeDeletes } = checkHygiene(await readTestTree());
    expect(
      unsafeDeletes,
      'unfiltered delete wipes shared test data; add .where(...) for your own rows',
    ).toEqual([]);
  });

  test(`no Bun.sleep above ${MAX_SLEEP_MS}ms in new files`, async () => {
    const { longSleeps } = checkHygiene(await readTestTree());
    expect(
      longSleeps,
      'poll a condition with a bounded retry instead of a long fixed sleep',
    ).toEqual([]);
  });
});

describe('ratchet detection (fixture strings, not real files)', () => {
  const clean = new Map(MOCK_MODULE_ALLOWLIST.map((f) => [f, "mock.module('x', () => ({}))"]));

  test('baseline fixture of exactly the allowlist is clean', () => {
    expect(checkHygiene(clean)).toEqual({
      newMockModule: [],
      staleMockModule: [],
      unsafeDeletes: [],
      longSleeps: [],
    });
  });

  test('fails when a new file adds mock.module', () => {
    const files = new Map(clean).set(
      'tests/api/brand-new.test.ts',
      "mock.module('../../server/guard', () => ({}))",
    );
    expect(checkHygiene(files).newMockModule).toEqual(['tests/api/brand-new.test.ts']);
  });

  test('fails when an allowlisted file stops using mock.module (ratchet down)', () => {
    // The real allowlist is empty now, so the stale-entry check runs against an explicit one.
    const files = new Map([['tests/guard.test.ts', 'spyOn(auth.api, "getSession")']]);
    expect(checkHygiene(files, ['tests/guard.test.ts']).staleMockModule).toEqual([
      'tests/guard.test.ts',
    ]);
  });

  test('the real allowlist is empty (ratchet is at 0)', () => {
    expect(MOCK_MODULE_ALLOWLIST).toEqual([]);
  });

  test('flags db.delete(x) without .where, single and multi-line, and tx receiver', () => {
    expect(hasUnsafeDelete('await db.delete(post);')).toBe(true);
    expect(hasUnsafeDelete('await db\n    .delete(post)\n    .returning();')).toBe(true);
    expect(hasUnsafeDelete('await tx.delete(schema.post);')).toBe(true);
  });

  test('accepts filtered deletes and non-db deletes', () => {
    expect(hasUnsafeDelete('await db.delete(post).where(eq(post.id, id));')).toBe(false);
    expect(hasUnsafeDelete('await db\n    .delete(post)\n    .where(eq(post.id, id));')).toBe(
      false,
    );
    expect(hasUnsafeDelete('seen.delete(key); await storage().delete(file.key);')).toBe(false);
  });

  test('flags Bun.sleep above the limit only', () => {
    expect(hasLongSleep('await Bun.sleep(101);')).toBe(true);
    expect(hasLongSleep('await Bun.sleep(1_000);')).toBe(true);
    expect(hasLongSleep('await Bun.sleep(100);')).toBe(false);
    expect(hasLongSleep('await Bun.sleep(20); // audit() is fire-and-forget')).toBe(false);
  });

  test('reports offending files from a scanned map', () => {
    const files = new Map(clean)
      .set('tests/api/new-delete.test.ts', 'await db.delete(post);')
      .set('tests/api/new-sleep.test.ts', 'await Bun.sleep(500);')
      .set('tests/dev-server-hmr.test.ts', 'await Bun.sleep(250);');
    const report = checkHygiene(files);
    expect(report.unsafeDeletes).toEqual(['tests/api/new-delete.test.ts']);
    expect(report.longSleeps).toEqual(['tests/api/new-sleep.test.ts']); // dev-server-hmr is allowlisted
  });
});
