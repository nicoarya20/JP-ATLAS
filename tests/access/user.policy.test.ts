import { describe, expect, it } from 'bun:test';
import { DENY_CODES, DENY_UI, type DenyCode } from '../../server/access/decision';
import {
  canActOnUser,
  canInviteWithRole,
  canManageUsers,
  canRecordUserLeave,
  canSetUserRole,
  type Principal,
  type UserTarget,
} from '../../server/access/user.policy';
import { ROLES, type Role } from '../../server/permissions';

type Expect = 'allow' | DenyCode;
type Who = 'member' | 'pm' | 'admin' | 'sa';
type Target = Who | 'self';

const ROLE_OF: Record<Who, Role> = {
  member: ROLES.MEMBER,
  pm: ROLES.PROJECT_MANAGER,
  admin: ROLES.ADMIN,
  sa: ROLES.SUPER_ADMIN,
};
const WHO = Object.keys(ROLE_OF) as Who[];
const TARGETS: Target[] = [...WHO, 'self'];

// test-only: ids are fixtures; a "self" target shares the actor's id.
const principal = (who: Who, impersonating = false): Principal => ({
  id: `U-${who}`,
  appRole: ROLE_OF[who],
  impersonating,
});
const targetOf = (actor: Who, t: Target): UserTarget =>
  t === 'self'
    ? { id: `U-${actor}`, appRole: ROLE_OF[actor] }
    : { id: `T-${t}`, appRole: ROLE_OF[t] };

const result = (d: { ok: boolean; code?: DenyCode }): Expect =>
  d.ok ? 'allow' : (d.code as DenyCode);

const uniform = <T>(v: T): Record<Target, T> => ({ member: v, pm: v, admin: v, sa: v, self: v });
const A = 'allow' as const;
const P = 'TARGET_PROTECTED' as const;

// Expected outcomes are written out by hand (X2 §2E1), not derived from the implementation.
const ACT: Record<Who, Record<Target, Expect>> = {
  member: uniform('NOT_ADMIN'),
  pm: uniform('NOT_ADMIN'),
  admin: { member: A, pm: A, admin: P, sa: P, self: 'SELF_TARGET' },
  sa: { member: A, pm: A, admin: A, sa: P, self: 'SELF_TARGET' },
};

// SET_ROLE[actor][target][next]
const noOne = uniform<Record<Who, Expect>>({
  member: 'NOT_ADMIN',
  pm: 'NOT_ADMIN',
  admin: 'NOT_ADMIN',
  sa: 'NOT_ADMIN',
});
const row = (v: Expect): Record<Who, Expect> => ({ member: v, pm: v, admin: v, sa: v });
const adminMovesMemberPm = { member: A, pm: A, admin: P, sa: P } as const;
const saMovesBelowSa = { member: A, pm: A, admin: A, sa: P } as const;
const SET_ROLE: Record<Who, Record<Target, Record<Who, Expect>>> = {
  member: noOne,
  pm: noOne,
  admin: {
    member: adminMovesMemberPm,
    pm: adminMovesMemberPm,
    admin: row(P),
    sa: row(P),
    self: row('SELF_TARGET'),
  },
  sa: {
    member: saMovesBelowSa,
    pm: saMovesBelowSa,
    admin: saMovesBelowSa,
    sa: row(P),
    self: row('SELF_TARGET'),
  },
};

const INVITE: Record<Who, Record<Who, Expect>> = {
  member: row('NOT_ADMIN'),
  pm: row('NOT_ADMIN'),
  admin: adminMovesMemberPm,
  sa: saMovesBelowSa,
};

describe('canActOnUser', () => {
  const cases = WHO.flatMap((actor) => TARGETS.map((t) => [actor, t, ACT[actor][t]] as const));
  it.each(cases)('%s acting on %s => %s', (actor, t, expected) => {
    expect(result(canActOnUser(principal(actor), targetOf(actor, t)))).toBe(expected);
  });
});

describe('canSetUserRole', () => {
  const cases = WHO.flatMap((actor) =>
    TARGETS.flatMap((t) => WHO.map((next) => [actor, t, next, SET_ROLE[actor][t][next]] as const)),
  );
  it.each(cases)('%s sets %s -> %s => %s', (actor, t, next, expected) => {
    expect(result(canSetUserRole(principal(actor), targetOf(actor, t), ROLE_OF[next]))).toBe(
      expected,
    );
  });
});

describe('canInviteWithRole', () => {
  const cases = WHO.flatMap((actor) =>
    WHO.map((role) => [actor, role, INVITE[actor][role]] as const),
  );
  it.each(cases)('%s invites %s => %s', (actor, role, expected) => {
    expect(result(canInviteWithRole(principal(actor), ROLE_OF[role]))).toBe(expected);
  });
});

describe('canManageUsers', () => {
  it.each([
    ['member', 'NOT_ADMIN'],
    ['pm', 'NOT_ADMIN'],
    ['admin', 'allow'],
    ['sa', 'allow'],
  ] as const)('%s => %s', (who, expected) => {
    expect(result(canManageUsers(principal(who)))).toBe(expected);
  });
});

describe('canRecordUserLeave (P14 D3)', () => {
  it.each([
    ['member', 'NOT_ADMIN'],
    ['pm', 'NOT_ADMIN'],
    ['admin', 'allow'],
    ['sa', 'allow'],
  ] as const)('%s => %s', (who, expected) => {
    expect(result(canRecordUserLeave(principal(who)))).toBe(expected);
  });

  it('refuses while impersonating, because the audit entry would name the wrong person', () => {
    expect(result(canRecordUserLeave(principal('admin', true)))).toBe('IMPERSONATING');
    expect(result(canRecordUserLeave(principal('sa', true)))).toBe('IMPERSONATING');
  });
});

