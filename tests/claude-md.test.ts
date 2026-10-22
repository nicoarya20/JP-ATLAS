/** Guards the D9 corrections in CLAUDE.md so agents never read the stale rules again (S0B-31). */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const doc = readFileSync(new URL('../CLAUDE.md', import.meta.url), 'utf8');

describe('CLAUDE.md corrections', () => {
  test('no longer claims size="sm" is a 44px touch target', () => {
    expect(doc).not.toContain('44px touch area');
  });

  test.each([
    ['401 gate in derive via unauthorizedResponse', 'unauthorizedResponse'],
    ['API key deny list', 'PM_KEY_DENY'],
    ['timestamptz for new tables', 'timestamptz'],
    ['text size cookie', 'mk-text-size'],
    ['per-module API file naming', 'app-<modul>[.<bagian>].ts'],
  ])('documents %s', (_label, needle) => {
    expect(doc).toContain(needle);
  });

  test('smoke section points at the checklist instead of a fixed count', () => {
    expect(doc).toContain('SMOKE_CHECKS');
    expect(doc).not.toMatch(/\b\d+ pemeriksaan black-box/);
  });
});
