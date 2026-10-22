/**
 * Contract for the /app product area: every page under routes/app/** descends from the
 * guarded app layout, and each page or nested layout loader guards itself (React Router
 * runs layout and page loaders in parallel, so a parent guard alone does not protect a
 * child's data).
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import routes from '../app/routes';

type Entry = { file: string; path?: string; children?: Entry[] };
const APP_DIR = path.join(import.meta.dir, '../app');
const APP_PREFIX = 'routes/app/';
const APP_LAYOUT = `${APP_PREFIX}layout.tsx`;
const GUARD_CALL = /require(User|AnyRole|Role)\(request/;
const DEFAULT_EXPORT = /export\s+default\b/;

const readFromDisk = (file: string) => readFileSync(path.join(APP_DIR, file), 'utf8');

function flatten(entries: Entry[]): Entry[] {
  return entries.flatMap((e) => [e, ...flatten(e.children ?? [])]);
}

/** Files under routes/app/** that render (default export or layout) but never call a role guard. */
function unguardedFiles(entries: Entry[], read: (file: string) => string = readFromDisk): string[] {
  return flatten(entries)
    .filter((e) => e.file.startsWith(APP_PREFIX))
    .filter((e) => e.children?.length || DEFAULT_EXPORT.test(read(e.file)))
    .filter((e) => !GUARD_CALL.test(read(e.file)))
    .map((e) => e.file);
}

describe('/app area', () => {
  const layout = (routes as Entry[]).find((e) => e.file === APP_LAYOUT);

  test('/app is a page inside the app layout', () => {
    expect(layout?.children?.map((c) => c.path)).toContain('app');
  });

  test('every routes/app file is a descendant of the app layout, not only a direct child', () => {
    const descendants = flatten(layout?.children ?? []);
    const appFiles = flatten(routes as Entry[]).filter(
      (e) => e.file.startsWith(APP_PREFIX) && e !== layout,
    );
    expect(appFiles.length).toBeGreaterThan(0);
    expect(appFiles.filter((e) => !descendants.includes(e)).map((e) => e.file)).toEqual([]);
  });

  test('every app page and nested layout loader calls a role guard', () => {
    expect(flatten(routes as Entry[]).some((e) => e.file === APP_LAYOUT)).toBe(true);
    expect(unguardedFiles(routes as Entry[])).toEqual([]);
  });
});

describe('unguardedFiles (synthetic config)', () => {
  const guarded =
    'export async function loader({request}){await requireUser(request)}\nexport default function P(){}';
  const bare = 'export async function loader(){return null}\nexport default function P(){}';
  const sources: Record<string, string> = {
    [`${APP_PREFIX}project/layout.tsx`]: guarded,
    [`${APP_PREFIX}project/board.tsx`]: guarded,
    [`${APP_PREFIX}project/detail.tsx`]: bare,
    [`${APP_PREFIX}project/data.tsx`]: 'export async function loader(){return null}',
    [`${APP_PREFIX}bare-layout.tsx`]: bare,
  };
  const read = (file: string) => sources[file] ?? '';
  const e = (file: string, children?: Entry[]): Entry => ({
    file: `${APP_PREFIX}${file}`,
    children,
  });

  test('child-of-child with a guard is clean', () => {
    const tree = [e('project/layout.tsx', [e('project/board.tsx')])];
    expect(unguardedFiles(tree, read)).toEqual([]);
  });

  test('nested route without a guard is reported', () => {
    const tree = [e('project/layout.tsx', [e('project/board.tsx'), e('project/detail.tsx')])];
    expect(unguardedFiles(tree, read)).toEqual([`${APP_PREFIX}project/detail.tsx`]);
  });

  test('nested layout without a guard is reported even when its children are guarded', () => {
    const tree = [e('bare-layout.tsx', [e('project/board.tsx')])];
    expect(unguardedFiles(tree, read)).toEqual([`${APP_PREFIX}bare-layout.tsx`]);
  });

  test('files outside routes/app and resource routes without default export are ignored', () => {
    const tree = [e('project/layout.tsx', [e('project/data.tsx'), { file: 'routes/other.tsx' }])];
    expect(unguardedFiles(tree, read)).toEqual([]);
  });
});
