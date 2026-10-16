/** Scope decisions for the task routes (S2-03/S2-04/S2-05): keys read with app:read and write with app:write (X1-Q9). */
import { describe, expect, test } from 'bun:test';
import { Elysia } from 'elysia';
import { tasksApi } from '../../server/api/app-tasks';
import { taskWorkflowApi } from '../../server/api/app-tasks.workflow';
import { requiredScope } from '../../server/api-keys/scopes';
import { isPmKeyDenied } from '../../server/api-keys/scopes.pm';
import { ENABLED_TASK_ACTIONS } from '../../server/task/task.limits';

const routes = new Elysia({ prefix: '/api/app' }).use(tasksApi).routes;

describe('task route scopes', () => {
  test.each([
    ['GET', '/api/app/tasks', 'app:read'],
    ['GET', '/api/app/tasks/counts', 'app:read'],
    ['GET', '/api/app/tasks/482', 'app:read'],
    ['GET', '/api/app/tasks/7f1c2d3e-task-id', 'app:read'],
    ['POST', '/api/app/tasks', 'app:write'],
    ['PATCH', '/api/app/tasks/482', 'app:write'],
    ['PATCH', '/api/app/tasks/7f1c2d3e-task-id', 'app:write'],
  ] as const)('%s %s needs %s', (method, path, scope) => {
    expect(isPmKeyDenied(method, path)).toBe(false);
    expect(requiredScope(method, path)).toBe(scope);
  });

  test('no task route is session-only: keys may create and edit tasks (X1-Q9)', () => {
    for (const r of routes) expect(isPmKeyDenied(r.method, r.path)).toBe(false);
  });

  test('every route the task plugin registers is covered above', () => {
    expect(routes.map((r) => `${r.method} ${r.path}`).sort()).toEqual(
      [
        'GET /api/app/tasks/',
        'GET /api/app/tasks/counts',
        'GET /api/app/tasks/:ref',
        'POST /api/app/tasks/',
        'PATCH /api/app/tasks/:ref',
      ].sort(),
    );
  });
});

describe('task workflow route scopes (S2-05)', () => {
  const workflow = new Elysia({ prefix: '/api/app' }).use(taskWorkflowApi).routes;

  test.each(
    ENABLED_TASK_ACTIONS.flatMap((a) => [
      [`/api/app/tasks/482/${a}`],
      [`/api/app/tasks/7f1c2d3e-task-id/${a}`],
    ]),
  )('POST %s needs app:write and is open to keys', (path) => {
    expect(isPmKeyDenied('POST', path)).toBe(false);
    expect(requiredScope('POST', path)).toBe('app:write');
  });

  test('the plugin registers exactly the six verbs, all covered above', () => {
    expect(workflow.map((r) => `${r.method} ${r.path}`).sort()).toEqual(
      ENABLED_TASK_ACTIONS.map((a) => `POST /api/app/tasks/:ref/${a}`).sort(),
    );
  });
});
