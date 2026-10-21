/**
 * `GET /api/admin/permissions-matrix` (P11 AD-09): Admin and Super-admin may read the role
 * matrix, nobody below them may, and nobody may write it. The caller is driven through spies on
 * the session and the role resolver, so the real gate, policy and router all run.
 */
import { afterAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import Elysia from 'elysia';
import { adminApi } from '../../server/api/admin';
import { adminPermissionsApi } from '../../server/api/admin-permissions';
import { buildPermissionsMatrix } from '../../server/api/admin-permissions.matrix';
import { apiErrorPlugin } from '../../server/api-error';
import { auth } from '../../server/auth';
import * as rolesMod from '../../server/roles';

type Caller = { role: string; approval?: string } | null;
const ctx: { caller: Caller } = { caller: null };

const spies = [
  spyOn(auth.api, 'getSession').mockImplementation((async () =>
    ctx.caller
      ? {
          user: {
            id: 'matrix-caller',
            email: 'matrix-caller@test.local',
            approvalStatus: ctx.caller.approval ?? 'approved',
          },
          session: { impersonatedBy: null },
        }
      : null) as unknown as typeof auth.api.getSession),
  spyOn(rolesMod, 'resolveUserRole').mockImplementation(
    async () => (ctx.caller?.role ?? 'member') as 'member',
  ),
];
beforeEach(() => {
  ctx.caller = null;
});
afterAll(() => {
  for (const s of spies) s.mockRestore();
});

const PATH = '/admin/permissions-matrix';
const app = new Elysia().use(apiErrorPlugin()).use(adminApi);

async function call(method = 'GET', path = PATH) {
  const res = await app.handle(new Request(`http://localhost${path}`, { method }));
  return {
    status: res.status,
    body: (await res.json().catch(() => null)) as Record<string, unknown>,
  };
}

describe('GET /api/admin/permissions-matrix', () => {
  test('the route is registered under the admin prefix', () => {
    const routes = (adminApi.routes as Array<{ method: string; path: string }>).map(
      (r) => `${r.method} ${r.path}`,
    );
    expect(routes).toContain(`GET ${PATH}`);
  });

  test('an anonymous caller gets 401', async () => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  test('a member and a project manager get 403 NOT_ADMIN', async () => {
    for (const role of ['member', 'project_manager']) {
      ctx.caller = { role };
      const res = await call();
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('NOT_ADMIN');
    }
  });

  test('an admin whose account is still pending gets 403', async () => {
    ctx.caller = { role: 'admin', approval: 'pending' };
    const res = await call();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_PENDING');
  });

  test('an admin reads the matrix the server derives, unchanged', async () => {
    ctx.caller = { role: 'admin' };
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.body).toEqual(buildPermissionsMatrix());
  });

  test('a super-admin reads the same matrix', async () => {
    ctx.caller = { role: 'super-admin' };
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.body).toEqual(buildPermissionsMatrix());
  });

  test('the tab is read-only: no verb other than GET exists', async () => {
    ctx.caller = { role: 'super-admin' };
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect((await call(method)).status).toBe(404);
    }
  });
});

describe('the router carries the gate on its own', () => {
  // Mounted without adminApi: the gate must come from the router itself, not from its parent.
  const alone = new Elysia()
    .use(apiErrorPlugin())
    .use(new Elysia({ prefix: '/admin' }).use(adminPermissionsApi));

  test('answers 401 to an anonymous caller', async () => {
    const res = await alone.handle(new Request(`http://localhost${PATH}`));
    expect(res.status).toBe(401);
  });
});
