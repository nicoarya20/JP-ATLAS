/**
 * Leave policy matrix (Pengaturan #9, §2): who approves whom. Pure, no DB. Decision codes are the ones
 * `DENY_UI` knows, so the UI and the API read the same verdict.
 */
import { describe, expect, test } from 'bun:test';
import type { Principal } from '../../server/access/types';
import {
  canCancelLeave,
  canDecideLeave,
  canManageLeaveSettings,
  canSeePendingLeave,
  canViewLeave,
  initialLeaveStatus,
  type LeaveRelation,
} from '../../server/leave/leave.policy';
import type { Role } from '../../server/permissions';

const principal = (id: string, appRole: Role, impersonating = false): Principal => ({
  id,
  appRole,
  impersonating,
});
const SHARED: LeaveRelation = { managesSharedProject: true };
const NOT_SHARED: LeaveRelation = { managesSharedProject: false };

const member = { id: 'dodi', appRole: 'member' as const };
const pm = { id: 'nico', appRole: 'project_manager' as const };
const admin = { id: 'ayu', appRole: 'admin' as const };

describe('who decides a Member request', () => {
  test('a Project Manager who manages a project the Member is in', () => {
    expect(canDecideLeave(principal('nico', 'project_manager'), member, SHARED)).toEqual({
      ok: true,
    });
  });

  test('a Project Manager who manages none of the Member projects is refused as not the manager', () => {
    expect(canDecideLeave(principal('nico', 'project_manager'), member, NOT_SHARED)).toEqual({
      ok: false,
      code: 'NOT_MANAGER',
    });
  });

  test('Admin and Super-admin decide without any shared project', () => {
    for (const role of ['admin', 'super-admin'] as const) {
      expect(canDecideLeave(principal('x', role), member, NOT_SHARED)).toEqual({ ok: true });
    }
  });

  test('a Member never decides, even one who manages a project (the relation cannot buy the role)', () => {
    expect(canDecideLeave(principal('eka', 'member'), member, SHARED)).toEqual({
      ok: false,
      code: 'NOT_APP_ROLE',
    });
  });
});

describe('who decides a Project Manager request', () => {
  test('only an Admin', () => {
    expect(canDecideLeave(principal('ayu', 'admin'), pm, NOT_SHARED)).toEqual({ ok: true });
    expect(canDecideLeave(principal('root', 'super-admin'), pm, NOT_SHARED)).toEqual({ ok: true });
  });

  test('not another Project Manager, even one who manages a shared project', () => {
    expect(canDecideLeave(principal('rina', 'project_manager'), pm, SHARED)).toEqual({
      ok: false,
      code: 'NOT_ADMIN',
    });
  });

  test('not a Member', () => {
    expect(canDecideLeave(principal('dodi', 'member'), pm, SHARED)).toEqual({
      ok: false,
      code: 'NOT_ADMIN',
    });
  });
});

describe('who decides an Admin request', () => {
  test('another Admin only', () => {
    expect(canDecideLeave(principal('root', 'super-admin'), admin, NOT_SHARED).ok).toBe(true);
    expect(canDecideLeave(principal('nico', 'project_manager'), admin, SHARED)).toEqual({
      ok: false,
      code: 'NOT_ADMIN',
    });
  });
});

describe('own request and impersonation', () => {
  test('nobody decides their own request, an Admin included', () => {
    for (const role of ['member', 'project_manager', 'admin', 'super-admin'] as const) {
      const self = { id: 'me', appRole: role };
      expect(canDecideLeave(principal('me', role), self, SHARED)).toEqual({
        ok: false,
        code: 'SELF_TARGET',
      });
    }
  });

  test('a super-admin acting as someone else decides nothing', () => {
    expect(canDecideLeave(principal('ayu', 'admin', true), member, NOT_SHARED)).toEqual({
      ok: false,
      code: 'IMPERSONATING',
    });
  });
});

