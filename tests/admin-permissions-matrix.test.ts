/**
 * The role matrix behind /dashboard/settings → "Peran & izin" (P11 AD-09). The point of these
 * tests is that the matrix is *derived*: every cell is compared against a live call into
 * `server/permissions.ts`, and the last test stubs one of those functions to prove the table
 * follows it. A hand-copied table would pass the spot-checks and fail that one.
 */
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import {
  buildPermissionsMatrix,
  MATRIX_CAPABILITIES,
  MATRIX_ROLE_ORDER,
} from '../server/api/admin-permissions.matrix';
import * as permissions from '../server/permissions';

const { ROLES } = permissions;

/** The cell of one capability for one role, as the built matrix answers it. */
function cell(capabilityId: string, role: string) {
  const matrix = buildPermissionsMatrix();
  const cap = matrix.capabilities.find((c) => c.id === capabilityId);
  if (!cap) throw new Error(`capability ${capabilityId} is missing from the matrix`);
  const found = cap.cells.find((c) => c.role === role);
  if (!found) throw new Error(`role ${role} is missing from capability ${capabilityId}`);
  return found;
}

/** The whole row, left to right, as booleans or the value a non-boolean cell carries. */
function row(capabilityId: string): Array<boolean | string> {
  return MATRIX_ROLE_ORDER.map((role) => {
    const c = cell(capabilityId, role);
    return c.granted === null ? (c.note ?? '') : c.granted;
  });
}

describe('permissions matrix shape', () => {
  it('has a column for every role in the app, weakest first', () => {
    expect([...MATRIX_ROLE_ORDER]).toEqual([
      ROLES.MEMBER,
      ROLES.PROJECT_MANAGER,
      ROLES.ADMIN,
      ROLES.SUPER_ADMIN,
    ]);
    expect(new Set(MATRIX_ROLE_ORDER)).toEqual(new Set(Object.values(ROLES)));
  });

  it('names where the answers come from, and every row points at a real rule', () => {
    const matrix = buildPermissionsMatrix();
    expect(matrix.source).toBe('server/permissions.ts');
    expect(matrix.capabilities.length).toBeGreaterThan(0);
    for (const cap of matrix.capabilities) {
      const fn = cap.source.split('(')[0];
      expect(permissions).toHaveProperty(fn);
      expect(typeof (permissions as Record<string, unknown>)[fn]).toBe('function');
    }
  });

  it('labels every role and capability in Indonesian, with no duplicate ids', () => {
    const matrix = buildPermissionsMatrix();
    const ids = matrix.capabilities.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const cap of matrix.capabilities) {
      expect(cap.label.length).toBeGreaterThan(0);
      expect(cap.description.length).toBeGreaterThan(0);
      // A function name must never leak into what an Admin reads (the plan: labels, not code).
      expect(cap.label).not.toContain('()');
      expect(cap.label).not.toMatch(/\b(?:can|is)[A-Z]/);
      expect(cap.cells.map((c) => c.role)).toEqual([...MATRIX_ROLE_ORDER]);
    }
    for (const role of matrix.roles) {
      expect(role.label.length).toBeGreaterThan(0);
      expect(role.description.length).toBeGreaterThan(0);
    }
  });
});

describe('every cell is the answer of the function that owns the rule', () => {
  it('asks permissions.ts rather than restating it', () => {
    for (const role of MATRIX_ROLE_ORDER) {
      expect(cell('home', role).note).toBe(permissions.homeFor(role));
      expect(cell('area-admin', role).granted).toBe(permissions.isAdminRole(role));
      expect(cell('area-dev', role).granted).toBe(permissions.canAccessDev(role));
      expect(cell('set-role', role).granted).toBe(permissions.canSetRole(role));
      expect(cell('impersonate', role).granted).toBe(permissions.canImpersonate(role));
      expect(cell('assignable', role).granted).toBe(permissions.isAssignableRole(role));
      expect(cell('act-on-member', role).granted).toBe(
        permissions.canActOnTarget(role, ROLES.MEMBER),
      );
      expect(cell('act-on-admin', role).granted).toBe(
        permissions.canActOnTarget(role, ROLES.ADMIN),
      );
    }
  });

  it('spells out the rules as they stand today, so the comparison above cannot be vacuous', () => {
    expect(row('home')).toEqual(['/app', '/app', '/dashboard', '/dev']);
    expect(row('area-admin')).toEqual([false, false, true, true]);
    expect(row('area-dev')).toEqual([false, false, false, true]);
    expect(row('set-role')).toEqual([false, false, false, true]);
    expect(row('act-on-member')).toEqual([false, false, true, true]);
    expect(row('act-on-admin')).toEqual([false, false, false, true]);
    expect(row('impersonate')).toEqual([false, false, false, true]);
    expect(row('assignable')).toEqual([true, true, true, false]);
  });

  it('a boolean cell never carries a note, and a value cell never a boolean', () => {
    for (const cap of buildPermissionsMatrix().capabilities) {
      for (const c of cap.cells) {
        if (c.granted === null) expect(typeof c.note).toBe('string');
        else expect(c.note).toBeNull();
      }
    }
  });
});

describe('the matrix follows permissions.ts when a rule changes', () => {
  const spies: Array<{ mockRestore: () => void }> = [];
  afterEach(() => {
    for (const s of spies.splice(0)) s.mockRestore();
  });

  it('reports the new answer after canImpersonate changes', () => {
    expect(row('impersonate')).toEqual([false, false, false, true]);
    spies.push(spyOn(permissions, 'canImpersonate').mockImplementation(() => true));
    expect(row('impersonate')).toEqual([true, true, true, true]);
  });

  it('reports the new answer after canActOnTarget and homeFor change', () => {
    spies.push(spyOn(permissions, 'canActOnTarget').mockImplementation(() => false));
    spies.push(spyOn(permissions, 'homeFor').mockImplementation(() => '/elsewhere'));
    expect(row('act-on-member')).toEqual([false, false, false, false]);
    expect(row('home')).toEqual(['/elsewhere', '/elsewhere', '/elsewhere', '/elsewhere']);
  });

  it('builds the cells on every call, never caching a stale answer', () => {
    const before = buildPermissionsMatrix();
    spies.push(spyOn(permissions, 'canSetRole').mockImplementation(() => true));
    const after = buildPermissionsMatrix();
    expect(before.capabilities.length).toBe(MATRIX_CAPABILITIES.length);
    expect(
      after.capabilities.find((c) => c.id === 'set-role')?.cells.map((c) => c.granted),
    ).toEqual([true, true, true, true]);
  });
});
