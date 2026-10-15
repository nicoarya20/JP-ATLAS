import { describe, expect, it } from 'bun:test';
import { ACCESS_RULES } from '../../server/access/rules';
import {
  canComment,
  canCreateTask,
  canEditTask,
  canManageKinds,
  canToggleNeedsReview,
  canViewTask,
  resolveNeedsReviewOnCreate,
} from '../../server/access/task.policy';
import type { ProjectSubject, TaskSubject } from '../../server/access/types';
import { TASK_REVIEW_UI_ENABLED } from '../../server/pm/limits';
import { type PersonaCode, persona, personaNamed } from './fixtures';

// Task #12 from R03 §3.8: made by Rina, worked by Nico, review required.
const task = (o: Partial<TaskSubject> = {}): TaskSubject => ({
  id: 'T-12',
  projectId: 'P-atlas',
  status: 'in_progress',
  createdBy: 'U-rina',
  assigneeId: 'U-nico',
  reviewerId: null,
  needsReview: true,
  deletedAt: null,
  deletedBy: null,
  projectDeletedAt: null,
  ...o,
});
const atlas = (o: Partial<ProjectSubject> = {}): ProjectSubject => ({
  id: 'P-atlas',
  status: 'active',
  leadId: 'U-nico',
  deletedAt: null,
  deletedBy: null,
  ...o,
});
const code = (d: { ok: boolean; code?: string }) => (d.ok ? 'allow' : d.code);
const NOW = new Date('2026-10-07T00:00:00Z');

describe('canViewTask', () => {
  it.each([
    ['SA', 'allow'],
    ['AD', 'allow'],
    ['PM-K', 'allow'],
    ['PM-X', 'allow'], // read-only access for a non-member PM (P-A1)
    ['M-K', 'allow'],
    ['AG', 'allow'],
    ['PT', 'allow'],
    ['BA', 'NOT_FOUND'], // hidden, so the API answers 404 rather than 403
  ] as [PersonaCode, string][])('%s -> %s', (c, expected) => {
    const x = persona(c);
    expect(code(canViewTask(x.principal, task(), x.membership))).toBe(expected);
  });

  it('hides the project from a non-member PM when P-A1 is off', () => {
    const lea = persona('PM-X');
    const rules = { ...ACCESS_RULES, P_A1_PM_NON_MEMBER_READS: false };
    expect(code(canViewTask(lea.principal, task(), lea.membership, rules))).toBe('NOT_FOUND');
  });

  it('still shows a trashed task (the Trash page lists it; every write is frozen)', () => {
    const nico = persona('PM-K');
    const t = task({ deletedAt: NOW, projectDeletedAt: NOW });
    expect(canViewTask(nico.principal, t, nico.membership).ok).toBe(true);
  });
});

describe('canCreateTask (C07)', () => {
  it('C07: Sri (observer) is NOT_MEMBER, Dodi (member) may create', () => {
    const sri = personaNamed('Sri');
    const dodi = personaNamed('Dodi');
    expect(code(canCreateTask(sri.principal, atlas(), sri.membership))).toBe('NOT_MEMBER');
    expect(code(canCreateTask(dodi.principal, atlas(), dodi.membership))).toBe('allow');
  });

  it.each([
    ['SA', 'allow'],
    ['AD', 'allow'], // Ayu is only an observer, but an Admin is never limited by project role (K6)
    ['PM-K', 'allow'],
    ['PM-X', 'NOT_MEMBER'],
    ['M-K', 'allow'],
    ['AG', 'allow'],
    ['PT', 'NOT_MEMBER'],
    ['BA', 'NOT_FOUND'],
  ] as [PersonaCode, string][])('%s -> %s on an active project', (c, expected) => {
    const x = persona(c);
    expect(code(canCreateTask(x.principal, atlas(), x.membership))).toBe(expected);
  });

  it.each(['draft', 'active', 'on_hold', 'completed', 'canceled'] as const)(
    'allows a Member to add a task to a %s project (Q12)',
    (status) => {
      const dodi = personaNamed('Dodi');
      expect(canCreateTask(dodi.principal, atlas({ status }), dodi.membership).ok).toBe(true);
    },
  );

  it.each([
    ['on_hold', 'WRONG_STATE'],
    ['completed', 'WRONG_STATE'],
    ['canceled', 'WRONG_STATE'],
    ['draft', 'allow'],
    ['active', 'allow'],
  ] as const)('locks a %s project when the Q12 flag is off -> %s', (status, expected) => {
    const dodi = personaNamed('Dodi');
    const rules = { ...ACCESS_RULES, PROJECT_CLOSED_ALLOWS_TASK_WRITES: false };
    expect(code(canCreateTask(dodi.principal, atlas({ status }), dodi.membership, rules))).toBe(
      expected,
    );
  });

  it('is PROJECT_IN_TRASH for every persona that could create, but role comes first', () => {
    const trashed = atlas({ deletedAt: NOW, deletedBy: 'U-nico' });
    for (const c of ['SA', 'AD', 'PM-K', 'M-K', 'AG'] as PersonaCode[]) {
      const x = persona(c);
      expect(code(canCreateTask(x.principal, trashed, x.membership))).toBe('PROJECT_IN_TRASH');
    }
    const sri = personaNamed('Sri');
    expect(code(canCreateTask(sri.principal, trashed, sri.membership))).toBe('NOT_MEMBER');
  });
});

