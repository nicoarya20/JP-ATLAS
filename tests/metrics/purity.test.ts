import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Glob } from 'bun';

const ROOT = path.join(import.meta.dir, '../..');
const FILES = [...new Glob('server/metrics/*.ts').scanSync(ROOT)].sort();
// Specifiers a metrics file may use: siblings, the enum tuples and the permission types (S0B-08 ownership rule).
const ALLOWED_IMPORT = /^(?:\.\/[a-z.-]+|\.\.\/pm\/enums|\.\.\/permissions)$/;
const SPEC_RE = /\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
// Time must arrive as a parameter (R03 D9), so no clock reads and no zero-argument Date construction.
const CLOCK_READS = /\bnew Date\(\s*\)|\bDate\.now\(|\bperformance\.now\(/;

describe('server/metrics purity', () => {
  it('contains the four S0B-08 modules (guards against an empty glob)', () => {
    for (const f of ['config', 'dates', 'types', 'task.metrics']) {
      expect(FILES).toContain(`server/metrics/${f}.ts`);
    }
  });

  it.each(FILES)('%s imports only siblings, pm/enums and permissions', (rel) => {
    const src = readFileSync(path.join(ROOT, rel), 'utf8');
    const specs = [...src.matchAll(SPEC_RE)].map((m) => m[1] as string);
    expect(specs.filter((s) => !ALLOWED_IMPORT.test(s))).toEqual([]);
  });

  it.each(FILES)('%s never reads the clock', (rel) => {
    expect(CLOCK_READS.test(readFileSync(path.join(ROOT, rel), 'utf8'))).toBe(false);
  });

  it('has no index.ts barrel', () => {
    expect(existsSync(path.join(ROOT, 'server/metrics/index.ts'))).toBe(false);
  });

  it('only server/pm/metrics-env.ts of the metrics area reads the environment', () => {
    const src = readFileSync(path.join(ROOT, 'server/pm/metrics-env.ts'), 'utf8');
    expect(src).toContain('process.env');
    for (const rel of FILES) {
      expect(readFileSync(path.join(ROOT, rel), 'utf8')).not.toContain('process.env');
    }
  });
});
