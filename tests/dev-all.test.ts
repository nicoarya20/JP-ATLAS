/**
 * `bun run dev:all` (scripts/dev-all.ts): its wiring in package.json and the pure helpers that
 * decide how output is prefixed and which exit code the run reports.
 *
 * Starting the two real servers is not done here — it would need free ports and a Postgres; the
 * "both stop together on Ctrl-C" behaviour is checked by hand (see the Phase 1 handover note).
 */
import { describe, expect, test } from 'bun:test';
import pkg from '../package.json';
import {
  CHILD_NAMES,
  firstFailure,
  KILL_AFTER_MS,
  label,
  splitLines,
} from '../scripts/dev-all.lib';

describe('the dev:all script is wired up', () => {
  test('package.json runs scripts/dev-all.ts', () => {
    expect(pkg.scripts['dev:all']).toBe('bun scripts/dev-all.ts');
  });

  test('the script file exists and brings in no new dependency', async () => {
    const source = await Bun.file(`${import.meta.dir}/../scripts/dev-all.ts`).text();
    const imports = [...source.matchAll(/\bfrom '([^']+)';/g)].map((m) => m[1]).sort();
    // Only Bun itself and our own helper: no `concurrently` and nothing else to install (§10).
    expect(imports).toEqual(['./dev-all.lib', 'bun']);
  });
});

describe('output prefixes', () => {
  test('name both children so two logs can be told apart', () => {
    expect(CHILD_NAMES).toEqual(['api', 'metro']);
  });

  test('are plain text when the output is piped', () => {
    expect(label('api', false)).toBe('[api] ');
    expect(label('metro', false)).toBe('[metro] ');
  });

  test('are coloured on a TTY, and differently per child', () => {
    const api = label('api', true);
    const metro = label('metro', true);
    expect(api).toContain('[api]');
    expect(api).not.toBe(metro);
    expect(api.startsWith('\u001b[')).toBe(true);
    expect(api.endsWith(' ')).toBe(true);
  });
});

describe('line buffering', () => {
  test('holds back a line that has not ended yet', () => {
    expect(splitLines('ready\nlistening on 3')).toEqual({
      lines: ['ready'],
      rest: 'listening on 3',
    });
  });

  test('emits whole lines and keeps the tail for the next chunk', () => {
    const first = splitLines('one\ntw');
    expect(first.lines).toEqual(['one']);
    expect(first.rest).toBe('tw');

    const second = splitLines(`${first.rest}o\nthree\n`);
    expect(second.lines).toEqual(['two', 'three']);
    expect(second.rest).toBe('');
  });

  test('treats a chunk with no newline as all tail', () => {
    expect(splitLines('partial')).toEqual({ lines: [], rest: 'partial' });
  });
});

describe('exit code', () => {
  test('is 0 when both children stopped cleanly', () => {
    expect(firstFailure([0, 0])).toBe(0);
  });

  test('is the first failure, so a crash is not reported as success', () => {
    expect(firstFailure([0, 1])).toBe(1);
    expect(firstFailure([130, 0])).toBe(130);
    expect(firstFailure([2, 1])).toBe(2);
  });

  test('is 0 when nothing ran', () => {
    expect(firstFailure([])).toBe(0);
  });
});

test('a stuck child is given time before SIGKILL', () => {
  expect(KILL_AFTER_MS).toBeGreaterThanOrEqual(1000);
});
