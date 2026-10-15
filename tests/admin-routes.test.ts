/**
 * Contract for the /dashboard (Admin) area: every page under routes/admin/** descends from the
 * admin layout, and each page or layout loader guards itself with an Admin-level role check.
 * React Router runs layout and page loaders in parallel, so a parent guard alone does not
 * protect a child's data; `requireUser` is deliberately not enough here (it admits Members).
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import routes from '../app/routes';

type Entry = { file: string; path?: string; children?: Entry[] };
const APP_DIR = path.join(import.meta.dir, '../app');
const ADMIN_PREFIX = 'routes/admin/';
const ADMIN_LAYOUT = `${ADMIN_PREFIX}layout.tsx`;
const GUARD_CALL = /require(AnyRole|Role)\(request/;
const ADMIN_ROLE = /ROLES\.ADMIN/;
const DEFAULT_EXPORT = /export\s+default\b/;
const META_EXPORT = /export\s+(async\s+)?function\s+meta\b|export\s+const\s+meta\b/;

const readFromDisk = (file: string) => readFileSync(path.join(APP_DIR, file), 'utf8');

function flatten(entries: Entry[]): Entry[] {
  return entries.flatMap((e) => [e, ...flatten(e.children ?? [])]);
}

const renders = (e: Entry, read: (file: string) => string) =>
  Boolean(e.children?.length) || DEFAULT_EXPORT.test(read(e.file));

/** Files under routes/admin/** that render but do not call an Admin-level role guard. */
function unguardedFiles(entries: Entry[], read: (file: string) => string = readFromDisk): string[] {
  return flatten(entries)
    .filter((e) => e.file.startsWith(ADMIN_PREFIX))
    .filter((e) => renders(e, read))
    .filter((e) => !(GUARD_CALL.test(read(e.file)) && ADMIN_ROLE.test(read(e.file))))
    .map((e) => e.file);
}

describe('/dashboard area', () => {
  const all = flatten(routes as Entry[]);
  const layout = (routes as Entry[]).find((e) => e.file === ADMIN_LAYOUT);

  test('the admin layout exists and serves /dashboard and /dashboard/users', () => {
    const paths = layout?.children?.map((c) => c.path);
    expect(paths).toContain('dashboard');
    expect(paths).toContain('dashboard/users');
  });

  test('every routes/admin file is a descendant of the admin layout', () => {
    const descendants = flatten(layout?.children ?? []);
    const adminFiles = all.filter((e) => e.file.startsWith(ADMIN_PREFIX) && e !== layout);
    expect(adminFiles.length).toBeGreaterThan(0);
    expect(adminFiles.filter((e) => !descendants.includes(e)).map((e) => e.file)).toEqual([]);
  });

  test('every /dashboard path is served from routes/admin, never from another area', () => {
    const strays = all.filter(
      (e) => e.path?.startsWith('dashboard') && !e.file.startsWith(ADMIN_PREFIX),
    );
    expect(strays.map((e) => e.file)).toEqual([]);
  });

  test('every admin page and layout calls an Admin-level role guard', () => {
    expect(unguardedFiles(routes as Entry[])).toEqual([]);
  });

  test('every admin page exports meta()', () => {
    const missing = all
      .filter((e) => e.file.startsWith(ADMIN_PREFIX) && renders(e, readFromDisk))
      .filter((e) => !META_EXPORT.test(readFromDisk(e.file)))
      .map((e) => e.file);
    expect(missing).toEqual([]);
  });
});

describe('unguardedFiles (synthetic config)', () => {
  const guarded =
    'export async function loader({request}){await requireAnyRole(request,[ROLES.ADMIN,ROLES.SUPER_ADMIN])}\nexport default function P(){}';
  const memberGuard =
    'export async function loader({request}){await requireUser(request)}\nexport default function P(){}';
  const wrongRole =
    'export async function loader({request}){await requireRole(request, ROLES.SUPER_ADMIN)}\nexport default function P(){}';
  const bare = 'export async function loader(){return null}\nexport default function P(){}';
  const sources: Record<string, string> = {
    [`${ADMIN_PREFIX}layout.tsx`]: guarded,
    [`${ADMIN_PREFIX}users.tsx`]: guarded,
    [`${ADMIN_PREFIX}member-only.tsx`]: memberGuard,
    [`${ADMIN_PREFIX}wrong-role.tsx`]: wrongRole,
    [`${ADMIN_PREFIX}bare.tsx`]: bare,
    [`${ADMIN_PREFIX}data.tsx`]: 'export async function loader(){return null}',
  };
  const read = (file: string) => sources[file] ?? '';
  const e = (file: string, children?: Entry[]): Entry => ({
    file: `${ADMIN_PREFIX}${file}`,
    children,
  });

  test('a guarded layout with a guarded page is clean', () => {
    expect(unguardedFiles([e('layout.tsx', [e('users.tsx')])], read)).toEqual([]);
  });

  test('a page with no guard at all is reported', () => {
    expect(unguardedFiles([e('layout.tsx', [e('bare.tsx')])], read)).toEqual([
      `${ADMIN_PREFIX}bare.tsx`,
    ]);
  });

  test('requireUser is reported because it lets Members into the Admin area', () => {
    expect(unguardedFiles([e('layout.tsx', [e('member-only.tsx')])], read)).toEqual([
      `${ADMIN_PREFIX}member-only.tsx`,
    ]);
  });

  test('a guard that never names the Admin role is reported', () => {
    expect(unguardedFiles([e('layout.tsx', [e('wrong-role.tsx')])], read)).toEqual([
      `${ADMIN_PREFIX}wrong-role.tsx`,
    ]);
  });

  test('resource routes without a default export and files outside routes/admin are ignored', () => {
    const tree = [e('layout.tsx', [e('data.tsx'), { file: 'routes/other.tsx' }])];
    expect(unguardedFiles(tree, read)).toEqual([]);
  });
});
