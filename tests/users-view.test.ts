import { describe, expect, it } from 'bun:test';
import {
  hasAnyAction,
  type UserPermissions,
  userAccess,
} from '../app/components/users/user-access';
import {
  type AdminUser,
  buildUserQuery,
  DEFAULT_USER_FILTERS,
  hasActiveUserFilters,
  PENDING_PARAMS,
  userStatus,
} from '../app/lib/admin-users-api';
import {
  type AdminInvitation,
  buildInvitationQuery,
  INVITATION_STATE_LABEL,
  invitationState,
} from '../app/lib/invitations-api';
import { isValidRejectReason } from '../server/access/account-status.rules';

const NOW = Date.parse('2026-10-16T00:00:00Z');
const FUTURE = '2026-10-20T00:00:00Z';
const PAST = '2026-10-10T00:00:00Z';

function user(over: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'u-target',
    name: 'Bu Ani',
    email: 'ani@kantor.id',
    emailVerified: true,
    image: null,
    role: 'member',
    banned: false,
    banReason: null,
    banExpires: null,
    approvalStatus: 'approved',
    approvalReason: null,
    createdAt: '2026-10-01T00:00:00Z',
    lastLoginAt: null,
    loginCount: 0,
    activeSessions: 0,
    providers: [],
    ...over,
  };
}

const admin: UserPermissions = {
  actorRole: 'admin',
  currentUserId: 'u-admin',
  impersonating: false,
};
const superAdmin: UserPermissions = {
  actorRole: 'super-admin',
  currentUserId: 'u-super',
  impersonating: false,
};

describe('userStatus', () => {
  it('maps approval states to plain-language labels', () => {
    expect(userStatus(user(), NOW)).toMatchObject({ key: 'active', label: 'Aktif' });
    expect(userStatus(user({ approvalStatus: 'pending' }), NOW)).toMatchObject({
      key: 'pending',
      label: 'Menunggu persetujuan',
    });
    expect(userStatus(user({ approvalStatus: 'rejected' }), NOW)).toMatchObject({
      key: 'rejected',
      label: 'Ditolak',
    });
  });

  it('lets an active suspension win over the approval state, and ignores an expired one', () => {
    const suspended = { banned: true, banExpires: FUTURE, approvalStatus: 'pending' as const };
    expect(userStatus(suspended, NOW).key).toBe('banned');
    expect(userStatus({ ...suspended, banExpires: PAST }, NOW).key).toBe('pending');
    expect(userStatus({ ...suspended, banExpires: null }, NOW).label).toBe('Diblokir');
  });
});

describe('invitationState', () => {
  const open = { acceptedAt: null, revokedAt: null, expiresAt: FUTURE };

  it('is active while open and unexpired', () => {
    expect(invitationState(open, NOW)).toBe('active');
  });

  it('is expired once the expiry passed, including exactly at the boundary', () => {
    expect(invitationState({ ...open, expiresAt: PAST }, NOW)).toBe('expired');
    expect(invitationState({ ...open, expiresAt: new Date(NOW).toISOString() }, NOW)).toBe(
      'expired',
    );
  });

  it('is used or revoked regardless of expiry, and used wins over revoked like the server', () => {
    expect(invitationState({ ...open, acceptedAt: PAST, expiresAt: PAST }, NOW)).toBe('used');
    expect(invitationState({ ...open, revokedAt: PAST }, NOW)).toBe('revoked');
    expect(invitationState({ ...open, acceptedAt: PAST, revokedAt: PAST }, NOW)).toBe('used');
  });

  it('has an everyday Indonesian label for every state', () => {
    expect(INVITATION_STATE_LABEL).toEqual({
      active: 'Aktif',
      used: 'Terpakai',
      expired: 'Kedaluwarsa',
      revoked: 'Dicabut',
    });
  });
});

