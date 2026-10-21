import { describe, expect, it } from 'bun:test';
import {
  isPublicRead,
  requiredScope,
  roleAllowsScope,
  SCOPE_IDS,
  type Scope,
  scopesForRole,
} from '../../server/api-keys/scopes';
import { ROLES } from '../../server/permissions';

describe('requiredScope', () => {
  it('maps routes to scopes by prefix and method', () => {
    expect(requiredScope('GET', '/api/analytics/visits')).toBe('analytics:read');
    expect(requiredScope('DELETE', '/api/analytics/visits')).toBe('analytics:write');
    expect(requiredScope('DELETE', '/api/analytics/purge')).toBe('analytics:write');
    expect(requiredScope('GET', '/api/admin/users')).toBe('users:read');
    expect(requiredScope('POST', '/api/admin/users/x/ban')).toBe('users:write');
    expect(requiredScope('GET', '/api/settings')).toBe('settings:read');
    expect(requiredScope('PUT', '/api/settings/rate-limit')).toBe('settings:write');
    expect(requiredScope('POST', '/api/posts')).toBe('posts:write');
    expect(requiredScope('GET', '/api/me/logins')).toBe('me:read');
    expect(requiredScope('GET', '/api/app/whoami')).toBe('app:read');
    expect(requiredScope('POST', '/api/app/items')).toBe('app:write');
    expect(requiredScope('GET', '/api/apps')).toBeNull();
    expect(requiredScope('POST', '/api/mcp')).toBe('mcp');
    expect(requiredScope('GET', '/api/mcp')).toBe('mcp');
  });
  it('never lets an API key approve, reject, re-role or invite accounts (K-7)', () => {
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      for (const verb of ['approve', 'reject', 'role']) {
        expect(requiredScope(method, `/api/admin/users/u1/${verb}`)).toBeNull();
        expect(requiredScope(method, `/api/admin/users/u1/${verb}/`)).toBeNull();
      }
      expect(requiredScope(method, '/api/admin/invitations')).toBeNull();
      expect(requiredScope(method, '/api/admin/invitations/inv-1')).toBeNull();
    }
    // Odd id segments must not fall through to the generic users rule.
    expect(requiredScope('POST', '/api/admin/users//approve')).toBeNull();
    expect(requiredScope('POST', '/api/admin/users/a/b/reject')).toBeNull();
    // Neighbours keep their scope: ban/unban/delete and the directory are unchanged.
    expect(requiredScope('POST', '/api/admin/users/u1/unban')).toBe('users:write');
    expect(requiredScope('DELETE', '/api/admin/users/u1')).toBe('users:write');
    expect(requiredScope('GET', '/api/admin/users/stats')).toBe('users:read');
    expect(requiredScope('GET', '/api/admin/invitationsx')).toBeNull();
  });
  it('lets a key read the role matrix with settings:read, and never write it (AD-09)', () => {
    expect(requiredScope('GET', '/api/admin/permissions-matrix')).toBe('settings:read');
    expect(requiredScope('HEAD', '/api/admin/permissions-matrix')).toBe('settings:read');
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(requiredScope(method, '/api/admin/permissions-matrix')).toBeNull();
    }
    // Reading the matrix is a settings read, so only a super-admin's key can carry it.
    expect(roleAllowsScope(ROLES.ADMIN, 'settings:read')).toBe(false);
    expect(roleAllowsScope(ROLES.SUPER_ADMIN, 'settings:read')).toBe(true);
  });
  it('blocks auth, key management (admin and personal), resets and unknown routes', () => {
    expect(requiredScope('POST', '/api/auth/sign-in/email')).toBeNull();
    expect(requiredScope('GET', '/api/api-keys')).toBeNull();
    expect(requiredScope('GET', '/api/me/api-keys')).toBeNull();
    expect(requiredScope('POST', '/api/me/api-keys/x/rotate')).toBeNull();
    expect(requiredScope('POST', '/api/ops/reset/limiter')).toBeNull();
    expect(requiredScope('DELETE', '/api/logs')).toBeNull();
    expect(requiredScope('GET', '/api/posts')).toBeNull();
    expect(isPublicRead('GET', '/api/posts')).toBe(true);
    expect(isPublicRead('POST', '/api/posts')).toBe(false);
    expect(isPublicRead('GET', '/api/version')).toBe(true);
    expect(requiredScope('GET', '/api/openapi.json')).toBeNull();
    expect(isPublicRead('GET', '/api/openapi.json')).toBe(true);
    expect(isPublicRead('POST', '/api/openapi.json')).toBe(false);
    expect(requiredScope('POST', '/api/app/avatar')).toBeNull(); // session-only since S0B-19 (D10)
    expect(requiredScope('DELETE', '/api/app/avatar')).toBeNull();
    expect(isPublicRead('GET', '/api/storage/avatars/u1/a.png')).toBe(true);
    expect(isPublicRead('PUT', '/api/storage/avatars/u1/a.png')).toBe(false);
    expect(requiredScope('GET', '/api/storage/avatars/u1/a.png')).toBeNull();
    expect(requiredScope('PUT', '/api/storage/avatars/u1/a.png')).toBeNull();
    // The demo endpoints are gone (S0A-13): nothing public is left under /api/demo.
    expect(isPublicRead('GET', '/api/demo')).toBe(false);
    expect(requiredScope('GET', '/api/demo')).toBeNull();
    expect(requiredScope('POST', '/api/auth/sign-in/anonymous')).toBeNull();
  });
});