describe('impersonation (Q9)', () => {
  it.each(WHO.flatMap((a) => TARGETS.map((t) => [a, t] as const)))(
    '%s impersonating blocks acting on %s',
    (actor, t) => {
      const p = principal(actor, true);
      expect(result(canActOnUser(p, targetOf(actor, t)))).toBe('IMPERSONATING');
      expect(result(canSetUserRole(p, targetOf(actor, t), ROLES.MEMBER))).toBe('IMPERSONATING');
    },
  );

  it('does not block read-style gates (invite and area access follow the role)', () => {
    const p = principal('admin', true);
    expect(canManageUsers(p).ok).toBe(true);
    expect(canInviteWithRole(p, ROLES.MEMBER).ok).toBe(true);
  });
});

describe('named cases from R03 (Ayu = Admin, Boss = SA)', () => {
  const ayu = principal('admin');
  const boss = principal('sa');
  const member: UserTarget = { id: 'T-member', appRole: ROLES.MEMBER };
  const pm: UserTarget = { id: 'T-pm', appRole: ROLES.PROJECT_MANAGER };

  it('C36: Ayu Member->PM allowed, PM->Admin denied; Boss PM->Admin allowed', () => {
    expect(canSetUserRole(ayu, member, ROLES.PROJECT_MANAGER).ok).toBe(true);
    expect(result(canSetUserRole(ayu, pm, ROLES.ADMIN))).toBe('TARGET_PROTECTED');
    expect(canSetUserRole(boss, pm, ROLES.ADMIN).ok).toBe(true);
  });

  it('C37: suspend other Admin / self denied, Boss may suspend Ayu, other SA is protected', () => {
    expect(result(canActOnUser(ayu, { id: 'T-admin', appRole: ROLES.ADMIN }))).toBe(
      'TARGET_PROTECTED',
    );
    expect(result(canActOnUser(ayu, { id: ayu.id, appRole: ROLES.ADMIN }))).toBe('SELF_TARGET');
    expect(canActOnUser(boss, { id: ayu.id, appRole: ROLES.ADMIN }).ok).toBe(true);
    expect(result(canActOnUser(boss, { id: 'T-sa2', appRole: ROLES.SUPER_ADMIN }))).toBe(
      'TARGET_PROTECTED',
    );
  });

  it('C38: Ayu invites Admin denied, PM allowed', () => {
    expect(result(canInviteWithRole(ayu, ROLES.ADMIN))).toBe('TARGET_PROTECTED');
    expect(canInviteWithRole(ayu, ROLES.PROJECT_MANAGER).ok).toBe(true);
  });
});

describe('role normalisation and fail-closed input', () => {
  it('treats a legacy "user" target as a member', () => {
    const legacy = { id: 'T-legacy', appRole: 'user' as unknown as Role };
    expect(canActOnUser(principal('admin'), legacy).ok).toBe(true);
  });

  it('denies a role value the policy does not know', () => {
    const bogus = 'owner' as unknown as Role;
    expect(result(canInviteWithRole(principal('sa'), bogus))).toBe('TARGET_PROTECTED');
  });
});

// Added with S0B-17 to close S0B-13: ordering of the checks and the legacy role value on the actor side.
describe('check order and legacy actor role', () => {
  it('reports impersonation before the missing Admin role (Q9 is blocked regardless of role)', () => {
    const p = principal('member', true);
    expect(result(canActOnUser(p, targetOf('member', 'pm')))).toBe('IMPERSONATING');
  });

  it('reports the missing Admin role before self or protection', () => {
    const p = principal('pm');
    expect(result(canActOnUser(p, targetOf('pm', 'self')))).toBe('NOT_ADMIN');
    expect(result(canActOnUser(p, targetOf('pm', 'sa')))).toBe('NOT_ADMIN');
  });

  it('reads a legacy "user" actor as a member in every gate', () => {
    const legacy: Principal = {
      id: 'U-legacy',
      appRole: 'user' as unknown as Role,
      impersonating: false,
    };
    expect(result(canManageUsers(legacy))).toBe('NOT_ADMIN');
    expect(result(canActOnUser(legacy, targetOf('member', 'pm')))).toBe('NOT_ADMIN');
    expect(result(canInviteWithRole(legacy, ROLES.MEMBER))).toBe('NOT_ADMIN');
  });

  it('keeps the same grant ceiling for an invite as for a role change', () => {
    for (const actor of WHO) {
      for (const next of WHO) {
        const invite = result(canInviteWithRole(principal(actor), ROLE_OF[next]));
        const change = result(
          canSetUserRole(principal(actor), targetOf(actor, 'member'), ROLE_OF[next]),
        );
        expect(invite).toBe(change);
      }
    }
  });
});

describe('DENY_UI catalogue', () => {
  it('has an entry per code with an allowed status and a non-empty message', () => {
    expect(Object.keys(DENY_UI).sort()).toEqual([...DENY_CODES].sort());
    for (const code of DENY_CODES) {
      expect([403, 409, 410, 422]).toContain(DENY_UI[code].http);
      expect(DENY_UI[code].message.length).toBeGreaterThan(10);
    }
  });

  it('keeps the contract codes the S0.a handlers rely on', () => {
    expect(DENY_CODES).toEqual(
      expect.arrayContaining([
        'NOT_ADMIN',
        'SELF_TARGET',
        'TARGET_PROTECTED',
        'WRONG_STATE',
        'IMPERSONATING',
        'REASON_REQUIRED',
      ]),
    );
  });
});
