import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { Glob } from 'bun';

const ROOT = path.join(import.meta.dir, '../..');
const PURE_GLOBS = [
  'server/access/*.ts',
  'server/metrics/*.ts',
  'server/pm/{enums,errors,limits}.ts',
];
// Directories that must never get a barrel: it would resolve `@server/<dir>` to a missing `<dir>.ts` (X3 K8).
const NO_INDEX_DIRS = ['server/access', 'server/metrics'];

// Checked against the raw text, comments included, so a commented-out import cannot hide a dependency.
const FORBIDDEN_CODE: ReadonlyArray<[RegExp, string]> = [
  [/\bBun\./, 'uses Bun.'],
  [/\bprocess\./, 'uses process.'],
  [/node:/, 'mentions node:'],
  [/\b(?:db|logger|env)\.[a-zA-Z_$]/, 'uses db./logger./env.'],
];
const FORBIDDEN_SPEC = /^(?:node:|bun(?::|$))|(?:^|\/)(?:env|db|logger|app-info)(?:\/|$)/;
const SPEC_RE = /\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;

/** Purity violations in `src`; `dir` is the absolute directory of the file, used to resolve relative imports. */
function purityViolations(src: string, dir: string): string[] {
  const out: string[] = [];
  for (const [re, label] of FORBIDDEN_CODE) if (re.test(src)) out.push(label);
  for (const [, spec] of src.matchAll(SPEC_RE)) {
    if (FORBIDDEN_SPEC.test(spec)) out.push(`imports ${spec}`);
    if (!spec.startsWith('.')) continue;
    if (/\.[cm]?[jt]sx?$/.test(spec)) out.push(`imports ${spec} with an extension`);
    const base = path.resolve(dir, spec);
    if (existsSync(base) && statSync(base).isDirectory()) out.push(`imports directory ${spec}`);
    else if (!existsSync(`${base}.ts`) && !/\.[cm]?[jt]sx?$/.test(spec))
      out.push(`imports unresolved ${spec}`);
  }
  return out;
}

function pureFiles(): string[] {
  return PURE_GLOBS.flatMap((g) => [...new Glob(g).scanSync(ROOT)]).sort();
}

describe('purity scanner', () => {
  const dir = path.join(ROOT, 'server/access');

  it.each([
    ['Bun API', "const f = Bun.file('x');", 'uses Bun.'],
    ['process', 'const k = process.env.KEY;', 'uses process.'],
    ['node builtin', "import { readFileSync } from 'node:fs';", 'imports node:fs'],
    ['env module', "import { env } from '../env';", 'imports ../env'],
    ['db module', "import { db } from '../db';", 'imports ../db'],
    ['db subpath', "import { users } from '../db/schema';", 'imports ../db/schema'],
    ['logger module', "import { logger } from '../logger';", 'imports ../logger'],
    ['commented-out import', "// import { db } from '../db';", 'imports ../db'],
    ['comment mention', '// do not use Bun.file here', 'uses Bun.'],
    ['directory import', "import { x } from '../pm';", 'imports directory ../pm'],
    ['extension', "import { x } from './types.ts';", 'imports ./types.ts with an extension'],
    ['unresolved file', "import { x } from './nope';", 'imports unresolved ./nope'],
    ['re-export of a directory', "export * from '../pm';", 'imports directory ../pm'],
  ])('flags %s', (_name, src, expected) => {
    expect(purityViolations(src, dir)).toContain(expected);
  });

  it('accepts explicit extensionless sibling imports and plain prose', () => {
    const ok =
      "import type { Role } from '../permissions';\nexport { DENY_CODES } from '../pm/errors';\n// no environment, database or logging here";
    expect(purityViolations(ok, dir)).toEqual([]);
  });
});

describe('pure PM modules', () => {
  it('covers the access and PM contract files (guards against an empty glob)', () => {
    const files = pureFiles();
    for (const f of ['types', 'decision', 'level', 'rules']) {
      expect(files).toContain(`server/access/${f}.ts`);
    }
    for (const f of ['enums', 'errors', 'limits']) expect(files).toContain(`server/pm/${f}.ts`);
  });

  it.each(pureFiles())('%s is free of runtime, db, env and logger dependencies', (rel) => {
    const abs = path.join(ROOT, rel);
    expect(purityViolations(readFileSync(abs, 'utf8'), path.dirname(abs))).toEqual([]);
  });

  it.each(NO_INDEX_DIRS)('%s has no index.ts barrel', (dir) => {
    expect(existsSync(path.join(ROOT, dir, 'index.ts'))).toBe(false);
  });
});
