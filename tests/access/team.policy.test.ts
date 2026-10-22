/**
 * Team load visibility (S6 M01, rule D10 in `rencana/P7-s6-tim.md` §5): the role × relationship
 * matrix behind `loadScopeFor`, and who is offered "sort by overdue".
 *
 * The matrix is the acceptance criterion of M01, so it is spelled out as a table rather than
 * derived: a rule that quietly widens shows up here as an edited expectation, not as a pass.
 */
import { describe, expect, it } from 'bun:test';
import type { LoadScope } from '../../server/access/team.policy';
import { canSortByLoad, loadScopeFor } from '../../server/access/team.policy';
import type { Principal, ProjectRole } from '../../server/access/types';
import { ROLES, type Role } from '../../server/permissions';

// test-only: Atlas (A) and Beta (B) are the two fixture projects; Gamma is the one nobody shares.
const A = 'P-atlas';
const B = 'P-beta';
const GAMMA = 'P-gamma';

const who = (id: string, appRole: Role, impersonating = false): Principal => ({
  id,
  appRole,
  impersonating,
});
const member = (entries: ReadonlyArray<[string, ProjectRole]>): ReadonlyMap<string, ProjectRole> =>
  new Map(entries);

/** The matrix columns: who the viewer is looking at. */
const TARGETS = {
  sharesA: { id: 'U-target-a', projects: [A] },
  sharesB: { id: 'U-target-b', projects: [B] },
  sharesNone: { id: 'U-stranger', projects: [GAMMA] },
} as const;

/** Readable form of a scope, so an expectation reads like the D10 table. */
function shape(scope: LoadScope): 'all' | 'none' | string {
  if ('all' in scope) return 'all';
  if ('none' in scope) return 'none';
  return [...scope.projectIds].sort().join('+');
}

type Viewer = {
  /** The D10 row this persona stands for. */
  name: string;
  principal: Principal;
  membership: ReadonlyMap<string, ProjectRole>;
  /** Expected scope against someone sharing A, sharing B, and sharing nothing. */
  expect: readonly [string, string, string];
};

const VIEWERS: readonly Viewer[] = [
  {
    name: 'Admin (no memberships at all)',
    principal: who('U-ayu', ROLES.ADMIN),
    membership: member([]),
    expect: ['all', 'all', 'all'],
  },
  {
    name: 'Super-admin',
    principal: who('U-boss', ROLES.SUPER_ADMIN),
    membership: member([]),
    expect: ['all', 'all', 'all'],
  },
  {
    name: 'Admin who is only an Observer on A (account role wins, K6)',
    principal: who('U-ayu', ROLES.ADMIN),
    membership: member([[A, 'viewer']]),
    expect: ['all', 'all', 'all'],
  },
  {
    name: 'PM managing A',
    principal: who('U-nico', ROLES.PROJECT_MANAGER),
    membership: member([[A, 'manager']]),
    expect: [A, 'none', 'none'],
  },
  {
    name: 'PM managing A but only a Member on B',
    principal: who('U-nico', ROLES.PROJECT_MANAGER),
    membership: member([
      [A, 'manager'],
      [B, 'member'],
    ]),
    expect: [A, 'none', 'none'],
  },
  {
    name: 'Member appointed manager of A (K1)',
    principal: who('U-mira', ROLES.MEMBER),
    membership: member([[A, 'manager']]),
    expect: [A, 'none', 'none'],
  },
  {
    name: 'Member on A and B',
    principal: who('U-dodi', ROLES.MEMBER),
    membership: member([
      [A, 'member'],
      [B, 'member'],
    ]),
    expect: ['none', 'none', 'none'],
  },
  {
    name: 'Observer on A and B',
    principal: who('U-sri', ROLES.MEMBER),
    membership: member([
      [A, 'viewer'],
      [B, 'viewer'],
    ]),
    expect: ['none', 'none', 'none'],
  },
  {
    name: 'PM who is a member of nothing',
    principal: who('U-lea', ROLES.PROJECT_MANAGER),
    membership: member([]),
    expect: ['none', 'none', 'none'],
  },
  {
    name: 'Member of nothing at all',
    principal: who('U-bella', ROLES.MEMBER),
    membership: member([]),
    expect: ['none', 'none', 'none'],
  },
];

describe('loadScopeFor — D10 matrix of role × relationship', () => {
  for (const v of VIEWERS) {
    const cols = [TARGETS.sharesA, TARGETS.sharesB, TARGETS.sharesNone] as const;
    it.each(cols.map((t, i) => [t.id, t.projects, v.expect[i]] as const))(
      `${v.name} → %s`,
      (targetId, projects, want) => {
        const scope = loadScopeFor(v.principal, targetId, v.membership, projects);
        expect(shape(scope)).toBe(want);
      },
    );
  }

  it.each(VIEWERS.map((v) => [v.name, v] as const))('%s sees all of their own tasks', (_n, v) => {
    const own = loadScopeFor(v.principal, v.principal.id, v.membership, [A, B, GAMMA]);
    expect(shape(own)).toBe('all');
    // Even with no membership row at all: a person's own numbers are never hidden from them.
    expect(shape(loadScopeFor(v.principal, v.principal.id, member([]), []))).toBe('all');
  });
});

