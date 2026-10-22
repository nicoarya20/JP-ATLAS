/** appContext: account gate (session and API key), uniform error shape, and the per-user write limiter. */
import { afterAll, afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { Elysia } from 'elysia';
import { appContext, writeLimiter } from '../../server/api/app-context';
import { apiErrorPlugin } from '../../server/api-error';
import { setApiKeyIdentity } from '../../server/api-keys/identity';
import * as guardMod from '../../server/guard';
import * as limiterMod from '../../server/middleware/rate-limiter';
import { WRITE_RATE_MAX, WRITE_RATE_WINDOW_SECONDS } from '../../server/pm/limits';
import { call, expectApiError } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createUserFactory } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const users = createUserFactory(cleaner, { tag: 'appctx' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

// The real error plugin so a thrown Response and status() are checked in production shape.
const mini = new Elysia({ prefix: '/api' }).use(apiErrorPlugin()).use(
  new Elysia({ prefix: '/ctx' })
    .use(appContext)
    .get('/r', ({ actor }) => ({ id: actor.user.id }))
    .post('/w', ({ actor }) => ({ id: actor.user.id }))
    .delete('/w', ({ actor }) => ({ id: actor.user.id })),
);
const send = (method: string, path: string, req?: (r: Request) => void) => {
  const request = new Request(`http://localhost/api/ctx${path}`, { method });
  req?.(request);
  return mini.handle(request);
};
async function shaped(res: Response) {
  return {
    status: res.status,
    body: (await res.json()) as Record<string, unknown>,
    headers: res.headers,
  };
}

beforeEach(() => {
  auth.as(null);
  writeLimiter.reset();
});

describe('account gate on /api/app', () => {
  test('approved member passes', async () => {
    auth.as({ id: 'ctx-ok', role: 'member' });
    const res = await call('GET', '/app/whoami');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ userId: 'ctx-ok', role: 'member' });
  });

  test.each([
    ['pending', 'ACCOUNT_PENDING'],
    ['rejected', 'ACCOUNT_REJECTED'],
  ])('%s session → 403 %s in the uniform shape', async (approvalStatus, code) => {
    auth.as({ id: `ctx-${approvalStatus}`, role: 'member', approvalStatus });
    expectApiError(await call('GET', '/app/whoami'), 403, code);
  });

  test('anonymous → 401 UNAUTHORIZED in the uniform shape with method and path', async () => {
    const res = await call('GET', '/app/whoami');
    expectApiError(res, 401, 'UNAUTHORIZED');
    expect(res.body).toMatchObject({ method: 'GET', path: '/api/app/whoami' });
  });

  test('banned account keeps the signed-out answer (no third 403 code)', async () => {
    auth.as({ id: 'ctx-banned', role: 'member', banned: true });
    expectApiError(await call('GET', '/app/whoami'), 401, 'UNAUTHORIZED');
  });

  test.each([
    ['pending', 'ACCOUNT_PENDING'],
    ['rejected', 'ACCOUNT_REJECTED'],
  ] as const)('%s owner of an API key → 403 %s', async (status, code) => {
    const owner = await users.user({ status });
    const res = await shaped(
      await send('GET', '/r', (r) =>
        setApiKeyIdentity(r, {
          keyId: 'ctx-key',
          keyName: null,
          scopes: ['app:read'],
          user: { id: owner.id, email: owner.email, name: owner.name },
          role: 'member',
          startedAt: 0,
        }),
      ),
    );
    expect<number>(res.status).toBe(403);
    expect(res.body).toMatchObject({ code, status: 403 });
    expect(typeof res.body.requestId).toBe('string');
  });

  test('an Actor that slipped past resolveActor while held is still refused, uniformly', async () => {
    const resolve = spyOn(guardMod, 'resolveActor').mockResolvedValue({
      user: { id: 'ctx-leak', approvalStatus: 'pending', banned: false },
      role: 'member',
      viaApiKey: false,
      impersonatedBy: null,
    } as unknown as guardMod.Actor);
    try {
      const res = await shaped(await send('GET', '/r'));
      expect<number>(res.status).toBe(403);
      expect(res.body).toMatchObject({ code: 'ACCOUNT_PENDING', status: 403, path: '/api/ctx/r' });
      expect(typeof res.body.requestId).toBe('string');
    } finally {
      resolve.mockRestore();
    }
  });
});

describe('per-user write limiter', () => {
  const LIMIT = 2;
  const logged = spyOn(limiterMod, 'logRateLimit').mockImplementation(async () => {});
  beforeEach(() => {
    writeLimiter.configure({ limit: LIMIT });
    logged.mockClear();
  });
  afterAll(() => {
    writeLimiter.configure({ limit: WRITE_RATE_MAX });
    logged.mockRestore();
  });

  test('defaults come from pm/limits', () => {
    writeLimiter.configure({ limit: WRITE_RATE_MAX });
    expect(writeLimiter.config.limit).toBe(WRITE_RATE_MAX);
    expect(writeLimiter.config.windowMs).toBe(WRITE_RATE_WINDOW_SECONDS * 1000);
    expect(writeLimiter.config.excludePrefixes).toEqual([]);
  });

  test('writes past the limit → 429 RATE_LIMITED with retry-after, logged once', async () => {
    auth.as({ id: 'ctx-writer', role: 'member' });
    for (let i = 0; i < LIMIT; i++) expect((await send('POST', '/w')).status).toBe(200);
    const blocked = await shaped(await send('POST', '/w'));
    expect<number>(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ code: 'RATE_LIMITED', status: 429 });
    expect(typeof blocked.body.requestId).toBe('string');
    const seconds = blocked.body.retryAfterSeconds as number;
    expect(seconds).toBeGreaterThanOrEqual(1);
    expect(blocked.headers.get('retry-after')).toBe(String(seconds));
    await send('DELETE', '/w');
    expect(logged).toHaveBeenCalledTimes(1);
    expect(logged.mock.calls[0][0]).toMatchObject({ userId: 'ctx-writer', method: 'POST' });
  });

  test('reads are never counted, and each user has their own quota', async () => {
    auth.as({ id: 'ctx-reader', role: 'member' });
    for (let i = 0; i < LIMIT * 3; i++) expect((await send('GET', '/r')).status).toBe(200);
    for (let i = 0; i < LIMIT; i++) expect((await send('POST', '/w')).status).toBe(200);
    expect((await send('POST', '/w')).status).toBe(429);
    auth.as({ id: 'ctx-other', role: 'member' });
    expect((await send('POST', '/w')).status).toBe(200);
  });
});
