import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DENY_UI } from '../../server/access/decision';
import { isPmOrAbove } from '../../server/access/level';
import {
  canCreateProject,
  canManageProject,
  canTrashProject,
  canViewProject,
  clampListScope,
  matchesProjectScope,
  NOT_VISIBLE,
  type ProjectListScope,
  projectListScope,
} from '../../server/access/project.policy';
import { ACCESS_RULES } from '../../server/access/rules';
import type { ProjectSubject } from '../../server/access/types';
import { PM_ERRORS } from '../../server/pm/errors';
import { PERSONA_CODES, type PersonaCode, persona } from './fixtures';

// Atlas from R03 §3.8: Nico is the Lead; the persona fixtures hold everyone's membership.
const ATLAS: ProjectSubject = {
  id: 'P-atlas',
  status: 'active',
  leadId: 'U-nico',
  deletedAt: null,
  deletedBy: null,
};
const TRASHED: ProjectSubject = {
  ...ATLAS,
  deletedAt: new Date('2026-10-01T00:00:00Z'),
  deletedBy: 'U-nico',
};
const code = (d: { ok: boolean; code?: string }) => (d.ok ? 'allow' : d.code);

// Expected results of the permission matrix (R03 §2.2) in PERSONA_CODES order:
// SA, AD, PM-K, PM-X, M-K, AG, PT, BA. Written out by hand, never derived from the policy.
const MATRIX: Record<string, string[]> = {
  view: ['allow', 'allow', 'allow', 'allow', 'allow', 'allow', 'allow', 'NOT_VISIBLE'],
  create: [
    'allow',
    'allow',
    'allow',
    'allow',
    'NOT_APP_ROLE',
    'NOT_APP_ROLE',
    'NOT_APP_ROLE',
    'NOT_APP_ROLE',
  ],
  manage: [
    'allow',
    'allow',
    'allow',
    'NOT_MANAGER',
    'allow',
    'NOT_MANAGER',
    'NOT_MANAGER',
    'NOT_VISIBLE',
  ],
  trash: [
    'allow',
    'allow',
    'allow',
    'NOT_MANAGER',
    'ROLE_CANNOT_TRASH',
    'NOT_MANAGER',
    'NOT_MANAGER',
    'NOT_VISIBLE',
  ],
};
const expected = (action: string, c: PersonaCode) => MATRIX[action][PERSONA_CODES.indexOf(c)];

describe('R03 cases C01-C06', () => {
  it('C01: a member (Dodi) can view Atlas', () => {
    const { principal, membership } = persona('AG');
    expect(canViewProject(principal, ATLAS, membership)).toEqual({ ok: true });
  });

  it('C02: a non-member Member (Bella) gets NOT_VISIBLE, which is HTTP 404', () => {
    const { principal, membership } = persona('BA');
    expect(canViewProject(principal, ATLAS, membership)).toEqual({
      ok: false,
      code: 'NOT_VISIBLE',
    });
    // Mapped to NOT_FOUND so a hidden project looks the same as a missing one (D8).
    expect(PM_ERRORS.NOT_FOUND.http).toBe(404);
  });

  it('C03: a non-member PM (Lea) can view but not update (NOT_MANAGER, hidden button)', () => {
    const { principal, membership } = persona('PM-X');
    expect(canViewProject(principal, ATLAS, membership).ok).toBe(true);
    expect(canManageProject(principal, ATLAS, membership)).toEqual({
      ok: false,
      code: 'NOT_MANAGER',
    });
    expect(DENY_UI.NOT_MANAGER.ui).toBe('hide');
  });

  it('C04: Dodi cannot create a project, Nico can, Mira (Member-manager) cannot', () => {
    expect(code(canCreateProject(persona('AG').principal))).toBe('NOT_APP_ROLE');
    expect(code(canCreateProject(persona('PM-K').principal))).toBe('allow');
    expect(code(canCreateProject(persona('M-K').principal))).toBe('NOT_APP_ROLE');
  });

  it('C05: a Member who manages the project (Mira) can update it (K1)', () => {
    const { principal, membership } = persona('M-K');
    expect(canManageProject(principal, ATLAS, membership)).toEqual({ ok: true });
  });

  it('C06: an Admin who is only an Observer (Ayu) can update it (K6)', () => {
    const { principal, membership } = persona('AD');
    expect(membership?.role).toBe('viewer');
    expect(canManageProject(principal, ATLAS, membership)).toEqual({ ok: true });
  });
});