describe('role ceiling', () => {
  it('never lets a key exceed its owner role', () => {
    expect(roleAllowsScope('member', 'posts:write')).toBe(true);
    expect(roleAllowsScope('member', 'users:read')).toBe(false);
    expect(roleAllowsScope('admin', 'users:write')).toBe(true);
    expect(roleAllowsScope('admin', 'settings:write')).toBe(false);
    expect(roleAllowsScope('super-admin', 'settings:write')).toBe(true);
    expect(roleAllowsScope('admin', 'mcp')).toBe(false);
    expect(roleAllowsScope('super-admin', 'mcp')).toBe(true);
    expect(scopesForRole('member')).toEqual(['posts:write', 'me:read', 'app:read', 'app:write']);
  });

  it('treats the legacy "user" role and null as member', () => {
    expect(scopesForRole('user')).toEqual(scopesForRole('member'));
    expect(scopesForRole(null)).toEqual(scopesForRole('member'));
  });
});

// Lowest role that may hold each scope. Written out by hand (not derived from
// SCOPES) so a wrong minRole in the table fails here; a new scope fails the
// completeness check below until it is added.
const MIN_ROLE: Record<Scope, number> = {
  'analytics:read': 3,
  'analytics:write': 3,
  'users:read': 2,
  'users:write': 2,
  'sessions:read': 3,
  'sessions:write': 3,
  'posts:write': 0,
  'audit:read': 3,
  'logs:read': 3,
  'file-health:read': 3,
  'settings:read': 3,
  'settings:write': 3,
  'ops:read': 3,
  mcp: 3,
  'me:read': 0,
  'app:read': 0,
  'app:write': 0,
};
const ROLE_ORDER = [ROLES.MEMBER, ROLES.PROJECT_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN] as const;
const CASES = ROLE_ORDER.flatMap((role, rank) =>
  (Object.keys(MIN_ROLE) as Scope[]).map(
    (scope) => [role, scope, rank >= MIN_ROLE[scope]] as const,
  ),
);

describe('role ceiling matrix (four roles x every scope)', () => {
  it('covers every scope in the table', () => {
    expect(Object.keys(MIN_ROLE).sort()).toEqual([...SCOPE_IDS].sort());
  });

  it.each(CASES)('%s holding %s -> %p', (role, scope, allowed) => {
    expect(roleAllowsScope(role, scope)).toBe(allowed);
    expect(scopesForRole(role).includes(scope)).toBe(allowed);
  });

  it('project_manager gets no scope beyond member (no PM-only scope yet)', () => {
    expect(scopesForRole('project_manager')).toEqual(scopesForRole('member'));
  });
});

