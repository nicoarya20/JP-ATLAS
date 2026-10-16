/**
 * Keeps the STUB register honest: every file marked `// STUB(S1|S2)` is listed here and every
 * listed file is still marked. Filling a stub means deleting its marker AND its line below, so
 * the register never drifts from what is actually unfinished.
 */
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Glob } from 'bun';
import routes from '../app/routes';

const ROOT = path.join(import.meta.dir, '..');
const MARKER = /^\/\/ STUB\((S1|S2)\): .+$/m;

/** Page stubs under app/routes/app, with the slice that fills each one in. */
const ROUTE_STUBS: Record<string, 'S1' | 'S2'> = {
  'app/routes/app/projects.tsx': 'S1',
  'app/routes/app/project-new.tsx': 'S1',
  'app/routes/app/settings.tsx': 'S1',
  'app/routes/app/project/members.tsx': 'S1',
  'app/routes/app/project/settings.tsx': 'S1',
  'app/routes/app/tasks.tsx': 'S2',
  'app/routes/app/task-new.tsx': 'S2',
  'app/routes/app/task-detail.tsx': 'S2',
  'app/routes/app/project/tasks.tsx': 'S2',
};

/** Empty /api/app plugins (S0B-18) waiting for their slice. */
const API_STUBS: Record<string, 'S1' | 'S2'> = {
  'server/api/app-projects.trash.ts': 'S1',
  'server/api/app-team.picker.ts': 'S1',
  'server/api/app-trash.ts': 'S1',
  'server/api/app-tasks.ts': 'S2',
  'server/api/app-tasks.detail.ts': 'S2',
  'server/api/app-tasks.workflow.ts': 'S2',
};

const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');
const marked = (pattern: string) =>
  [...new Glob(pattern).scanSync({ cwd: ROOT })].filter((f) => MARKER.test(read(f))).sort();

type Entry = { file: string; children?: Entry[] };
const flatten = (entries: Entry[]): Entry[] =>
  entries.flatMap((e) => [e, ...flatten(e.children ?? [])]);

describe('STUB register', () => {
  it('lists exactly the marked page files under app/routes/app', () => {
    expect(marked('app/routes/app/**/*.tsx')).toEqual(Object.keys(ROUTE_STUBS).sort());
  });

  it('lists exactly the marked API plugins under server/api', () => {
    expect(marked('server/api/**/*.ts')).toEqual(Object.keys(API_STUBS).sort());
  });

  it.each(Object.entries({ ...ROUTE_STUBS, ...API_STUBS }))(
    '%s names its slice %s',
    (file, slice) => {
      expect(MARKER.exec(read(file))?.[1]).toBe(slice);
    },
  );
});

describe('page stubs', () => {
  const registered = new Set(flatten(routes as Entry[]).map((e) => `app/${e.file}`));

  it.each(Object.keys(ROUTE_STUBS))('%s is registered in routes.ts', (file) => {
    expect(registered.has(file)).toBe(true);
  });

  it.each(Object.keys(ROUTE_STUBS))('%s sets a "… — Simple PM" title', (file) => {
    expect(read(file)).toMatch(/title: '[^']+ — Simple PM'/);
  });

  it('leaves only the filled pages as real (non-stub) files', () => {
    const appFiles = [...registered].filter((f) => f.startsWith('app/routes/app/'));
    const nonStubs = appFiles.filter((f) => !(f in ROUTE_STUBS)).sort();
    expect(nonStubs).toEqual([
      'app/routes/app/home.tsx',
      'app/routes/app/layout.tsx',
      'app/routes/app/profile.tsx',
      'app/routes/app/project/layout.tsx',
      'app/routes/app/project/summary.tsx',
    ]);
  });
});
