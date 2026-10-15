import { describe, expect, it } from 'bun:test';
import {
  canChangeManagerSet,
  canSetLead,
  type ManagerSetChange,
} from '../../server/access/members.policy';
import { canManageProject } from '../../server/access/project.policy';
import type { ProjectSubject } from '../../server/access/types';
import { PM_ERRORS } from '../../server/pm/errors';
import { PERSONA_CODES, type PersonaCode, persona } from './fixtures';

// Atlas: Nico (Lead) and Mira are its two managers; Dodi, Rina, Sri are plain members/observer.
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
const TWO_MANAGERS = ['U-nico', 'U-mira'];
const code = (d: { ok: boolean; code?: string }) => (d.ok ? 'allow' : d.code);

const ADD: ManagerSetChange = {
  targetId: 'U-new',
  targetRole: null,
  nextRole: 'member',
  managerIds: TWO_MANAGERS,
};
const CHANGE_ROLE: ManagerSetChange = {
  targetId: 'U-dodi',
  targetRole: 'member',
  nextRole: 'viewer',
  managerIds: TWO_MANAGERS,
};
const REMOVE: ManagerSetChange = {
  targetId: 'U-rina',
  targetRole: 'member',
  nextRole: null,
  managerIds: TWO_MANAGERS,
};

// Hand-written matrix (R03 §2.2) in PERSONA_CODES order: SA, AD, PM-K, PM-X, M-K, AG, PT, BA.
const MANAGE_ROW = [
  'allow',
  'allow',
  'allow',
  'NOT_MANAGER',
  'allow',
  'NOT_MANAGER',
  'NOT_MANAGER',
  'NOT_VISIBLE',
];
const expected = (c: PersonaCode) => MANAGE_ROW[PERSONA_CODES.indexOf(c)];

describe('permission matrix E2: member actions', () => {
  it.each(PERSONA_CODES)('%s: member.add', (c) => {
    const { principal, membership } = persona(c);
    expect(code(canChangeManagerSet(principal, ATLAS, membership, ADD))).toBe(expected(c));
  });

  it.each(PERSONA_CODES)('%s: member.changeRole', (c) => {
    const { principal, membership } = persona(c);
    expect(code(canChangeManagerSet(principal, ATLAS, membership, CHANGE_ROLE))).toBe(expected(c));
  });

  it.each(PERSONA_CODES)('%s: member.remove', (c) => {
    const { principal, membership } = persona(c);
    expect(code(canChangeManagerSet(principal, ATLAS, membership, REMOVE))).toBe(expected(c));
  });

  it.each(PERSONA_CODES)('%s: setLead', (c) => {
    const { principal, membership } = persona(c);
    const d = canSetLead(principal, ATLAS, membership, 'U-mira', TWO_MANAGERS);
    expect(code(d)).toBe(expected(c));
  });
});

describe('invariants', () => {
  const runAll = (c: PersonaCode, project: ProjectSubject) => {
    const { principal, membership } = persona(c);
    return [
      ...[ADD, CHANGE_ROLE, REMOVE].map((i) =>
        code(canChangeManagerSet(principal, project, membership, i)),
      ),
      code(canSetLead(principal, project, membership, 'U-mira', TWO_MANAGERS)),
      code(canSetLead(principal, project, membership, 'U-dodi', TWO_MANAGERS)),
    ];
  };

  it('Super-admin and Admin decide every member action alike', () => {
    for (const project of [ATLAS, TRASHED])
      expect(runAll('SA', project)).toEqual(runAll('AD', project));
  });

  it('a PM-manager and a Member-manager decide every member action alike', () => {
    for (const project of [ATLAS, TRASHED])
      expect(runAll('PM-K', project)).toEqual(runAll('M-K', project));
  });
});

describe('R03 cases C25-C28', () => {
  it('C25: Nico, the only manager, cannot demote himself to Member (LAST_MANAGER)', () => {
    const { principal, membership } = persona('PM-K');
    const d = canChangeManagerSet(principal, ATLAS, membership, {
      targetId: 'U-nico',
      targetRole: 'manager',
      nextRole: 'member',
      managerIds: ['U-nico'],
    });
    expect(d).toEqual({ ok: false, code: 'LAST_MANAGER' });
  });

  it('C26: with Mira as second manager, demoting the Lead is IS_LEAD and demoting Mira is allowed', () => {
    const { principal, membership } = persona('PM-K');
    const demote = (targetId: string): ManagerSetChange => ({
      targetId,
      targetRole: 'manager',
      nextRole: 'member',
      managerIds: TWO_MANAGERS,
    });
    expect(code(canChangeManagerSet(principal, ATLAS, membership, demote('U-nico')))).toBe(
      'IS_LEAD',
    );
    expect(code(canChangeManagerSet(principal, ATLAS, membership, demote('U-mira')))).toBe('allow');
  });

  it('C27: an Admin (Ayu) cannot remove the only manager either', () => {
    const { principal, membership } = persona('AD');
    const d = canChangeManagerSet(principal, ATLAS, membership, {
      targetId: 'U-nico',
      targetRole: 'manager',
      nextRole: null,
      managerIds: ['U-nico'],
    });
    expect(d).toEqual({ ok: false, code: 'LAST_MANAGER' });
  });

  it('C28: Nico cannot make Dodi (a Member) the Lead: LEAD_MUST_BE_MANAGER', () => {
    const { principal, membership } = persona('PM-K');
    const d = canSetLead(principal, ATLAS, membership, 'U-dodi', TWO_MANAGERS);
    expect(d).toEqual({ ok: false, code: 'LEAD_MUST_BE_MANAGER' });
    // The code uses the R04 spelling and exists in the shared catalog.
    expect('LEAD_MUST_BE_MANAGER' in PM_ERRORS).toBe(true);
  });
});

