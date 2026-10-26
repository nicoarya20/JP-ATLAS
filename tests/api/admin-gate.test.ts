/**
 * Gate sweep for /api/admin: every route in `adminApi.routes` answers 401 to anonymous
 * callers, 403 to non-admins and held accounts. Sweeping the route table (instead of
 * listing routes by hand) catches a nested plugin that did not inherit the gate hooks.
 */
import { afterAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import Elysia from 'elysia';
import { adminApi } from '../../server/api/admin';
import { adminModerationApi } from '../../server/api/admin-moderation';
import { apiErrorPlugin } from '../../server/api-error';
import { auth } from '../../server/auth';
import { PM_ERRORS } from '../../server/pm/errors';
import * as rolesMod from '../../server/roles';

type Caller = { role: string; approval?: string } | null;
const ctx: { caller: Caller } = { caller: null };

const spies = [
  spyOn(auth.api, 'getSession').mockImplementation((async () =>
    ctx.caller
      ? {
          user: { id: 'gate-caller', approvalStatus: ctx.caller.approval ?? 'approved' },
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

// The real error plugin so every response is checked in its production shape.
const app = new Elysia().use(apiErrorPlugin()).use(adminApi);

type RouteRow = { method: string; path: string; label: string };
const ROUTES: RouteRow[] = (adminApi.routes as Array<{ method: string; path: string }>)
  .filter((r) => r.method !== 'HEAD' && r.method !== 'OPTIONS')
  .map((r) => ({ ...r, label: `${r.method} ${r.path}` }));

/**
 * A valid body per route, because Elysia validates the body before `onBeforeHandle`: a route whose
 * schema the generic body does not satisfy would answer 422 and the sweep would never reach its
 * gate. `{ role }` fits the role, ban and approval routes; anything stricter is listed here.
 */
const BODY_BY_PATH: Readonly<Record<string, unknown>> = {
  '/admin/users/:id/leave': { startDate: '2026-11-01', endDate: '2026-11-02' },
};
const bodyFor = (r: { method: string; path: string }) =>
  r.method === 'GET' ? undefined : (BODY_BY_PATH[r.path] ?? { role: 'member' });

async function send(r: { method: string; path: string }) {
  const body = bodyFor(r);
  const res = await app.handle(
    new Request(`http://localhost${r.path.replace(/:\w+/g, 'any-id')}`, {
      method: r.method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe('every /admin route carries the gate', () => {
  test('the route table holds the expected routes (a vacuous sweep must fail)', () => {
    expect(ROUTES.map((r) => r.label)).toEqual(
      expect.arrayContaining([
        'GET /admin/users',
        'GET /admin/users/stats',
        'POST /admin/users/:id/role',
        'POST /admin/users/:id/ban',
        'POST /admin/users/:id/unban',
        'DELETE /admin/users/:id',
        'PUT /admin/users/:id/leave',
        'DELETE /admin/users/:id/leave',
      ]),
    );
  });

  test.each(ROUTES)('$label: anonymous → 401 UNAUTHORIZED', async (r) => {
    const res = await send(r);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  test.each(ROUTES)('$label: member and project manager → 403 NOT_ADMIN', async (r) => {
    for (const role of ['member', 'project_manager']) {
      ctx.caller = { role };
      const res = await send(r);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('NOT_ADMIN');
    }
  });

  test.each(ROUTES)('$label: admin whose account is pending → 403 ACCOUNT_PENDING', async (r) => {
    ctx.caller = { role: 'admin', approval: 'pending' };
    const res = await send(r);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_PENDING');
  });
});

describe('a nested router is gated on its own', () => {
  // Mounted without the parent: the gate must come from the router itself, not from adminApi.
  const alone = new Elysia()
    .use(apiErrorPlugin())
    .use(new Elysia({ prefix: '/admin' }).use(adminModerationApi));

  test.each(['ban', 'unban'])(
    'POST /users/:id/%s answers 401 to anonymous callers',
    async (verb) => {
      const res = await alone.handle(
        new Request(`http://localhost/admin/users/any-id/${verb}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        }),
      );
      expect(res.status).toBe(401);
    },
  );
});

describe('admin error shape', () => {
  test('gate errors carry { error, code, status, requestId } with Indonesian text', async () => {
    const anon = await send({ method: 'GET', path: '/admin/users' });
    ctx.caller = { role: 'member' };
    const denied = await send({ method: 'GET', path: '/admin/users' });
    for (const { body } of [anon, denied]) {
      expect(typeof body.error).toBe('string');
      expect(typeof body.code).toBe('string');
      expect(typeof body.status).toBe('number');
      expect(typeof body.requestId).toBe('string');
    }
    expect(denied.body.error).toBe(PM_ERRORS.NOT_ADMIN.message);
    expect(anon.body.error).toBe('Silakan masuk terlebih dahulu.');
  });

  test('an admin passes the gate on the directory and stats routes', async () => {
    ctx.caller = { role: 'admin' };
    expect((await send({ method: 'GET', path: '/admin/users' })).status).toBe(200);
    expect((await send({ method: 'GET', path: '/admin/users/stats' })).status).toBe(200);
  });
});