describe('permission matrix E2: project actions', () => {
  it.each(PERSONA_CODES)('%s: view', (c) => {
    const { principal, membership } = persona(c);
    expect(code(canViewProject(principal, ATLAS, membership))).toBe(expected('view', c));
  });

  it.each(PERSONA_CODES)('%s: create', (c) => {
    expect(code(canCreateProject(persona(c).principal))).toBe(expected('create', c));
  });

  // update and setStatus are one rule (`project.update/setStatus/…` share a matrix row), so one function.
  it.each(PERSONA_CODES)('%s: update and setStatus', (c) => {
    const { principal, membership } = persona(c);
    expect(code(canManageProject(principal, ATLAS, membership))).toBe(expected('manage', c));
  });

  it.each(PERSONA_CODES)('%s: trash', (c) => {
    const { principal, membership } = persona(c);
    expect(code(canTrashProject(principal, ATLAS, membership))).toBe(expected('trash', c));
  });
});

describe('invariants', () => {
  const decisions = (c: PersonaCode, project: ProjectSubject) => {
    const { principal, membership } = persona(c);
    return [
      code(canViewProject(principal, project, membership)),
      code(canCreateProject(principal)),
      code(canManageProject(principal, project, membership)),
    ];
  };

  it('Super-admin and Admin decide every project action alike, trash included', () => {
    for (const project of [ATLAS, TRASHED]) {
      expect(decisions('SA', project)).toEqual(decisions('AD', project));
      const sa = persona('SA');
      const ad = persona('AD');
      expect(code(canTrashProject(sa.principal, project, sa.membership))).toBe(
        code(canTrashProject(ad.principal, project, ad.membership)),
      );
    }
  });

  it('a PM-manager and a Member-manager match on view/update/setStatus except create and trash', () => {
    // `create` is app-level (PM yes, Member no), so the project-scoped actions are compared.
    for (const project of [ATLAS, TRASHED]) {
      const [pmView, , pmManage] = decisions('PM-K', project);
      const [mView, , mManage] = decisions('M-K', project);
      expect(pmView).toBe(mView);
      expect(pmManage).toBe(mManage);
    }
  });

  it('the only trash difference between PM-K and M-K is ROLE_CANNOT_TRASH', () => {
    const pm = persona('PM-K');
    const mk = persona('M-K');
    expect(code(canTrashProject(pm.principal, ATLAS, pm.membership))).toBe('allow');
    expect(code(canTrashProject(mk.principal, ATLAS, mk.membership))).toBe('ROLE_CANNOT_TRASH');
  });

  it('keeps level branching out of the policies (no appRole reads)', () => {
    for (const file of ['project.policy.ts', 'members.policy.ts']) {
      const src = readFileSync(path.join(import.meta.dir, '../../server/access', file), 'utf8');
      expect(src).not.toMatch(/\.appRole/);
    }
  });
});

describe('canTrashProject', () => {
  it('lets the flag flip only the Member-manager result', () => {
    const rules = { ...ACCESS_RULES, MEMBER_MANAGER_CAN_TRASH_PROJECT: true };
    for (const c of PERSONA_CODES) {
      const { principal, membership } = persona(c);
      const want = c === 'M-K' ? 'allow' : expected('trash', c);
      expect(code(canTrashProject(principal, ATLAS, membership, rules))).toBe(want);
    }
  });

  it('defaults the flag to false', () => {
    expect(ACCESS_RULES.MEMBER_MANAGER_CAN_TRASH_PROJECT).toBe(false);
  });

  it.each(PERSONA_CODES)(
    '%s: IMPERSONATING while impersonating, ahead of every other check',
    (c) => {
      const { principal, membership } = persona(c);
      const acting = { ...principal, impersonating: true };
      expect(canTrashProject(acting, ATLAS, membership)).toEqual({
        ok: false,
        code: 'IMPERSONATING',
      });
    },
  );

  it('does not block non-destructive actions while impersonating', () => {
    const { principal, membership } = persona('SA');
    const acting = { ...principal, impersonating: true };
    expect(canManageProject(acting, ATLAS, membership).ok).toBe(true);
    expect(canViewProject(acting, ATLAS, membership).ok).toBe(true);
  });

  it('reports PROJECT_IN_TRASH for managers before the role rule', () => {
    for (const c of ['SA', 'AD', 'PM-K', 'M-K'] as const) {
      const { principal, membership } = persona(c);
      expect(canTrashProject(principal, TRASHED, membership)).toEqual({
        ok: false,
        code: 'PROJECT_IN_TRASH',
      });
    }
  });
});

