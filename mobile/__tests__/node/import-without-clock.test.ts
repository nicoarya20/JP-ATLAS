/**
 * K1 at import time. Every date comes from the server's clock, which is not there when the app
 * starts: a module that computes one while it loads (`const X = today()` at the top level) throws
 * before the gate has even asked for it. The other suites cannot see that — the clock is seeded
 * before their first import — so this one loads every module into a fresh registry, where the
 * session store is new and its clock is still empty, as on a cold start.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type { peekClock } from '@/data/clock';

const ROOT = join(__dirname, '..', '..');

const sources = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(join(ROOT, path)).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !name.endsWith('.d.ts') ? [path] : [];
  });

const MODULES = [...sources('src'), ...sources('app')];

it('finds the modules it is meant to load', () => {
  expect(MODULES).toEqual(expect.arrayContaining(['src/data/clock.ts', 'app/_layout.tsx']));
});

it('loads every module in src/ and app/ before the clock has arrived', () => {
  const failures: string[] = [];
  // One registry for all of them: each module still runs its top level exactly once, and nothing
  // here fills the clock, so it is empty for every one of them.
  jest.isolateModules(() => {
    const clock = (require('@/data/clock') as { peekClock: typeof peekClock }).peekClock;
    expect(clock()).toBeNull();
    for (const path of MODULES) {
      try {
        require(join(ROOT, path));
      } catch (error) {
        failures.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    expect(clock()).toBeNull();
  });

  expect(failures).toEqual([]);
});
