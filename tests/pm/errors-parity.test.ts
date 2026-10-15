import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DENY_UI } from '../../server/access/decision';
import { DENY_CODES, PM_API_CODES, PM_ERRORS } from '../../server/pm/errors';

const ACCESS_DIR = path.join(import.meta.dir, '../../server/access');

// Denials the policies return that are not `DenyCode`s: they map to an API-catalog code (M8).
// `NOT_VISIBLE` is the project policy's spelling of `NOT_FOUND` (D8), so it has no entry of its own.
const NON_DENY_CODES_IN_POLICIES: Record<string, { catalog: string; http: number }> = {
  NOT_VISIBLE: { catalog: 'NOT_FOUND', http: 404 },
  NOT_FOUND: { catalog: 'NOT_FOUND', http: 404 },
  NO_ELIGIBLE_REVIEWER: { catalog: 'NO_ELIGIBLE_REVIEWER', http: 409 },
  LEAD_MUST_BE_MANAGER: { catalog: 'LEAD_MUST_BE_MANAGER', http: 422 },
};

/** Every code a policy file can hand back: `deny('X')` calls and `code: 'X'` literals. */
function codesUsedByPolicies(): Map<string, Set<string>> {
  const used = new Map<string, Set<string>>();
  const add = (code: string, file: string) => {
    if (!used.has(code)) used.set(code, new Set());
    used.get(code)?.add(file);
  };
  for (const file of readdirSync(ACCESS_DIR).filter((f) => f.endsWith('.ts'))) {
    const src = readFileSync(path.join(ACCESS_DIR, file), 'utf8');
    for (const m of src.matchAll(/\bdeny\(\s*'([A-Z_]+)'\s*\)/g)) add(m[1] as string, file);
    for (const m of src.matchAll(/\bcode:\s*'([A-Z_]+)'/g)) add(m[1] as string, file);
  }
  return used;
}

describe('DenyCode parity between PM_ERRORS and DENY_UI (M8)', () => {
  it('has a DENY_UI entry and a PM_ERRORS entry for every DenyCode, and no strays in DENY_UI', () => {
    expect(Object.keys(DENY_UI).sort()).toEqual([...DENY_CODES].sort());
    for (const code of DENY_CODES) expect(code in PM_ERRORS).toBe(true);
  });

  it.each([...DENY_CODES])('%s has the same HTTP status in the API and the UI', (code) => {
    expect<number>(DENY_UI[code].http).toBe(PM_ERRORS[code].http);
  });

  it.each([...DENY_CODES])(
    '%s has a hide/disable choice and a message in both catalogs',
    (code) => {
      expect(['hide', 'disable']).toContain(DENY_UI[code].ui);
      expect(DENY_UI[code].message.trim().length).toBeGreaterThan(0);
      expect(PM_ERRORS[code].message.trim().length).toBeGreaterThan(0);
    },
  );

  it('keeps DenyCodes and API codes disjoint, so one code never has two meanings', () => {
    const api = new Set<string>(PM_API_CODES);
    expect(DENY_CODES.filter((c) => api.has(c))).toEqual([]);
  });
});

describe('codes the policy files can return', () => {
  const used = codesUsedByPolicies();

  it('finds codes at all, so the scan cannot pass by matching nothing', () => {
    expect(used.size).toBeGreaterThan(10);
    expect(used.has('NOT_MANAGER')).toBe(true);
  });

  it('only returns DenyCodes or the known non-deny denials', () => {
    const known = new Set<string>([...DENY_CODES, ...Object.keys(NON_DENY_CODES_IN_POLICIES)]);
    const unknown = [...used.keys()].filter((c) => !known.has(c));
    expect(unknown).toEqual([]);
  });

  it.each(Object.entries(NON_DENY_CODES_IN_POLICIES))(
    'maps the non-deny denial %s to a catalog entry with the right status',
    (code, { catalog, http }) => {
      const entry = PM_ERRORS[catalog as keyof typeof PM_ERRORS];
      expect(entry).toBeDefined();
      expect<number>(entry.http).toBe(http);
      // None of them may be in the UI catalog: that would make the 19↔19 guard in level.test.ts lie.
      expect(code in DENY_UI).toBe(false);
    },
  );
});
