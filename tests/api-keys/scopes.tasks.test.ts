/** Scope decisions for the task routes (S2-03..S2-06): keys read with app:read and write with app:write (X1-Q9). */
import { describe, expect, test } from 'bun:test';
import { Elysia } from 'elysia';
import { tasksApi } from '../../server/api/app-tasks';
import { taskDetailApi } from '../../server/api/app-tasks.detail';
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

describe('task detail route scopes (S2-06)', () => {
  const detail = new Elysia({ prefix: '/api/app' }).use(taskDetailApi).routes;

  test.each([
    ['POST', '/api/app/tasks/482/checklist', 'app:write'],
    ['PATCH', '/api/app/tasks/482/checklist/item-1', 'app:write'],
    ['POST', '/api/app/tasks/7f1c2d3e-task-id/comments', 'app:write'],
    ['PATCH', '/api/app/tasks/482/comments/comment-1', 'app:write'],
    ['GET', '/api/app/tasks/482/timeline', 'app:read'],
    ['GET', '/api/app/tasks/482/timeline?limit=10', 'app:read'],
  ] as const)('%s %s needs %s and is open to keys', (method, path, scope) => {
    expect(isPmKeyDenied(method, path)).toBe(false);
    expect(requiredScope(method, path)).toBe(scope);
  });

  // Default decision (X1-Q9 lets keys create and edit tasks): removing a step or a comment is a hard
  // delete, so it stays session-only like the other destructive PM routes.
  test.each([
    '/api/app/tasks/482/checklist/item-1',
    '/api/app/tasks/7f1c2d3e-task-id/comments/comment-1',
    '/api/app/TASKS/482/COMMENTS/comment-1',
    '/api/app/tasks/a/b/checklist/item-1',
  ])('DELETE %s is session only', (path) => {
    expect(isPmKeyDenied('DELETE', path)).toBe(true);
    expect(requiredScope('DELETE', path)).toBeNull();
  });

  // S6 widened the rule: every DELETE below a task is session-only, the task itself included, so
  // the S2 expectation here is reversed on purpose. Source: the user decision in
  // `tahapan-proyek/05-implementasi/JADWAL-S3-S8.md` §5 no. 4 ("kunci API tidak boleh menghapus
  // tugas"), which answers P8 Q2. Reads and writes of the same paths stay open.
  test('the delete patterns do not swallow reads or writes of the same paths', () => {
    expect(isPmKeyDenied('PATCH', '/api/app/tasks/482/comments/comment-1')).toBe(false);
    expect(isPmKeyDenied('GET', '/api/app/tasks/482/timeline')).toBe(false);
    expect(isPmKeyDenied('DELETE', '/api/app/tasks')).toBe(false);
    expect(isPmKeyDenied('DELETE', '/api/app/tasks/482')).toBe(true);
    expect(isPmKeyDenied('DELETE', '/api/app/tasks/482/timeline')).toBe(true);
  });

  test('the plugin registers exactly the seven detail routes, all covered above', () => {
    expect(detail.map((r) => `${r.method} ${r.path}`).sort()).toEqual(
      [
        'POST /api/app/tasks/:ref/checklist',
        'PATCH /api/app/tasks/:ref/checklist/:itemId',
        'DELETE /api/app/tasks/:ref/checklist/:itemId',
        'POST /api/app/tasks/:ref/comments',
        'PATCH /api/app/tasks/:ref/comments/:commentId',
        'DELETE /api/app/tasks/:ref/comments/:commentId',
        'GET /api/app/tasks/:ref/timeline',
      ].sort(),
    );
  });
});