describe('who may see a request', () => {
  test('the owner and anyone who could decide it', () => {
    expect(canViewLeave(principal('dodi', 'member'), member, NOT_SHARED).ok).toBe(true);
    expect(canViewLeave(principal('nico', 'project_manager'), member, SHARED).ok).toBe(true);
    expect(canViewLeave(principal('ayu', 'admin'), member, NOT_SHARED).ok).toBe(true);
  });

  test('everyone else gets the 404 a missing request gives', () => {
    const stranger = canViewLeave(principal('eka', 'member'), member, SHARED);
    expect(stranger).toEqual({ ok: false, code: 'NOT_FOUND' });
    const otherPm = canViewLeave(principal('nico', 'project_manager'), member, NOT_SHARED);
    expect(otherPm).toEqual({ ok: false, code: 'NOT_FOUND' });
  });

  test('an approver stays able to see a request while impersonating (the 403 comes from deciding)', () => {
    expect(canViewLeave(principal('ayu', 'admin', true), member, NOT_SHARED).ok).toBe(true);
  });
});

describe('initial status', () => {
  test('an Admin or Super-admin is approved at once, whatever the switch says', () => {
    expect(initialLeaveStatus('admin', true)).toBe('approved');
    expect(initialLeaveStatus('super-admin', true)).toBe('approved');
  });

  test('Member and Project Manager wait while approval is required', () => {
    expect(initialLeaveStatus('member', true)).toBe('pending');
    expect(initialLeaveStatus('project_manager', true)).toBe('pending');
  });

  test('with the switch off everyone is approved on submit', () => {
    expect(initialLeaveStatus('member', false)).toBe('approved');
    expect(initialLeaveStatus('project_manager', false)).toBe('approved');
  });
});

describe('withdrawing', () => {
  const TODAY = '2026-10-07';
  const mine = (status: 'pending' | 'approved' | 'rejected' | 'canceled', endDate: string) => ({
    userId: 'dodi',
    status,
    endDate,
  });
  const dodi = principal('dodi', 'member');

  test('pending is always withdrawable, approved up to and including its last day', () => {
    expect(canCancelLeave(dodi, mine('pending', '2026-10-01'), TODAY).ok).toBe(true);
    expect(canCancelLeave(dodi, mine('approved', TODAY), TODAY).ok).toBe(true);
    expect(canCancelLeave(dodi, mine('approved', '2026-10-20'), TODAY).ok).toBe(true);
  });

  test('an approved leave whose last day has passed is final', () => {
    expect(canCancelLeave(dodi, mine('approved', '2026-10-06'), TODAY)).toEqual({
      ok: false,
      code: 'WRONG_STATE',
    });
  });

  test('rejected and canceled are final', () => {
    for (const status of ['rejected', 'canceled'] as const) {
      expect(canCancelLeave(dodi, mine(status, '2026-10-20'), TODAY)).toEqual({
        ok: false,
        code: 'WRONG_STATE',
      });
    }
  });

  test('only the owner, even an Admin who can see it', () => {
    expect(canCancelLeave(principal('ayu', 'admin'), mine('pending', '2026-10-20'), TODAY)).toEqual(
      { ok: false, code: 'NOT_OWNER' },
    );
  });
});

describe('the approval switch and the pending status', () => {
  test('only Admin and Super-admin change the switch, and not while impersonating', () => {
    expect(canManageLeaveSettings(principal('a', 'admin')).ok).toBe(true);
    expect(canManageLeaveSettings(principal('a', 'super-admin')).ok).toBe(true);
    expect(canManageLeaveSettings(principal('a', 'project_manager'))).toEqual({
      ok: false,
      code: 'NOT_ADMIN',
    });
    expect(canManageLeaveSettings(principal('a', 'member'))).toEqual({
      ok: false,
      code: 'NOT_ADMIN',
    });
    expect(canManageLeaveSettings(principal('a', 'admin', true))).toEqual({
      ok: false,
      code: 'IMPERSONATING',
    });
  });

  test('a pending request is visible to its owner, Project Managers and Admins, not to other Members', () => {
    expect(canSeePendingLeave(principal('dodi', 'member'), 'dodi')).toBe(true);
    expect(canSeePendingLeave(principal('nico', 'project_manager'), 'dodi')).toBe(true);
    expect(canSeePendingLeave(principal('ayu', 'admin'), 'dodi')).toBe(true);
    expect(canSeePendingLeave(principal('eka', 'member'), 'dodi')).toBe(false);
  });
});