describe('PM routes denied to API keys (D10)', () => {
  it('returns null for the four deny patterns, whatever the method', () => {
    expect(requiredScope('DELETE', '/api/app/projects/p1')).toBeNull();
    expect(requiredScope('POST', '/api/app/projects/p1/members')).toBeNull();
    expect(requiredScope('PATCH', '/api/app/profile')).toBeNull();
    expect(requiredScope('POST', '/api/app/avatar')).toBeNull();
    expect(requiredScope('delete', '/api/app/projects/p1/members/u1')).toBeNull();
    expect(requiredScope('GET', '/api/app/projects/p1/members')).toBeNull();
  });
  it('keeps ordinary PM routes on app:read / app:write', () => {
    expect(requiredScope('POST', '/api/app/tasks')).toBe('app:write');
    expect(requiredScope('PATCH', '/api/app/tasks/1')).toBe('app:write');
    // "Tulis saja" calls a paid provider but changes no data; it is a POST, so a read-only key is refused (A1).
    expect(requiredScope('POST', '/api/app/tasks/draft')).toBe('app:write');
    expect(requiredScope('post', '/api/app/tasks/draft/')).toBe('app:write');
    expect(requiredScope('GET', '/api/app/projects')).toBe('app:read');
    expect(requiredScope('GET', '/api/app/tasks')).toBe('app:read');
    expect(requiredScope('GET', '/api/app/profile')).toBe('app:read');
    // Team is read-only, so both routes stay on app:read (S6 M03/M04).
    expect(requiredScope('GET', '/api/app/team')).toBe('app:read');
    expect(requiredScope('GET', '/api/app/team/u1')).toBe('app:read');
  });
  // The Beranda is one read-only call: a key may read the home of its owner, and nothing writes through it.
  it('maps GET /api/app/home to app:read and refuses to write to it', () => {
    expect(requiredScope('GET', '/api/app/home')).toBe('app:read');
    expect(requiredScope('POST', '/api/app/home')).toBe('app:write');
  });
  // The Inbox routes are not destructive, so a key may read the cards of its owner and mark them
  // read; nothing here is in PM_KEY_DENY (S3 I04).
  it('maps the Inbox routes to app:read / app:write', () => {
    expect(requiredScope('GET', '/api/app/inbox')).toBe('app:read');
    expect(requiredScope('GET', '/api/app/inbox/count')).toBe('app:read');
    expect(requiredScope('POST', '/api/app/inbox/n1/read')).toBe('app:write');
    expect(requiredScope('POST', '/api/app/inbox/read-all')).toBe('app:write');
  });

  // S7 E-06 (Q-E4): a key may read and plan events, but not invite people, call a meeting off or
  // delete one — those reach a human or remove data (see `scopes.pm.ts`).
  it('returns null for the event routes that reach a guest or remove data', () => {
    expect(requiredScope('POST', '/api/app/events/e1/participants')).toBeNull();
    expect(requiredScope('delete', '/api/app/events/e1/participants/u1')).toBeNull();
    expect(requiredScope('POST', '/api/app/events/e1/cancel')).toBeNull();
    expect(requiredScope('DELETE', '/api/app/events/e1')).toBeNull();
    // The Urungkan half: restoring from the Trash is as sensitive as the delete (E-07).
    expect(requiredScope('POST', '/api/app/trash/event/e1/restore')).toBeNull();
  });

  // Leave: a key may read leave and send a request, but not decide, withdraw or change the switch.
  it('keeps leave reads and sending a request on app:read / app:write', () => {
    expect(requiredScope('GET', '/api/app/leave/me')).toBe('app:read');
    expect(requiredScope('GET', '/api/app/leave/pending')).toBe('app:read');
    expect(requiredScope('GET', '/api/app/leave/settings')).toBe('app:read');
    expect(requiredScope('POST', '/api/app/leave')).toBe('app:write');
  });

  it('returns null for the leave routes that decide, withdraw or change the switch', () => {
    expect(requiredScope('POST', '/api/app/leave/l1/approve')).toBeNull();
    expect(requiredScope('POST', '/api/app/leave/l1/reject')).toBeNull();
    expect(requiredScope('post', '/api/app/leave/l1/approve/')).toBeNull();
    expect(requiredScope('DELETE', '/api/app/leave/l1')).toBeNull();
    expect(requiredScope('PUT', '/api/app/leave/settings')).toBeNull();
    expect(requiredScope('PUT', '/api/app/leave/settings/')).toBeNull();
  });

  it('keeps the event reads, writes and minutes on app:read / app:write', () => {
    expect(requiredScope('GET', '/api/app/events')).toBe('app:read');
    expect(requiredScope('GET', '/api/app/events/agenda')).toBe('app:read');
    expect(requiredScope('GET', '/api/app/events/people')).toBe('app:read');
    expect(requiredScope('GET', '/api/app/events/e1')).toBe('app:read');
    expect(requiredScope('POST', '/api/app/events')).toBe('app:write');
    expect(requiredScope('PATCH', '/api/app/events/e1')).toBe('app:write');
    expect(requiredScope('PUT', '/api/app/events/e1/note')).toBe('app:write');
  });
});
