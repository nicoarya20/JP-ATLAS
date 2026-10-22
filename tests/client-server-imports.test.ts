import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { Glob } from 'bun';

const ROOT = path.join(import.meta.dir, '..');
// Covers named, default, namespace and mixed imports, plus `export {…} from` / `export * from` re-exports.
const IMPORT_RE =
  /import\s+(type\s+)?(?:[\w$]+\s*,\s*)?(\{[^}]*\}|\*\s+as\s+[\w$]+|[\w$]+)\s+from\s+['"]([^'"]+)['"]/g;
const REEXPORT_RE =
  /export\s+(type\s+)?(\{[^}]*\}|\*(?:\s+as\s+[\w$]+)?)\s+from\s+['"]([^'"]+)['"]/g;
// Anything here throws in the browser bundle (e.g. `process is not defined`).
const SERVER_ONLY_SPEC = /(^node:|\/env$|\/db$|\/app-info$|\/logger$)/;
const SERVER_ONLY_CODE = /\bBun\.|\bprocess\./;

/** Specifiers that stay in the bundle: type-only imports/re-exports are erased and skipped. */
function runtimeImports(src: string): string[] {
  const out: string[] = [];
  for (const re of [IMPORT_RE, REEXPORT_RE]) {
    for (const [, typeOnly, bindings, spec] of src.matchAll(re)) {
      const allTypes =
        bindings.startsWith('{') &&
        bindings
          .slice(1, -1)
          .split(',')
          .every((n) => !n.trim() || n.trim().startsWith('type '));
      if (!typeOnly && !allTypes) out.push(spec);
    }
  }
  return out;
}

/** Resolve an extensionless import base to its `.ts` file, or say why it cannot be resolved. */
function resolveTs(base: string): { file: string } | { problem: string } {
  const file = `${base}.ts`;
  if (existsSync(file)) return { file };
  const shown = path.relative(ROOT, base);
  if (existsSync(base) && statSync(base).isDirectory()) {
    return {
      problem: `${shown} is a directory; import an explicit file (this repo has no index.ts barrels)`,
    };
  }
  return { problem: `cannot be resolved to ${shown}.ts (missing file or wrong path)` };
}

/** Server-only code reachable from a server module through its relative runtime imports. */
function serverOnly(file: string, seen = new Set<string>()): string[] {
  if (seen.has(file)) return [];
  seen.add(file);
  const src = readFileSync(file, 'utf8');
  const name = path.relative(ROOT, file);
  const found = SERVER_ONLY_CODE.test(src) ? [`${name} uses Bun/process`] : [];
  for (const spec of runtimeImports(src)) {
    if (SERVER_ONLY_SPEC.test(spec)) found.push(`${name} imports ${spec}`);
    else if (spec.startsWith('.')) {
      const target = resolveTs(path.resolve(path.dirname(file), spec));
      if ('problem' in target) found.push(`${name} imports ${spec}: ${target.problem}`);
      else found.push(...serverOnly(target.file, seen));
    }
  }
  return found;
}

describe('client code imports only pure @server modules', () => {
  it('app/components and app/lib pull no env/db/node/Bun code into the browser', () => {
    const offenders: string[] = [];
    for (const rel of new Glob('app/{components,lib}/**/*.{ts,tsx}').scanSync(ROOT)) {
      for (const spec of runtimeImports(readFileSync(path.join(ROOT, rel), 'utf8'))) {
        if (!spec.startsWith('@server/')) continue;
        const target = resolveTs(path.join(ROOT, 'server', spec.slice('@server/'.length)));
        if ('problem' in target) offenders.push(`${rel} imports ${spec}: ${target.problem}`);
        else offenders.push(...serverOnly(target.file).map((o) => `${rel} → ${o}`));
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('import scanner', () => {
  it.each([
    ['named', "import { a } from '../x';", ['../x']],
    ['default', "import a from '../x';", ['../x']],
    ['namespace', "import * as ns from '../x';", ['../x']],
    ['default plus named', "import a, { b } from '../x';", ['../x']],
    ['multi-line named', "import {\n  a,\n  b,\n} from '../x';", ['../x']],
    ['named re-export', "export { a } from '../x';", ['../x']],
    ['star re-export', "export * from '../x';", ['../x']],
    ['namespace re-export', "export * as ns from '../x';", ['../x']],
    ['double quotes', 'import { a } from "../x";', ['../x']],
  ])('keeps a %s runtime import', (_name, src, expected) => {
    expect(runtimeImports(src)).toEqual(expected);
  });

  it.each([
    ['type import', "import type { A } from '../x';"],
    ['all-type named import', "import { type A, type B } from '../x';"],
    ['type re-export', "export type { A } from '../x';"],
    ['all-type named re-export', "export { type A } from '../x';"],
  ])('skips a %s', (_name, src) => {
    expect(runtimeImports(src)).toEqual([]);
  });

  it('keeps a mixed value-and-type import', () => {
    expect(runtimeImports("import { a, type B } from '../x';")).toEqual(['../x']);
  });

  it('explains an unresolved or directory target instead of throwing', () => {
    const missing = resolveTs(path.join(ROOT, 'server/__missing__'));
    expect('problem' in missing && missing.problem).toContain(
      'cannot be resolved to server/__missing__.ts',
    );
    const dir = resolveTs(path.join(ROOT, 'server/access'));
    expect('problem' in dir && dir.problem).toContain('is a directory');
    expect(resolveTs(path.join(ROOT, 'server/permissions'))).toHaveProperty('file');
  });

  it('flags a re-exported server-only module reachable from a client import', () => {
    expect(runtimeImports("export { db } from '../db';")).toEqual(['../db']);
    expect(SERVER_ONLY_SPEC.test('../db')).toBe(true);
  });
});
