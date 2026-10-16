/** Scope decisions for the project, member and people-picker routes (S1-04): members are session-only (X1-Q9). */
import { describe, expect, test } from 'bun:test';
import { Elysia } from 'elysia';
import { projectMembersApi } from '../../server/api/app-projects.members';
import { teamPickerApi } from '../../server/api/app-team.picker';
import { requiredScope } from '../../server/api-keys/scopes';
import { isPmKeyDenied } from '../../server/api-keys/scopes.pm';
import { API_KEY_PREFIX } from '../../server/auth';
import { call } from '../support/api';

const KEY_DENIED_MESSAGE = 'Endpoint ini tidak bisa diakses dengan API key';
// Denied routes answer before the key is verified, so any well-formed key shows the decision.
const key = { 'x-api-key': `${API_KEY_PREFIX}not-a-real-key` }; // test-only

describe('project route scopes', () => {
  test.each([
    ['GET', '/api/app/projects', 'app:read'],
    ['GET', '/api/app/projects/p1', 'app:read'],
    ['POST', '/api/app/projects', 'app:write'],
    ['PATCH', '/api/app/projects/p1', 'app:write'],
    ['POST', '/api/app/projects/p1/status', 'app:write'],
    ['GET', '/api/app/team/picker', 'app:read'],
  ] as const)('%s %s needs %s', (method, path, scope) => {
    expect(isPmKeyDenied(method, path)).toBe(false);
    expect(requiredScope(method, path)).toBe(scope);
  });
});

describe('member routes are session-only', () => {
  const routes = new Elysia({ prefix: '/api/app' }).use(projectMembersApi).routes;

  test.each([
    ['GET', '/api/app/projects/p1/members'],
    ['POST', '/api/app/projects/p1/members'],
    ['PATCH', '/api/app/projects/p1/members/u1'],
    ['DELETE', '/api/app/projects/p1/members/u1'],
  ] as const)('%s %s is denied to every key', (method, path) => {
    expect(isPmKeyDenied(method, path)).toBe(true);
  });

  test('every route of the member plugin is denied to keys', () => {
    expect(routes.length).toBe(4);
    for (const r of routes) expect(isPmKeyDenied(r.method, r.path)).toBe(true);
  });

  test.each([
    ['POST', '/app/projects/p1/members', { userId: 'u1', role: 'member' }],
    ['PATCH', '/app/projects/p1/members/u1', { role: 'viewer' }],
    ['DELETE', '/app/projects/p1/members/u1', undefined],
  ] as const)('a key calling %s %s gets 403', async (method, path, body) => {
    const res = await call(method, path, body, key);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe(KEY_DENIED_MESSAGE);
  });
});

describe('people picker', () => {
  test('the picker plugin only reads, so a key with app:read may call it', () => {
    const routes = new Elysia({ prefix: '/api/app' }).use(teamPickerApi).routes;
    expect(routes.map((r) => `${r.method} ${r.path}`)).toEqual(['GET /api/app/team/picker']);
    for (const r of routes) expect(requiredScope(r.method, r.path)).toBe('app:read');
  });
});