describe('loadScopeFor — scope contents', () => {
  const nico = who('U-nico', ROLES.PROJECT_MANAGER);

  it('returns every shared project the viewer manages, not just the first', () => {
    const membership = member([
      [A, 'manager'],
      [B, 'manager'],
      [GAMMA, 'member'],
    ]);
    const scope = loadScopeFor(nico, 'U-target', membership, [A, B, GAMMA]);
    expect(shape(scope)).toBe([A, B].sort().join('+'));
    expect('projectIds' in scope && scope.projectIds.has(GAMMA)).toBe(false);
  });

  it('drops a managed project the target is not in', () => {
    const scope = loadScopeFor(nico, 'U-target', member([[A, 'manager']]), [B]);
    expect(shape(scope)).toBe('none');
  });

  it('never answers with an empty projectIds set, so SQL cannot fall back to unfiltered', () => {
    const scope = loadScopeFor(nico, 'U-target', member([[A, 'manager']]), []);
    expect(scope).toEqual({ none: true });
    expect('projectIds' in scope).toBe(false);
  });

  it('ignores a duplicated project id in the target list', () => {
    const scope = loadScopeFor(nico, 'U-target', member([[A, 'manager']]), [A, A]);
    expect('projectIds' in scope && scope.projectIds.size).toBe(1);
  });

  it('is unaffected by impersonation: Team is read-only (Q9)', () => {
    const acting = who('U-boss', ROLES.SUPER_ADMIN, true);
    expect(shape(loadScopeFor(acting, 'U-target', member([]), [A]))).toBe('all');
    const pm = who('U-nico', ROLES.PROJECT_MANAGER, true);
    expect(shape(loadScopeFor(pm, 'U-target', member([[A, 'manager']]), [A]))).toBe(A);
  });

  it('fails closed for a legacy or unknown account role', () => {
    const legacy = who('U-old', 'user' as unknown as Role);
    expect(shape(loadScopeFor(legacy, 'U-target', member([]), [A]))).toBe('none');
    expect(shape(loadScopeFor(legacy, 'U-old', member([]), [A]))).toBe('all');
  });

  it('hands back a scope the caller cannot mutate into a wider one', () => {
    const all = loadScopeFor(who('U-ayu', ROLES.ADMIN), 'U-target', member([]), [A]);
    const none = loadScopeFor(who('U-bella', ROLES.MEMBER), 'U-target', member([]), [A]);
    expect(Object.isFrozen(all)).toBe(true);
    expect(Object.isFrozen(none)).toBe(true);
  });
});

describe('canSortByLoad', () => {
  it.each([
    ['Admin without memberships', who('U-ayu', ROLES.ADMIN), member([]), true],
    ['Super-admin without memberships', who('U-boss', ROLES.SUPER_ADMIN), member([]), true],
    [
      'PM managing one project',
      who('U-nico', ROLES.PROJECT_MANAGER),
      member([[A, 'manager']]),
      true,
    ],
    ['Member appointed manager (K1)', who('U-mira', ROLES.MEMBER), member([[A, 'manager']]), true],
    [
      'PM managing B while only a Member on A',
      who('U-nico', ROLES.PROJECT_MANAGER),
      member([
        [A, 'member'],
        [B, 'manager'],
      ]),
      true,
    ],
    [
      'Member on two projects',
      who('U-dodi', ROLES.MEMBER),
      member([
        [A, 'member'],
        [B, 'member'],
      ]),
      false,
    ],
    ['Observer', who('U-sri', ROLES.MEMBER), member([[A, 'viewer']]), false],
    ['PM who is a member of nothing', who('U-lea', ROLES.PROJECT_MANAGER), member([]), false],
    ['Member of nothing', who('U-bella', ROLES.MEMBER), member([]), false],
  ] as const)('%s', (_name, principal, membership, want) => {
    expect(canSortByLoad(principal, membership)).toBe(want);
  });

  // The direction that matters for privacy: the control is never offered to someone who would then
  // have nothing to sort. (The reverse does not hold — a manager of a project nobody else is in may
  // sort a list in which every other row is scoreless.)
  it('is never true for a viewer who may score nobody but themselves', () => {
    for (const v of VIEWERS) {
      if (canSortByLoad(v.principal, v.membership)) continue;
      for (const t of [TARGETS.sharesA, TARGETS.sharesB, TARGETS.sharesNone]) {
        expect(shape(loadScopeFor(v.principal, t.id, v.membership, t.projects))).toBe('none');
      }
    }
  });
});
