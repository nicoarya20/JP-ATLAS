import { describe, expect, it } from 'bun:test';
import {
  ACCOUNT_TRANSITIONS,
  APPROVAL_STATUSES,
  type ApprovalStatus,
  canTransitionAccount,
  isValidRejectReason,
  REJECT_REASON_MAX,
  REJECT_REASON_MIN,
} from '../../server/access/account-status.rules';
import type { DenyCode } from '../../server/access/decision';
import type { Principal, UserTarget } from '../../server/access/user.policy';
import { ROLES } from '../../server/permissions';

// test-only fixtures
const admin: Principal = { id: 'U-admin', appRole: ROLES.ADMIN, impersonating: false };
const boss: Principal = { id: 'U-sa', appRole: ROLES.SUPER_ADMIN, impersonating: false };
const member: UserTarget = { id: 'T-member', appRole: ROLES.MEMBER };
const GOOD_REASON = 'Email tidak dikenali tim';

const LEGAL = new Set(['pending>approved', 'pending>rejected', 'rejected>approved']);
const PAIRS = APPROVAL_STATUSES.flatMap((from) =>
  APPROVAL_STATUSES.map((to) => [from, to] as const),
);

// A default parameter would swallow an explicit `undefined`, so the reason is passed as an optional tuple.
function run(from: ApprovalStatus, to: ApprovalStatus, ...reason: [(string | null | undefined)?]) {
  const given = reason.length > 0 ? reason[0] : GOOD_REASON;
  return canTransitionAccount(from, to, { actor: admin, target: member, reason: given });
}
const code = (d: ReturnType<typeof run>): 'allow' | DenyCode => (d.ok ? 'allow' : d.code);

describe('canTransitionAccount', () => {
  it('has exactly the three legal transitions', () => {
    expect(ACCOUNT_TRANSITIONS.map(([f, t]) => `${f}>${t}`).sort()).toEqual([...LEGAL].sort());
  });

  it.each(PAIRS)('%s -> %s', (from, to) => {
    expect(code(run(from, to))).toBe(LEGAL.has(`${from}>${to}`) ? 'allow' : 'WRONG_STATE');
  });

  it('tells approved -> rejected to use suspend instead (WRONG_STATE even with a reason)', () => {
    expect(code(run('approved', 'rejected'))).toBe('WRONG_STATE');
  });

  it('treats an unknown stored status as a wrong state', () => {
    expect(code(run('banned' as unknown as ApprovalStatus, 'approved'))).toBe('WRONG_STATE');
  });
});

describe('reject reason (3-200 characters)', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty', ''],
    ['spaces only', '     '],
    ['too short', 'ab'],
    ['too short once trimmed', '  ab  '],
    ['too long', 'x'.repeat(REJECT_REASON_MAX + 1)],
  ])('rejecting with %s => REASON_REQUIRED', (_name, reason) => {
    expect(code(run('pending', 'rejected', reason))).toBe('REASON_REQUIRED');
  });

  it.each([
    ['minimum length', 'x'.repeat(REJECT_REASON_MIN)],
    ['maximum length', 'x'.repeat(REJECT_REASON_MAX)],
    ['padded but long enough', '  abc  '],
  ])('rejecting with %s is allowed', (_name, reason) => {
    expect(code(run('pending', 'rejected', reason))).toBe('allow');
  });

  it('counts a multi-unit character once', () => {
    expect(isValidRejectReason('😀😀😀')).toBe(true);
  });

  it('does not require a reason for approvals', () => {
    expect(code(run('pending', 'approved', undefined))).toBe('allow');
    expect(code(run('rejected', 'approved', ''))).toBe('allow');
  });

  it('reports a stale transition before a missing reason', () => {
    expect(code(run('approved', 'rejected', ''))).toBe('WRONG_STATE');
  });
});

describe('who may transition', () => {
  const input = (actor: Principal, target: UserTarget) => ({ actor, target, reason: GOOD_REASON });

  it('requires an Admin or Super-admin actor', () => {
    for (const role of [ROLES.MEMBER, ROLES.PROJECT_MANAGER]) {
      const actor: Principal = { id: 'U-x', appRole: role, impersonating: false };
      expect(canTransitionAccount('pending', 'approved', input(actor, member))).toEqual({
        ok: false,
        code: 'NOT_ADMIN',
      });
    }
  });

  it('denies self and protected targets before looking at the status', () => {
    const self: UserTarget = { id: admin.id, appRole: ROLES.ADMIN };
    expect(canTransitionAccount('approved', 'rejected', input(admin, self))).toEqual({
      ok: false,
      code: 'SELF_TARGET',
    });
    const peer: UserTarget = { id: 'T-admin', appRole: ROLES.ADMIN };
    expect(canTransitionAccount('pending', 'approved', input(admin, peer))).toEqual({
      ok: false,
      code: 'TARGET_PROTECTED',
    });
    expect(canTransitionAccount('pending', 'approved', input(boss, peer)).ok).toBe(true);
  });

  it('blocks every transition while impersonating (Q9)', () => {
    const impersonating: Principal = { ...boss, impersonating: true };
    for (const [from, to] of PAIRS) {
      expect(canTransitionAccount(from, to, input(impersonating, member))).toEqual({
        ok: false,
        code: 'IMPERSONATING',
      });
    }
  });
});

// Added with S0B-17 to close S0B-13: R09 A4 asks for "who may" across Admin vs Super-admin vs an Admin target.
describe('who may transition: role × target matrix', () => {
  const targets = {
    member: { id: 'T-member', appRole: ROLES.MEMBER },
    pm: { id: 'T-pm', appRole: ROLES.PROJECT_MANAGER },
    admin: { id: 'T-admin', appRole: ROLES.ADMIN },
    sa: { id: 'T-sa', appRole: ROLES.SUPER_ADMIN },
  } satisfies Record<string, UserTarget>;
  const actors = { admin, boss } satisfies Record<string, Principal>;
  const input = (actor: Principal, target: UserTarget) => ({ actor, target, reason: GOOD_REASON });

  // Expected outcomes are hand-written (X2 §2E1): an Admin acts only on Member/PM, a Super-admin also on Admin.
  it.each([
    ['admin', 'member', 'allow'],
    ['admin', 'pm', 'allow'],
    ['admin', 'admin', 'TARGET_PROTECTED'],
    ['admin', 'sa', 'TARGET_PROTECTED'],
    ['boss', 'member', 'allow'],
    ['boss', 'pm', 'allow'],
    ['boss', 'admin', 'allow'],
    ['boss', 'sa', 'TARGET_PROTECTED'],
  ] as const)('%s moves a %s from rejected to approved => %s', (who, target, expected) => {
    expect(
      code(canTransitionAccount('rejected', 'approved', input(actors[who], targets[target]))),
    ).toBe(expected);
  });

  it('checks who may act before whether the transition is legal', () => {
    const plainMember: Principal = { id: 'U-m', appRole: ROLES.MEMBER, impersonating: false };
    expect(
      code(
        canTransitionAccount('approved', 'rejected', {
          actor: plainMember,
          target: member,
          reason: '',
        }),
      ),
    ).toBe('NOT_ADMIN');
  });

  it('reads a legacy "user" role on the actor as a member, so it is not an Admin', () => {
    const legacy: Principal = { id: 'U-legacy', appRole: 'user' as never, impersonating: false };
    expect(code(canTransitionAccount('pending', 'approved', input(legacy, member)))).toBe(
      'NOT_ADMIN',
    );
  });
});
