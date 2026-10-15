import { describe, expect, it } from 'bun:test';
import { allow, DENY_CODES, DENY_UI, deny } from '../../server/access/decision';
import { atLeast, LEVEL_RANK, LEVELS, type Level, levelOf } from '../../server/access/level';
import { ACCESS_RULES, type AccessRules } from '../../server/access/rules';
import type { Membership } from '../../server/access/types';
import { ROLES, type Role } from '../../server/permissions';
import { PM_ERRORS } from '../../server/pm/errors';
import { PERSONA_CODES, type PersonaCode, persona, personaNamed } from './fixtures';

// Expected level of each matrix column on the Atlas fixture project (R03 §2.2).
const EXPECTED: Record<PersonaCode, Level> = {
  SA: 'admin',
  AD: 'admin',
  'PM-K': 'manager',
  'PM-X': 'reader',
  'M-K': 'manager',
  AG: 'member',
  PT: 'viewer',
  BA: 'none',
};

const joinedAt = new Date('2026-09-01T00:00:00Z'); // test-only
const asMember = (role: 'manager' | 'member' | 'viewer'): Membership => ({ role, joinedAt });
const noReads: AccessRules = { ...ACCESS_RULES, P_A1_PM_NON_MEMBER_READS: false };

describe('levelOf', () => {
  it.each([...PERSONA_CODES])('gives persona %s the expected level', (code) => {
    const { principal, membership } = persona(code);
    expect(levelOf(principal, membership)).toBe(EXPECTED[code]);
  });

  it('treats both AG people the same and Admin like Super-admin (K6)', () => {
    const [dodi, rina] = [personaNamed('Dodi'), personaNamed('Rina')];
    expect(levelOf(dodi.principal, dodi.membership)).toBe(levelOf(rina.principal, rina.membership));
    const [boss, ayu] = [persona('SA'), persona('AD')];
    expect(levelOf(boss.principal, boss.membership)).toBe(levelOf(ayu.principal, ayu.membership));
  });

  it('lets Admin win over a weaker project role (Ayu is only an Observer on Portal Klien)', () => {
    const ayu = persona('AD');
    expect(ayu.membership?.role).toBe('viewer');
    expect(levelOf(ayu.principal, ayu.membership)).toBe('admin');
  });

  it('gives a Member-Manager and a PM-Manager the same level (K1)', () => {
    const [mira, nico] = [persona('M-K'), persona('PM-K')];
    expect(levelOf(mira.principal, mira.membership)).toBe(levelOf(nico.principal, nico.membership));
  });

  it('hides the project from a non-member PM when P_A1 is off, and only from them', () => {
    const lea = persona('PM-X');
    expect(levelOf(lea.principal, lea.membership, noReads)).toBe('none');
    for (const code of PERSONA_CODES.filter((c) => c !== 'PM-X')) {
      const { principal, membership } = persona(code);
      expect(levelOf(principal, membership, noReads)).toBe(EXPECTED[code]);
    }
  });

  it('never lets a non-PM non-member read through P_A1', () => {
    const bella = persona('BA');
    expect(
      levelOf(bella.principal, null, { ...ACCESS_RULES, P_A1_PM_NON_MEMBER_READS: true }),
    ).toBe('none');
  });

  it('ignores impersonation: it limits actions, not visibility (Q9)', () => {
    const boss = persona('SA').principal;
    expect(levelOf({ ...boss, impersonating: true }, null)).toBe('admin');
  });

  it('fails closed for a legacy or unknown app role', () => {
    const legacy = { id: 'U-old', appRole: 'user' as unknown as Role, impersonating: false };
    expect(levelOf(legacy, null)).toBe('none');
    expect(levelOf(legacy, asMember('viewer'))).toBe('viewer');
  });
});

describe('level ordering', () => {
  it('lists levels from strongest to weakest with strictly falling rank', () => {
    expect([...LEVELS]).toEqual(['admin', 'manager', 'member', 'viewer', 'reader', 'none']);
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVEL_RANK[LEVELS[i - 1]]).toBeGreaterThan(LEVEL_RANK[LEVELS[i]]);
    }
  });

  it('is monotonic: admin ⊇ manager ⊇ member ⊇ viewer ⊇ reader ⊇ none', () => {
    for (const a of LEVELS) {
      for (const b of LEVELS) {
        expect(atLeast(a, b)).toBe(LEVELS.indexOf(a) <= LEVELS.indexOf(b));
      }
    }
  });

  it('ranks levels the same way real principals order', () => {
    const ranks = PERSONA_CODES.map((c) => {
      const { principal, membership } = persona(c);
      return LEVEL_RANK[levelOf(principal, membership)];
    });
    // SA, AD, PM-K, PM-X, M-K, AG, PT, BA
    expect(ranks).toEqual([5, 5, 4, 1, 4, 3, 2, 0]);
  });

  it('keeps Admin above every project role for any app role', () => {
    for (const role of [ROLES.ADMIN, ROLES.SUPER_ADMIN]) {
      for (const m of [null, asMember('viewer'), asMember('member'), asMember('manager')]) {
        expect(levelOf({ id: 'U-x', appRole: role, impersonating: false }, m)).toBe('admin');
      }
    }
  });
});

describe('ACCESS_RULES', () => {
  it('ships the Q7/Q12 defaults and is read-only', () => {
    expect(ACCESS_RULES).toEqual({
      P_A1_PM_NON_MEMBER_READS: true,
      P_A1B_PM_NON_MEMBER_COMMENTS: false,
      T_A2_MEMBER_EDIT_SCOPE: 'own',
      T_A4_COMPLETE_FROM_TODO: true,
      T_A5_MEMBER_ENABLES_REVIEW: true,
      PROJECT_CLOSED_ALLOWS_TASK_WRITES: true,
      MEMBER_CAN_LEAVE_PROJECT: false,
    });
    expect(Object.isFrozen(ACCESS_RULES)).toBe(true);
  });
});

describe('decision helpers', () => {
  it('builds allow and deny decisions', () => {
    expect(allow()).toEqual({ ok: true });
    expect(deny('NOT_MANAGER')).toEqual({ ok: false, code: 'NOT_MANAGER' });
  });
});

describe('DENY_UI', () => {
  it('has exactly one entry per DenyCode', () => {
    expect(Object.keys(DENY_UI).sort()).toEqual([...DENY_CODES].sort());
  });

  it.each([...DENY_CODES])(
    '%s agrees with the API catalogue and has an actionable message',
    (code) => {
      const entry = DENY_UI[code];
      expect<number>(entry.http).toBe(PM_ERRORS[code].http);
      expect(['hide', 'disable']).toContain(entry.ui);
      expect(entry.message.length).toBeGreaterThan(10);
      expect(entry.message.endsWith('.')).toBe(true);
    },
  );

  it('disables locked states and hides irrelevant controls (R03 §3.7)', () => {
    for (const code of [
      'LOCKED_BY_STATUS',
      'REVIEW_REQUIRED',
      'SELF_REVIEW',
      'LAST_MANAGER',
      'IS_LEAD',
      'PROJECT_IN_TRASH',
    ] as const) {
      expect(DENY_UI[code].ui).toBe('disable');
    }
    for (const code of [
      'NOT_MANAGER',
      'NOT_MEMBER',
      'NOT_OWNER',
      'WRONG_STATE',
      'NOT_APP_ROLE',
    ] as const) {
      expect(DENY_UI[code].ui).toBe('hide');
    }
  });
});