describe('canEditTask (C08, T-A2)', () => {
  it('C08: Dodi is NOT_OWNER on #12, Rina (its creator) may edit', () => {
    const dodi = personaNamed('Dodi');
    const rina = personaNamed('Rina');
    expect(code(canEditTask(dodi.principal, task(), dodi.membership))).toBe('NOT_OWNER');
    expect(code(canEditTask(rina.principal, task(), rina.membership))).toBe('allow');
  });

  it('lets the assignee edit a task someone else created', () => {
    const dodi = personaNamed('Dodi');
    expect(canEditTask(dodi.principal, task({ assigneeId: 'U-dodi' }), dodi.membership).ok).toBe(
      true,
    );
  });

  it('lets a manager and an Admin edit any task', () => {
    for (const c of ['SA', 'AD', 'PM-K', 'M-K'] as PersonaCode[]) {
      const x = persona(c);
      expect(canEditTask(x.principal, task(), x.membership).ok).toBe(true);
    }
  });

  it('lets every Member edit every task when T-A2 is `all`', () => {
    const dodi = personaNamed('Dodi');
    const rules = { ...ACCESS_RULES, T_A2_MEMBER_EDIT_SCOPE: 'all' as const };
    expect(canEditTask(dodi.principal, task(), dodi.membership, rules).ok).toBe(true);
    const sri = personaNamed('Sri');
    expect(code(canEditTask(sri.principal, task(), sri.membership, rules))).toBe('NOT_MEMBER');
  });

  it('freezes a trashed task or a task whose project is trashed', () => {
    const nico = persona('PM-K');
    const edit = (t: TaskSubject) => code(canEditTask(nico.principal, t, nico.membership));
    expect(edit(task({ deletedAt: NOW }))).toBe('WRONG_STATE');
    expect(edit(task({ projectDeletedAt: NOW }))).toBe('PROJECT_IN_TRASH');
  });
});

describe('canComment (C22, K10)', () => {
  it('C22: Sri may comment, Lea is NOT_MEMBER, Bella gets a 404', () => {
    const out = (name: string, c?: PersonaCode) => {
      const x = c ? persona(c) : personaNamed(name);
      return code(canComment(x.principal, task(), x.membership));
    };
    expect(out('Sri')).toBe('allow');
    expect(out('Lea', 'PM-X')).toBe('NOT_MEMBER');
    expect(out('Bella', 'BA')).toBe('NOT_FOUND');
  });

  it('lets a non-member PM comment only when P-A1b is on', () => {
    const lea = persona('PM-X');
    const rules = { ...ACCESS_RULES, P_A1B_PM_NON_MEMBER_COMMENTS: true };
    expect(canComment(lea.principal, task(), lea.membership, rules).ok).toBe(true);
  });

  it('does not let P-A1b reveal the project to a PM when P-A1 hides it', () => {
    const lea = persona('PM-X');
    const rules = {
      ...ACCESS_RULES,
      P_A1_PM_NON_MEMBER_READS: false,
      P_A1B_PM_NON_MEMBER_COMMENTS: true,
    };
    expect(code(canComment(lea.principal, task(), lea.membership, rules))).toBe('NOT_FOUND');
  });

  it('freezes comments on a trashed task', () => {
    const sri = personaNamed('Sri');
    const c = (t: TaskSubject) => code(canComment(sri.principal, t, sri.membership));
    expect(c(task({ deletedAt: NOW }))).toBe('WRONG_STATE');
    expect(c(task({ projectDeletedAt: NOW }))).toBe('PROJECT_IN_TRASH');
  });
});

describe('canManageKinds (C24)', () => {
  it('C24: Mira (member-manager) is allowed, Dodi is NOT_MANAGER', () => {
    const mira = persona('M-K');
    const dodi = personaNamed('Dodi');
    expect(code(canManageKinds(mira.principal, atlas(), mira.membership))).toBe('allow');
    expect(code(canManageKinds(dodi.principal, atlas(), dodi.membership))).toBe('NOT_MANAGER');
  });

  it.each([
    ['SA', 'allow'],
    ['AD', 'allow'],
    ['PM-K', 'allow'],
    ['PM-X', 'NOT_MANAGER'],
    ['M-K', 'allow'],
    ['AG', 'NOT_MANAGER'],
    ['PT', 'NOT_MANAGER'],
    ['BA', 'NOT_FOUND'],
  ] as [PersonaCode, string][])('%s -> %s', (c, expected) => {
    const x = persona(c);
    expect(code(canManageKinds(x.principal, atlas(), x.membership))).toBe(expected);
  });

  it('is PROJECT_IN_TRASH for a manager of a trashed project', () => {
    const nico = persona('PM-K');
    const trashed = atlas({ deletedAt: NOW });
    expect(code(canManageKinds(nico.principal, trashed, nico.membership))).toBe('PROJECT_IN_TRASH');
  });
});

