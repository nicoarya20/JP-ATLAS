import { describe, expect, test } from 'bun:test';
import path from 'node:path';

// Single source of truth for the Bun version is `.bun-version`; CI, release and Docker must follow it.
const ROOT = path.join(import.meta.dir, '..');
// Built by concatenation: a literal `${...}` in a plain string trips lint/suspicious/noTemplateCurlyInString.
const DOCKER_BASE_IMAGE = `oven/bun:$${'{'}BUN_VERSION}`;
const read = (rel: string) => Bun.file(path.join(ROOT, rel)).text();

describe('bun version pin', () => {
  test('.bun-version holds one exact semver', async () => {
    const version = (await read('.bun-version')).trim();
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('Dockerfile ARG default equals .bun-version', async () => {
    const version = (await read('.bun-version')).trim();
    const dockerfile = await read('Dockerfile');
    const arg = dockerfile.match(/^ARG BUN_VERSION=(\S+)$/m);
    expect(arg?.[1]).toBe(version);
  });

  test('every Dockerfile stage builds from the BUN_VERSION arg', async () => {
    const dockerfile = await read('Dockerfile');
    const froms = dockerfile.match(/^FROM .+$/gm) ?? [];
    expect(froms.length).toBeGreaterThanOrEqual(2);
    for (const line of froms) expect(line).toContain(DOCKER_BASE_IMAGE);
    // The ARG must precede the first FROM to be visible to the FROM lines.
    expect(dockerfile.indexOf('ARG BUN_VERSION=')).toBeLessThan(dockerfile.indexOf('FROM '));
  });

  for (const file of ['ci.yml', 'release.yml']) {
    test(`${file} installs Bun from .bun-version only`, async () => {
      const workflow = await read(`.github/workflows/${file}`);
      const setups = workflow.match(/uses: oven-sh\/setup-bun@/g) ?? [];
      const fromFile = workflow.match(/^\s+bun-version-file: \.bun-version$/gm) ?? [];
      expect(setups.length).toBeGreaterThan(0);
      expect(fromFile.length).toBe(setups.length);
      expect(workflow).not.toMatch(/BUN_VERSION|^\s+bun-version:/m);
    });
  }

  test('stack.md names the same version', async () => {
    const version = (await read('.bun-version')).trim();
    const row = (await read('stack.md')).match(/^\| Runtime \| Bun[^\n]*$/m)?.[0] ?? '';
    expect(row).toContain(`| ${version} |`);
  });

  test('.gitattributes merges CHANGELOG.md with the union driver', async () => {
    expect(await read('.gitattributes')).toMatch(/^CHANGELOG\.md\s+merge=union$/m);
  });
});
