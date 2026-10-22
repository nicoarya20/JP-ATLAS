/** Scope decisions for the project schedule routes (S5a-04): plan, deadline, override and activity. */
import { describe, expect, test } from 'bun:test';
import { Elysia } from 'elysia';
import { projectScheduleApi } from '../../server/api/app-projects.schedule';
import { requiredScope } from '../../server/api-keys/scopes';
import { isPmKeyDenied } from '../../server/api-keys/scopes.pm';
import { API_KEY_PREFIX } from '../../server/auth';
import { call } from '../support/api';

const KEY_DENIED_MESSAGE = 'Endpoint ini tidak bisa diakses dengan API key';
// Denied routes answer before the key is verified, so any well-formed key shows the decision.
const key = { 'x-api-key': `${API_KEY_PREFIX}not-a-real-key` }; // test-only
const routes = new Elysia({ prefix: '/api/app' }).use(projectScheduleApi).routes;

/** Every schedule route and the scope a key needs; `null` = session only. */
const DECISIONS = [
  ['GET', '/api/app/projects/:id/plan', 'app:read'],
  ['GET', '/api/app/projects/:id/extensions', 'app:read'],
  ['GET', '/api/app/projects/:id/activity', 'app:read'],
  ['POST', '/api/app/projects/:id/phases', 'app:write'],
  // Putting phases in another order loses nothing and can be put back: open to keys.
  ['POST', '/api/app/projects/:id/phases/reorder', 'app:write'],
  ['PATCH', '/api/app/projects/:id/phases/:phaseId', 'app:write'],
  ['DELETE', '/api/app/projects/:id/phases/:phaseId', null],
  ['POST', '/api/app/projects/:id/milestones', 'app:write'],
  ['PATCH', '/api/app/projects/:id/milestones/:mid', 'app:write'],
  ['DELETE', '/api/app/projects/:id/milestones/:mid', null],
  ['POST', '/api/app/projects/:id/milestones/:mid/reach', 'app:write'],
  ['POST', '/api/app/projects/:id/milestones/:mid/unreach', 'app:write'],
  ['POST', '/api/app/projects/:id/extend-deadline', null],
  ['POST', '/api/app/projects/:id/condition-override', null],
  ['DELETE', '/api/app/projects/:id/condition-override', null],
] as const;

describe('schedule routes: scope decision per route', () => {
  test('the table lists exactly the routes of the schedule plugin', () => {
    const real = routes.map((r) => `${r.method} ${r.path}`).sort();
    expect(DECISIONS.map(([m, p]) => `${m} ${p}`).sort()).toEqual(real);
  });

  test.each(DECISIONS)('%s %s -> %s', (method, path, scope) => {
    const concrete = path.replace(':id', 'p1').replace(':phaseId', 'ph1').replace(':mid', 'm1');
    expect(requiredScope(method, concrete)).toBe(scope);
    expect(isPmKeyDenied(method, concrete)).toBe(scope === null);
  });
});

describe('session-only schedule writes', () => {
  test.each([
    ['DELETE', '/api/app/projects/p1/phases/ph1'],
    ['DELETE', '/api/app/projects/p1/milestones/m1'],
    ['DELETE', '/api/app/projects/p1/condition-override'],
    ['POST', '/api/app/projects/p1/condition-override'],
    ['POST', '/api/app/projects/p1/condition-override/'],
    ['POST', '/api/app/projects/a/b/condition-override'],
    ['POST', '/api/app/PROJECTS/p1/CONDITION-OVERRIDE'],
    ['POST', '/api/app/projects/p1/extend-deadline'],
    ['POST', '/api/app/projects/p1/extend-deadline/'],
    ['POST', '/api/app/projects/a/b/extend-deadline'],
    ['POST', '/api/app/PROJECTS/p1/EXTEND-DEADLINE'],
  ])('%s %s is denied to every key', (method, path) => {
    expect(isPmKeyDenied(method, path)).toBe(true);
    expect(requiredScope(method, path)).toBeNull();
  });

  test.each([
    ['POST', '/api/app/projects/p1/condition-override'],
    ['DELETE', '/api/app/projects/p1/condition-override'],
    ['POST', '/api/app/projects/p1/extend-deadline'],
    ['DELETE', '/api/app/projects/p1/phases/ph1'],
    ['DELETE', '/api/app/projects/p1/milestones/m1'],
  ])('a key calling %s %s gets 403', async (method, path) => {
    const res = await call(method, path, method === 'DELETE' ? undefined : {}, key);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe(KEY_DENIED_MESSAGE);
  });

  test('the new rules do not swallow lookalike paths', () => {
    expect(isPmKeyDenied('POST', '/api/app/projects/p1/extend-deadlines')).toBe(false);
    expect(isPmKeyDenied('POST', '/api/app/projects/p1/condition')).toBe(false);
    expect(isPmKeyDenied('GET', '/api/app/projects/p1/extensions')).toBe(false);
    expect(isPmKeyDenied('GET', '/api/app/projects/p1/activity')).toBe(false);
  });
});