describe('canManageProject and canViewProject with a project in the Trash', () => {
  it('freezes management for everyone who could manage it', () => {
    for (const c of ['SA', 'AD', 'PM-K', 'M-K'] as const) {
      const { principal, membership } = persona(c);
      expect(code(canManageProject(principal, TRASHED, membership))).toBe('PROJECT_IN_TRASH');
    }
  });

  it('keeps reporting role problems before the Trash state', () => {
    const pmx = persona('PM-X');
    const ba = persona('BA');
    expect(code(canManageProject(pmx.principal, TRASHED, pmx.membership))).toBe('NOT_MANAGER');
    expect(code(canManageProject(ba.principal, TRASHED, ba.membership))).toBe('NOT_VISIBLE');
  });

  it('still lets viewers open it so the Trash page can show it', () => {
    const { principal, membership } = persona('M-K');
    expect(canViewProject(principal, TRASHED, membership).ok).toBe(true);
  });
});

describe('P_A1: a non-member PM may read', () => {
  const closed = { ...ACCESS_RULES, P_A1_PM_NON_MEMBER_READS: false };

  it('hides the project from a non-member PM when the flag is off', () => {
    const { principal, membership } = persona('PM-X');
    expect(canViewProject(principal, ATLAS, membership, closed)).toEqual(NOT_VISIBLE);
    expect(canManageProject(principal, ATLAS, membership, closed)).toEqual(NOT_VISIBLE);
  });

  it('still shows it to a PM who is a member', () => {
    const { principal, membership } = persona('PM-K');
    expect(canViewProject(principal, ATLAS, membership, closed).ok).toBe(true);
  });
});

describe('isPmOrAbove', () => {
  it.each([
    ['SA', true],
    ['AD', true],
    ['PM-K', true],
    ['PM-X', true],
    ['M-K', false],
    ['AG', false],
    ['PT', false],
    ['BA', false],
  ] as const)('%s → %s (project role is irrelevant)', (c, want) => {
    expect(isPmOrAbove(persona(c).principal)).toBe(want);
  });
});

describe('denial catalog parity', () => {
  it('maps every code these policies return into the shared catalog with the same HTTP status', () => {
    for (const c of [
      'NOT_MANAGER',
      'NOT_APP_ROLE',
      'ROLE_CANNOT_TRASH',
      'IMPERSONATING',
    ] as const) {
      expect(PM_ERRORS[c].http).toBe(DENY_UI[c].http);
    }
    expect(PM_ERRORS.PROJECT_IN_TRASH.http).toBe(DENY_UI.PROJECT_IN_TRASH.http);
  });

  it('keeps NOT_VISIBLE out of the catalog and returns a frozen decision', () => {
    expect('NOT_VISIBLE' in PM_ERRORS).toBe(false);
    expect(Object.isFrozen(NOT_VISIBLE)).toBe(true);
  });
});

describe('projectListScope', () => {
  it.each([
    ['SA', 'all'],
    ['AD', 'all'],
    ['PM-K', 'all'],
    ['PM-X', 'all'],
    ['M-K', 'memberOf'],
    ['AG', 'memberOf'],
    ['PT', 'memberOf'],
    ['BA', 'memberOf'],
  ] as const)('%s lists %s', (c, kind) => {
    const { principal } = persona(c);
    const scope = projectListScope(principal);
    expect(scope.kind).toBe(kind);
    if (scope.kind === 'memberOf') expect(scope.userId).toBe(principal.id);
  });

  it('narrows a PM to their memberships when P_A1 is off', () => {
    const closed = { ...ACCESS_RULES, P_A1_PM_NON_MEMBER_READS: false };
    expect(projectListScope(persona('PM-X').principal, closed).kind).toBe('memberOf');
    expect(projectListScope(persona('AD').principal, closed).kind).toBe('all');
  });
});

describe('matchesProjectScope', () => {
  const mine: ProjectListScope = { kind: 'memberOf', userId: 'U-dodi' };

  it('matches every project for scope all', () => {
    expect(matchesProjectScope({ kind: 'all' }, 'P-x', [])).toBe(true);
  });

  it('matches only member projects for scope memberOf', () => {
    expect(matchesProjectScope(mine, 'P-atlas', ['P-atlas', 'P-b'])).toBe(true);
    expect(matchesProjectScope(mine, 'P-c', ['P-atlas', 'P-b'])).toBe(false);
    expect(matchesProjectScope(mine, 'P-atlas', [])).toBe(false);
  });
});

describe('clampListScope (M11)', () => {
  it('gives a Member who asks for scope=all the mine scope, without an error', () => {
    const allowed = projectListScope(persona('AG').principal);
    expect(clampListScope('all', allowed)).toBe('mine');
    expect(clampListScope('mine', allowed)).toBe('mine');
  });

  it('keeps all for Admin and PM, and mine when they ask for mine', () => {
    for (const c of ['SA', 'AD', 'PM-K', 'PM-X'] as const) {
      const allowed = projectListScope(persona(c).principal);
      expect(clampListScope('all', allowed)).toBe('all');
      expect(clampListScope('mine', allowed)).toBe('mine');
    }
  });
});
