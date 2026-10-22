import { describe, expect, test } from 'bun:test';
import path from 'node:path';

// All @mantine/* packages declare exact peer versions on each other (core/hooks), so a drifting caret
// range installs a mixed set that already violates those peers. Keep them on one exact version.
const ROOT = path.join(import.meta.dir, '..');
const read = (rel: string) => Bun.file(path.join(ROOT, rel)).text();
const EXACT_SEMVER = /^\d+\.\d+\.\d+$/;

type Manifest = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

async function declared(): Promise<Record<string, string>> {
  const pkg = JSON.parse(await read('package.json')) as Manifest;
  return { ...pkg.devDependencies, ...pkg.dependencies };
}

describe('mantine version pin', () => {
  test('every @mantine/* dependency is one exact version without ^ or ~', async () => {
    const mantine = Object.entries(await declared()).filter(([name]) =>
      name.startsWith('@mantine/'),
    );
    expect(mantine.length).toBeGreaterThanOrEqual(7);
    for (const [name, range] of mantine)
      expect(`${name}@${range}`).toMatch(/^@mantine\/[\w-]+@\d+\.\d+\.\d+$/);
    expect(new Set(mantine.map(([, range]) => range)).size).toBe(1);
  });

  test('the date picker package and its dayjs peer are declared', async () => {
    const deps = await declared();
    expect(deps['@mantine/dates']).toMatch(EXACT_SEMVER);
    expect(deps['@mantine/dates']).toBe(deps['@mantine/core']);
    expect(deps.dayjs).toMatch(EXACT_SEMVER);
  });

  test('installed @mantine/* packages match the declared version', async () => {
    const deps = await declared();
    for (const name of Object.keys(deps).filter((n) => n.startsWith('@mantine/'))) {
      const installed = JSON.parse(await read(`node_modules/${name}/package.json`)) as {
        version: string;
      };
      expect(`${name}@${installed.version}`).toBe(`${name}@${deps[name]}`);
    }
  });

  test('root loads dates styles after core styles, with the Indonesian dayjs locale', async () => {
    const root = await read('app/root.tsx');
    const core = root.indexOf("import '@mantine/core/styles.css'");
    const dates = root.indexOf("import '@mantine/dates/styles.css'");
    expect(core).toBeGreaterThanOrEqual(0);
    expect(dates).toBeGreaterThan(core);
    expect(root).toContain("import 'dayjs/locale/id'");
    expect(root).toContain('<DatesProvider');
  });
});
