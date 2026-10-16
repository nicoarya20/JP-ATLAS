/** Scope decisions for the task routes (S2-03/S2-04): keys read with app:read and write with app:write (X1-Q9). */
import { describe, expect, test } from 'bun:test';
import { Elysia } from 'elysia';
import { tasksApi } from '../../server/api/app-tasks';
import { requiredScope } from '../../server/api-keys/scopes';
import { isPmKeyDenied } from '../../server/api-keys/scopes.pm';

const routes = new Elysia({ prefix: '/api/app' }).use(tasksApi).routes;

describe('task route scopes', () => {
  test.each([
    ['GET', '/api/app/tasks', 'app:read'],
    ['GET', '/api/app/tasks/counts', 'app:read'],
    ['GET', '/api/app/tasks/482', 'app:read'],
    ['GET', '/api/app/tasks/7f1c2d3e-task-id', 'app:read'],
  ] as const)('%s %s needs %s', (method, path, scope) => {
    expect(isPmKeyDenied(method, path)).toBe(false);
    expect(requiredScope(method, path)).toBe(scope);
  });

  test('every route the task plugin registers is covered above', () => {
    expect(routes.map((r) => `${r.method} ${r.path}`).sort()).toEqual(
      ['GET /api/app/tasks/', 'GET /api/app/tasks/counts', 'GET /api/app/tasks/:ref'].sort(),
    );
  });
});
