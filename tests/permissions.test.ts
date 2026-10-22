import { describe, expect, test } from 'bun:test';
import {
  ASSIGNABLE_ROLES,
  canAccessDev,
  canActOnTarget,
  canImpersonate,
  canSetRole,
  homeFor,
  isAdminRole,
  isAssignableRole,
  isSuperAdminEmail,
  normalizeRole,
  ROLES,
  reconcileRole,
  roles,
} from '../server/permissions';

const envSet = (...emails: string[]) => new Set(emails.map((e) => e.toLowerCase()));

describe('ROLES', () => {
  test('has exactly the four role values', () => {
    expect(Object.values(ROLES)).toEqual(['member', 'project_manager', 'admin', 'super-admin']);
  });
  test('Better Auth access control defines every role', () => {
    expect(Object.keys(roles).sort()).toEqual(Object.values(ROLES).sort());
  });
});

describe('normalizeRole', () => {
  test.each([
    ['member', ROLES.MEMBER],
    ['project_manager', ROLES.PROJECT_MANAGER],
    ['admin', ROLES.ADMIN],
    ['super-admin', ROLES.SUPER_ADMIN],
  ])('keeps known role %s', (input, expected) => {
    expect(normalizeRole(input)).toBe(expected);
  });
  test('maps the legacy "user" value to member', () => {
    expect(normalizeRole('user')).toBe(ROLES.MEMBER);
  });
  test.each([[null], [undefined], ['editor'], [''], [42], ['Admin']])(
    'maps null/unknown (%p) to member',
    (input) => {
      expect(normalizeRole(input)).toBe(ROLES.MEMBER);
    },
  );
});

describe('isAdminRole', () => {
  test.each([
    ['admin', true],
    ['super-admin', true],
    ['project_manager', false],
    ['member', false],
    ['user', false],
    [null, false],
  ])('%p -> %p', (role, expected) => {
    expect(isAdminRole(role)).toBe(expected);
  });
});

describe('canAccessDev', () => {
  test.each([
    ['super-admin', true],
    ['admin', false],
    ['project_manager', false],
    ['member', false],
    ['user', false],
    [null, false],
  ])('%p -> %p', (role, expected) => {
    expect(canAccessDev(role)).toBe(expected);
  });
});

describe('isSuperAdminEmail', () => {
  const set = envSet('boss@acme.com');
  test('matches case-insensitively and trims', () => {
    expect(isSuperAdminEmail('boss@acme.com', set)).toBe(true);
    expect(isSuperAdminEmail('  BOSS@ACME.COM ', set)).toBe(true);
    expect(isSuperAdminEmail('other@acme.com', set)).toBe(false);
  });
});

describe('reconcileRole', () => {
  const set = envSet('boss@acme.com');
  test('a verified email in env is super-admin, whatever is stored', () => {
    expect(reconcileRole('boss@acme.com', 'member', set, true)).toBe(ROLES.SUPER_ADMIN);
    expect(reconcileRole('boss@acme.com', 'user', set, true)).toBe(ROLES.SUPER_ADMIN);
    expect(reconcileRole('boss@acme.com', null, set, true)).toBe(ROLES.SUPER_ADMIN);
    expect(reconcileRole('BOSS@acme.com', 'project_manager', set, true)).toBe(ROLES.SUPER_ADMIN);
  });
  test('an unverified email in env is NOT super-admin (F2)', () => {
    expect(reconcileRole('boss@acme.com', 'member', set, false)).toBe(ROLES.MEMBER);
    expect(reconcileRole('boss@acme.com', null, set, false)).toBe(ROLES.MEMBER);
    expect(reconcileRole('boss@acme.com', 'admin', set, false)).toBe(ROLES.ADMIN);
  });
  test('a stored super-admin whose email is unverified is demoted to member', () => {
    expect(reconcileRole('boss@acme.com', 'super-admin', set, false)).toBe(ROLES.MEMBER);
  });
  test('a stored super-admin whose email left env is demoted to member', () => {
    expect(reconcileRole('ex@acme.com', 'super-admin', set, true)).toBe(ROLES.MEMBER);
    expect(reconcileRole('ex@acme.com', 'super-admin', set, false)).toBe(ROLES.MEMBER);
  });
  test('keeps admin/project_manager/member when not in env', () => {
    expect(reconcileRole('a@acme.com', 'admin', set, true)).toBe(ROLES.ADMIN);
    expect(reconcileRole('p@acme.com', 'project_manager', set, true)).toBe(ROLES.PROJECT_MANAGER);
    expect(reconcileRole('u@acme.com', 'member', set, true)).toBe(ROLES.MEMBER);
  });
  test('legacy "user" and null read as member', () => {
    expect(reconcileRole('u@acme.com', 'user', set, true)).toBe(ROLES.MEMBER);
    expect(reconcileRole('u@acme.com', null, set, false)).toBe(ROLES.MEMBER);
  });
});

describe('canSetRole / canImpersonate (semantics unchanged until S0A-09)', () => {
  test('super-admin only', () => {
    expect(canSetRole('super-admin')).toBe(true);
    expect(canSetRole('admin')).toBe(false);
    expect(canSetRole('project_manager')).toBe(false);
    expect(canSetRole('member')).toBe(false);
    expect(canImpersonate('super-admin')).toBe(true);
    expect(canImpersonate('admin')).toBe(false);
    expect(canImpersonate('project_manager')).toBe(false);
  });
});

describe('canActOnTarget (semantics unchanged until S0A-09)', () => {
  test('super-admin acts on anyone', () => {
    expect(canActOnTarget('super-admin', 'admin')).toBe(true);
    expect(canActOnTarget('super-admin', 'super-admin')).toBe(true);
    expect(canActOnTarget('super-admin', 'member')).toBe(true);
  });
  test('admin acts on member and project_manager but not on admins', () => {
    expect(canActOnTarget('admin', 'member')).toBe(true);
    expect(canActOnTarget('admin', 'project_manager')).toBe(true);
    expect(canActOnTarget('admin', 'admin')).toBe(false);
    expect(canActOnTarget('admin', 'super-admin')).toBe(false);
  });
  test('member and project_manager act on no one', () => {
    expect(canActOnTarget('member', 'member')).toBe(false);
    expect(canActOnTarget('project_manager', 'member')).toBe(false);
  });
});

describe('homeFor', () => {
  test.each([
    ['member', '/app'],
    ['project_manager', '/app'],
    ['admin', '/dashboard'],
    ['super-admin', '/dev'],
  ])('%s -> %s', (role, home) => {
    expect(homeFor(role)).toBe(home);
  });
  test('legacy "user", null and unknown fall back to the member area', () => {
    expect(homeFor('user')).toBe('/app');
    expect(homeFor(null)).toBe('/app');
    expect(homeFor('editor')).toBe('/app');
  });
});

describe('isAssignableRole', () => {
  test('member, project_manager and admin are assignable via UI', () => {
    expect(ASSIGNABLE_ROLES).toEqual(['member', 'project_manager', 'admin']);
    expect(isAssignableRole('member')).toBe(true);
    expect(isAssignableRole('project_manager')).toBe(true);
    expect(isAssignableRole('admin')).toBe(true);
  });
  test('super-admin, the legacy "user" value and unknown values are not', () => {
    expect(isAssignableRole('super-admin')).toBe(false);
    expect(isAssignableRole('user')).toBe(false);
    expect(isAssignableRole('editor')).toBe(false);
  });
});
