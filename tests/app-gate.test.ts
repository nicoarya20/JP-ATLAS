/**
 * Gate for the whole /api/app surface (S0B-18): (a) the 401 beats body validation, so an
 * anonymous caller never sees a 422 (schema leak), and (b) every route in the real route
 * table answers anonymous callers 401 and held accounts 403.
 */
import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { Elysia, t } from 'elysia';
import { api } from '../server/api';
import { appContext } from '../server/api/app-context';
import { apiErrorPlugin } from '../server/api-error';
import * as guardMod from '../server/guard';
import { rateLimiter } from '../server/rate-limit';
import { installAuthSpies } from './support/auth';

const auth = installAuthSpies();
const MEMBER = { id: 'gate-member', role: 'member' };

// The real error plugin so every response is checked in its production shape.
const spike = new Elysia({ prefix: '/api' }).use(apiErrorPlugin()).use(
  new Elysia({ prefix: '/spike' })
    .use(appContext)
    .post('/items', ({ actor, body }) => ({ by: actor.user.id, name: body.name }), {
      body: t.Object({ name: t.String({ minLength: 2 }) }),
    }),
);
// A second module nesting the same plugin, as every real module will: the gate must not run twice.
const twin = new Elysia({ prefix: '/api' })
  .use(apiErrorPlugin())
  .use(new Elysia({ prefix: '/twin' }).use(appContext).get('/a', ({ actor }) => actor.user.id))
  .use(new Elysia({ prefix: '/twin' }).use(appContext).get('/b', ({ actor }) => actor.user.id));

// Control: the old shape (a 401 from onBeforeHandle) loses to validation, which is why derive throws.
const legacy = new Elysia({ prefix: '/api' })
  .use(apiErrorPlugin())
  .use(
    new Elysia({ prefix: '/legacy' })
      .onBeforeHandle(({ status }) => status(401, { error: 'Masuk dulu', code: 'UNAUTHORIZED' }))
      .post('/items', ({ body }) => body, { body: t.Object({ name: t.String({ minLength: 2 }) }) }),
  );

function post(path: string, json: unknown) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(json),
  });
}
async function bodyOf(res: Response) {
  return (await res.json()) as Record<string, unknown>;
}

beforeEach(() => {
  auth.as(null);
  rateLimiter.reset();
});

describe('spike: the 401 gate runs before body validation', () => {
  test('anonymous + invalid body → 401 UNAUTHORIZED, not 422', async () => {
    const res = await spike.handle(post('/api/spike/items', { name: 'x' }));
    expect<number>(res.status).toBe(401);
    expect(await bodyOf(res)).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  });

  test('anonymous + body of the wrong type → 401 and no schema detail', async () => {
    const res = await spike.handle(post('/api/spike/items', { name: 42 }));
    const body = await bodyOf(res);
    expect<number>(res.status).toBe(401);
    expect(body.issues).toBeUndefined();
    expect(typeof body.requestId).toBe('string');
  });

  test('control: an onBeforeHandle gate answers anonymous + invalid body with 422', async () => {
    const res = await legacy.handle(post('/api/legacy/items', { name: 'x' }));
    expect<number>(res.status).toBe(422);
  });

  test('signed-in user + invalid body → uniform 422 with issues', async () => {
    auth.as(MEMBER);
    const res = await spike.handle(post('/api/spike/items', { name: 'x' }));
    const body = await bodyOf(res);
    expect<number>(res.status).toBe(422);
    expect(body).toMatchObject({ code: 'VALIDATION', status: 422 });
    expect(typeof body.error).toBe('string');
    expect(typeof body.requestId).toBe('string');
    expect((body.issues as unknown[]).length).toBeGreaterThan(0);
  });

  test('signed-in user + valid body → handler runs with a non-null actor', async () => {
    auth.as(MEMBER);
    const res = await spike.handle(post('/api/spike/items', { name: 'ok' }));
    expect<number>(res.status).toBe(200);
    expect(await bodyOf(res)).toEqual({ by: 'gate-member', name: 'ok' });
  });

  test('a pending account with an invalid body → 403 ACCOUNT_PENDING, not 422', async () => {
    auth.as({ ...MEMBER, approvalStatus: 'pending' });
    const res = await spike.handle(post('/api/spike/items', { name: 'x' }));
    expect<number>(res.status).toBe(403);
    expect(await bodyOf(res)).toMatchObject({ code: 'ACCOUNT_PENDING', status: 403 });
  });

  test('two modules nesting the plugin resolve the caller once per request', async () => {
    auth.as(MEMBER);
    const resolve = spyOn(guardMod, 'resolveActor');
    try {
      for (const path of ['/api/twin/a', '/api/twin/b']) {
        resolve.mockClear();
        const res = await twin.handle(new Request(`http://localhost${path}`));
        expect<number>(res.status).toBe(200);
        expect(resolve).toHaveBeenCalledTimes(1);
      }
    } finally {
      resolve.mockRestore();
    }
  });
});

type RouteRow = { method: string; path: string; label: string };
const ROUTES: RouteRow[] = (api.routes as Array<{ method: string; path: string }>)
  .filter((r) => r.path.startsWith('/api/app') && r.method !== 'HEAD' && r.method !== 'OPTIONS')
  .map((r) => ({ ...r, label: `${r.method} ${r.path}` }));

/** Junk body on every non-GET verb: a route that validates before it gates would answer 422. */
async function send(r: RouteRow) {
  const res = await api.handle(
    new Request(`http://localhost${r.path.replace(/:\w+/g, 'any-id')}`, {
      method: r.method,
      headers: r.method === 'GET' ? {} : { 'content-type': 'application/json' },
      body: r.method === 'GET' ? undefined : JSON.stringify({ junk: true }),
    }),
  );
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe('sweep: every /api/app route carries the gate', () => {
  test('the route table holds the known routes (a vacuous sweep must fail)', () => {
    expect(ROUTES.map((r) => r.label)).toEqual(
      expect.arrayContaining([
        'GET /api/app/whoami',
        'POST /api/app/avatar',
        'DELETE /api/app/avatar',
      ]),
    );
  });

  test.each(ROUTES)('$label: anonymous → 401 UNAUTHORIZED', async (r) => {
    const res = await send(r);
    expect<number>(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    expect(typeof res.body.requestId).toBe('string');
  });

  test.each(ROUTES)('$label: pending account → 403 ACCOUNT_PENDING', async (r) => {
    auth.as({ ...MEMBER, approvalStatus: 'pending' });
    const res = await send(r);
    expect<number>(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'ACCOUNT_PENDING', status: 403 });
  });
});