describe('query builders', () => {
  it('sends the approval filter only when it is not "all"', () => {
    expect(buildUserQuery({ ...DEFAULT_USER_FILTERS, page: 1, limit: 25 }).has('approval')).toBe(
      false,
    );
    expect(buildUserQuery({ ...DEFAULT_USER_FILTERS, approval: 'pending' }).get('approval')).toBe(
      'pending',
    );
  });

  it('counts the approval filter as an active filter', () => {
    expect(hasActiveUserFilters({ ...DEFAULT_USER_FILTERS, approval: 'rejected' })).toBe(true);
  });

  it('asks for the oldest pending sign-ups first', () => {
    const q = buildUserQuery(PENDING_PARAMS);
    expect(q.get('approval')).toBe('pending');
    expect(q.get('sort')).toBe('oldest');
  });

  it('builds the invitation query without defaults', () => {
    expect(buildInvitationQuery({ status: 'all', limit: 20, offset: 0 }).toString()).toBe(
      'limit=20',
    );
    expect(buildInvitationQuery({ status: 'used', offset: 40 }).toString()).toBe(
      'status=used&offset=40',
    );
  });
});

describe('userAccess (what the buttons offer)', () => {
  it('lets an Admin approve a pending Member, choosing Member or Project Manager only', () => {
    const a = userAccess(user({ approvalStatus: 'pending' }), admin);
    expect(a.approve).toBe(true);
    expect(a.reject).toBe(true);
    expect(a.approveRoles).toEqual(['member', 'project_manager']);
  });

  it('offers a rejected account a second approval but no second rejection', () => {
    const a = userAccess(user({ approvalStatus: 'rejected' }), admin);
    expect(a.approve).toBe(true);
    expect(a.reject).toBe(false);
  });

  it('offers nothing to approve for an approved account', () => {
    const a = userAccess(user(), admin);
    expect([a.approve, a.reject]).toEqual([false, false]);
  });

  it('limits an Admin to Member and PM role changes and hides delete and impersonate', () => {
    const a = userAccess(user({ role: 'member' }), admin);
    expect(a.roles).toEqual(['project_manager']);
    expect(a.ban).toBe(true);
    expect(a.remove).toBe(false);
    expect(a.impersonate).toBe(false);
  });

  it('lets a Super-admin grant Admin and delete, but never Super-admin', () => {
    const a = userAccess(user({ role: 'member' }), superAdmin);
    expect(a.roles).toEqual(['project_manager', 'admin']);
    expect(a.remove).toBe(true);
    expect(a.impersonate).toBe(true);
  });

  it('gives an Admin no action on another Admin and says why', () => {
    const a = userAccess(user({ role: 'admin' }), admin);
    expect(hasAnyAction(a)).toBe(false);
    expect(a.blockedReason).toBe('Hanya super-admin yang dapat mengubah Admin.');
    expect(userAccess(user({ role: 'admin' }), superAdmin).ban).toBe(true);
  });

  it('protects Super-admin accounts and the actor themself', () => {
    const protectedUser = userAccess(user({ role: 'super-admin' }), superAdmin);
    expect(hasAnyAction(protectedUser)).toBe(false);
    expect(protectedUser.blockedReason).toContain('SUPER_ADMIN_EMAILS');
    const self = userAccess(user({ id: 'u-admin' }), admin);
    expect(self.isSelf).toBe(true);
    expect(hasAnyAction(self)).toBe(false);
    expect(self.blockedReason).toContain('akunmu sendiri');
  });

  it('blocks every account action while impersonating', () => {
    const a = userAccess(user({ approvalStatus: 'pending' }), { ...admin, impersonating: true });
    expect(hasAnyAction(a)).toBe(false);
    expect(a.blockedReason).toContain('menyamar');
  });

  it('treats the legacy "user" role as a Member', () => {
    expect(userAccess(user({ role: 'user' }), admin).roles).toEqual(['project_manager']);
  });
});

describe('rejection reason rule used by the dialog', () => {
  it('needs 3 to 200 characters once trimmed', () => {
    expect(isValidRejectReason('  ab  ')).toBe(false);
    expect(isValidRejectReason('Bukan anggota tim')).toBe(true);
    expect(isValidRejectReason('x'.repeat(201))).toBe(false);
  });
});

describe('invitation row type', () => {
  it('accepts the shape the API returns', () => {
    const row: AdminInvitation = {
      id: 'i1',
      email: 'ani@kantor.id',
      role: 'member',
      status: 'active',
      invitedBy: 'u-admin',
      invitedByName: 'Admin',
      expiresAt: FUTURE,
      acceptedAt: null,
      revokedAt: null,
      createdAt: PAST,
    };
    expect(invitationState(row, NOW)).toBe(row.status);
  });
});
