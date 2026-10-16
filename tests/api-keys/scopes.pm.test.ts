import { describe, expect, test } from 'bun:test';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { toOpenAPISchema } from '@elysia/openapi';
import { type AnyElysia, Elysia } from 'elysia';
import { appApi } from '../../server/api/app';
import { specForKey } from '../../server/api/openapi';
import type { ApiKeyIdentity } from '../../server/api-keys/identity';
import { requiredScope, SCOPE_IDS } from '../../server/api-keys/scopes';
import { isPmKeyDenied, PM_DENY_OWNER, PM_KEY_DENY } from '../../server/api-keys/scopes.pm';

const API_DIR = path.join(import.meta.dir, '../../server/api');
const api = new Elysia({ prefix: '/api' }).use(appApi);
const appRoutes = api.routes.filter((r) => r.path.startsWith('/api/app/'));

/** Number of routes a plugin file defines itself (a stub defines none). */
async function ownRoutes(file: string): Promise<number> {
  const mod = (await import(path.join(API_DIR, file))) as Record<string, unknown>;
  return Object.values(mod)
    .filter((v): v is Elysia => v instanceof Elysia)
    .reduce((n, e) => n + e.routes.length, 0);
}

// Looked up before the tests are declared so a stub owner shows up as SKIPPED in the output.
const live = new Map<string, boolean>();
for (const file of new Set(Object.values(PM_DENY_OWNER)))
  live.set(file, (await ownRoutes(file)) > 0);

describe('every /api/app route is mapped', () => {
  test('the sweep sees the real routes', () => {
    expect(appRoutes.length).toBeGreaterThan(0);
  });

  test.each(appRoutes.map((r) => [r.method, r.path] as const))(
    '%s %s has a scope decision',
    (m, p) => {
      const scope = requiredScope(m, p);
      expect(scope).not.toBeUndefined();
      if (isPmKeyDenied(m, p)) return expect(scope).toBeNull();
      expect(scope).toBe(m === 'GET' || m === 'HEAD' ? 'app:read' : 'app:write');
    },
  );
});

describe('PM_KEY_DENY patterns', () => {
  test('each pattern has an owner plugin that exists', () => {
    const files = new Set(readdirSync(API_DIR));
    for (const d of PM_KEY_DENY) expect(files.has(PM_DENY_OWNER[d.id] ?? '')).toBe(true);
  });

  for (const d of PM_KEY_DENY) {
    const owner = PM_DENY_OWNER[d.id] ?? '';
    const skip = !live.get(owner);
    const title = skip
      ? `"${d.id}" matches a real route (SKIPPED: ${owner} is still a stub with no routes)`
      : `"${d.id}" matches a real route`;
    test.skipIf(skip)(title, () => {
      const hit = appRoutes.some(
        (r) => (d.method === '*' || d.method === r.method) && d.path.test(r.path),
      );
      expect(hit).toBe(true);
    });
  }
});

describe('OpenAPI for keys', () => {
  const key: ApiKeyIdentity = {
    keyId: 'k1',
    keyName: 'test',
    scopes: [...SCOPE_IDS],
    user: { id: 'u1', email: 'agent@example.test', name: 'Agent' },
    role: 'super-admin',
    startedAt: Date.now(),
  };
  const ops = (router: AnyElysia) =>
    Object.entries(specForKey(toOpenAPISchema(router), key).paths).flatMap(([p, item]) =>
      Object.keys(item).map((m) => `${m} ${p}`),
    );

  test('real avatar routes are absent from the key spec', () => {
    expect(ops(api).filter((o) => o.includes('/api/app/avatar'))).toEqual([]);
  });

  test('denied routes vanish while ordinary ones stay, even for a key holding every scope', () => {
    // test-only: stand-ins for routes the S1/S2 slices will add under the stub plugins.
    const router = new Elysia({ prefix: '/api/app' })
      .get('/projects', () => [])
      .delete('/projects/:id', () => ({}))
      .post('/projects/:id/members', () => ({}))
      .patch('/profile', () => ({}))
      .get('/profile', () => ({}))
      .post('/tasks', () => ({}))
      .post('/avatar', () => ({}));
    expect(ops(router).sort()).toEqual([
      'get /api/app/profile',
      'get /api/app/projects',
      'post /api/app/tasks',
    ]);
  });
});