describe('canChangeManagerSet rules', () => {
  const nico = persona('PM-K');

  it('checks the actor before the guards: a Member cannot probe LAST_MANAGER (M10)', () => {
    const dodi = persona('AG');
    const d = canChangeManagerSet(dodi.principal, ATLAS, dodi.membership, {
      targetId: 'U-nico',
      targetRole: 'manager',
      nextRole: null,
      managerIds: ['U-nico'],
    });
    expect(code(d)).toBe('NOT_MANAGER');
  });

  it('reports LAST_MANAGER ahead of IS_LEAD when the sole manager is also the Lead', () => {
    const d = canChangeManagerSet(nico.principal, ATLAS, nico.membership, {
      targetId: 'U-nico',
      targetRole: 'manager',
      nextRole: null,
      managerIds: ['U-nico'],
    });
    expect(code(d)).toBe('LAST_MANAGER');
  });

  it('refuses removing the Lead-manager while another manager exists (IS_LEAD)', () => {
    const d = canChangeManagerSet(nico.principal, ATLAS, nico.membership, {
      targetId: 'U-nico',
      targetRole: 'manager',
      nextRole: null,
      managerIds: TWO_MANAGERS,
    });
    expect(code(d)).toBe('IS_LEAD');
  });

  it('allows changes that do not reduce the managers', () => {
    const allowed: ManagerSetChange[] = [
      { targetId: 'U-new', targetRole: null, nextRole: 'manager', managerIds: TWO_MANAGERS },
      { targetId: 'U-dodi', targetRole: 'member', nextRole: 'manager', managerIds: TWO_MANAGERS },
      { targetId: 'U-mira', targetRole: 'manager', nextRole: 'manager', managerIds: TWO_MANAGERS },
      { targetId: 'U-nico', targetRole: 'manager', nextRole: 'manager', managerIds: ['U-nico'] },
    ];
    for (const i of allowed)
      expect(code(canChangeManagerSet(nico.principal, ATLAS, nico.membership, i))).toBe('allow');
  });

  it('lets a manager leave when the Lead FK was nulled by a deleted user', () => {
    const orphaned = { ...ATLAS, leadId: null };
    const d = canChangeManagerSet(nico.principal, orphaned, nico.membership, {
      targetId: 'U-nico',
      targetRole: 'manager',
      nextRole: null,
      managerIds: TWO_MANAGERS,
    });
    expect(code(d)).toBe('allow');
  });

  it('is frozen by the Trash for everyone who could otherwise change members', () => {
    for (const c of ['SA', 'AD', 'PM-K', 'M-K'] as const) {
      const { principal, membership } = persona(c);
      expect(code(canChangeManagerSet(principal, TRASHED, membership, ADD))).toBe(
        'PROJECT_IN_TRASH',
      );
    }
  });

  it('defers to canManageProject for the actor check', () => {
    for (const c of PERSONA_CODES) {
      const { principal, membership } = persona(c);
      const manage = canManageProject(principal, ATLAS, membership);
      if (!manage.ok)
        expect(canChangeManagerSet(principal, ATLAS, membership, ADD)).toEqual(manage);
    }
  });
});

describe('canSetLead rules', () => {
  const nico = persona('PM-K');

  it('allows another manager and re-selecting the current Lead', () => {
    expect(code(canSetLead(nico.principal, ATLAS, nico.membership, 'U-mira', TWO_MANAGERS))).toBe(
      'allow',
    );
    expect(code(canSetLead(nico.principal, ATLAS, nico.membership, 'U-nico', TWO_MANAGERS))).toBe(
      'allow',
    );
  });

  it('refuses a user who is not in the manager list at all', () => {
    const d = canSetLead(nico.principal, ATLAS, nico.membership, 'U-stranger', TWO_MANAGERS);
    expect(code(d)).toBe('LEAD_MUST_BE_MANAGER');
  });

  it('checks the actor before the target: a Member gets NOT_MANAGER even for an invalid Lead', () => {
    const dodi = persona('AG');
    const d = canSetLead(dodi.principal, ATLAS, dodi.membership, 'U-dodi', TWO_MANAGERS);
    expect(code(d)).toBe('NOT_MANAGER');
  });

  it('is frozen by the Trash', () => {
    const d = canSetLead(nico.principal, TRASHED, nico.membership, 'U-mira', TWO_MANAGERS);
    expect(code(d)).toBe('PROJECT_IN_TRASH');
  });
});