describe('canToggleNeedsReview (C15-C17, T-A5)', () => {
  it('C15: turning review off is NOT_MANAGER for Dodi, allowed for Nico', () => {
    const t = task({ status: 'todo', needsReview: true });
    const dodi = personaNamed('Dodi');
    const nico = persona('PM-K');
    expect(code(canToggleNeedsReview(dodi.principal, t, dodi.membership, false))).toBe(
      'NOT_MANAGER',
    );
    expect(code(canToggleNeedsReview(nico.principal, t, nico.membership, false))).toBe('allow');
  });

  it('C16: turning review on is allowed on own work, NOT_OWNER on others, NOT_MEMBER for Sri', () => {
    const base = { status: 'todo', needsReview: false } as const;
    const dodi = personaNamed('Dodi');
    const sri = personaNamed('Sri');
    const on = (x: typeof dodi, t: TaskSubject) =>
      code(canToggleNeedsReview(x.principal, t, x.membership, true));
    expect(on(dodi, task({ ...base, createdBy: 'U-dodi', assigneeId: null }))).toBe('allow');
    expect(on(dodi, task({ ...base, createdBy: 'U-rina', assigneeId: 'U-rina' }))).toBe(
      'NOT_OWNER',
    );
    expect(on(sri, task({ ...base, createdBy: 'U-dodi', assigneeId: 'U-dodi' }))).toBe(
      'NOT_MEMBER',
    );
  });

  it('C16: a Member may not turn review on when T-A5 is off', () => {
    const dodi = personaNamed('Dodi');
    const t = task({ status: 'todo', needsReview: false, createdBy: 'U-dodi' });
    const rules = { ...ACCESS_RULES, T_A5_MEMBER_ENABLES_REVIEW: false };
    expect(code(canToggleNeedsReview(dodi.principal, t, dodi.membership, true, rules))).toBe(
      'NOT_MANAGER',
    );
  });

  it.each(['in_review', 'done', 'canceled'] as const)(
    'C17: %s is LOCKED_BY_STATUS for both directions, even when the value would not change',
    (status) => {
      const nico = persona('PM-K');
      for (const needsReview of [true, false])
        for (const next of [true, false]) {
          const t = task({ status, needsReview });
          expect(code(canToggleNeedsReview(nico.principal, t, nico.membership, next))).toBe(
            'LOCKED_BY_STATUS',
          );
        }
    },
  );

  it('allows a no-op toggle on an open task and freezes a trashed one', () => {
    const nico = persona('PM-K');
    const toggle = (t: TaskSubject) =>
      code(canToggleNeedsReview(nico.principal, t, nico.membership, true));
    expect(toggle(task({ status: 'todo', needsReview: true }))).toBe('allow');
    expect(toggle(task({ status: 'todo', deletedAt: NOW }))).toBe('WRONG_STATE');
    expect(toggle(task({ status: 'todo', projectDeletedAt: NOW }))).toBe('PROJECT_IN_TRASH');
  });
});

describe('resolveNeedsReviewOnCreate (C44, M25)', () => {
  it('C44: a Member cannot opt out of a default of on; a manager can', () => {
    const ask = { projectDefault: true, requested: false };
    expect(resolveNeedsReviewOnCreate({ ...ask, level: 'member' }, true)).toEqual({
      value: true,
      ignored: true,
    });
    expect(resolveNeedsReviewOnCreate({ ...ask, level: 'manager' }, true)).toEqual({
      value: false,
      ignored: false,
    });
  });

  it.each([
    [{ projectDefault: false }, { value: false, ignored: false }],
    [{ projectDefault: true }, { value: true, ignored: false }],
    [
      { projectDefault: false, requested: true },
      { value: true, ignored: false },
    ],
    [
      { projectDefault: true, requested: true },
      { value: true, ignored: false },
    ],
  ] as const)('with the review UI on, %j resolves to %j', (input, expected) => {
    expect(resolveNeedsReviewOnCreate({ ...input, level: 'manager' }, true)).toEqual(expected);
  });

  it('keeps the review UI off by default until S4 ships (M25)', () => {
    expect(TASK_REVIEW_UI_ENABLED).toBe(false);
  });

  it.each([
    ['manager', { projectDefault: false, requested: true }, { value: false, ignored: true }],
    ['member', { projectDefault: false, requested: true }, { value: false, ignored: true }],
    ['manager', { projectDefault: true }, { value: false, ignored: true }],
    ['member', { projectDefault: true, requested: false }, { value: false, ignored: false }],
    ['manager', { projectDefault: false }, { value: false, ignored: false }],
    ['admin', { projectDefault: false, requested: false }, { value: false, ignored: false }],
  ] as const)(
    'drops every `true` while the UI flag is off: %s %j -> %j',
    (level, input, expected) => {
      expect(resolveNeedsReviewOnCreate({ ...input, level })).toEqual(expected);
    },
  );
});
