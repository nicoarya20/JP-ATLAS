import { describe, expect, test } from 'bun:test';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { toOpenAPISchema } from '@elysia/openapi';
import { type AnyElysia, Elysia } from 'elysia';
import { appApi } from '../../server/api/app';
import { specForKey } from '../../server/api/openapi';
import type { ApiKeyIdentity } from '../../server/api-keys/identity';
import { requiredScope, SCOPE_IDS } from '../../server/api-keys/scopes';
import {
  isPmKeyDenied,
  PM_DENY_OWNER,
  PM_DENY_PENDING,
  PM_KEY_DENY,
} from '../../server/api-keys/scopes.pm';

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

describe('project write routes (S1-03)', () => {
  test.each([
    ['POST', '/api/app/projects'],
    ['PATCH', '/api/app/projects/p1'],
    ['POST', '/api/app/projects/p1/status'],
  ])('%s %s stays open to keys with app:write', (m, p) => {
    expect(isPmKeyDenied(m, p)).toBe(false);
    expect(requiredScope(m, p)).toBe('app:write');
  });

  test.each([
    '/api/app/projects/p1/lead',
    '/api/app/projects/p1/lead/',
    '/api/app/projects/a/b/lead',
    '/api/app/PROJECTS/p1/LEAD',
  ])('PUT %s is session only (Lead handover is an escalation)', (p) => {
    expect(isPmKeyDenied('PUT', p)).toBe(true);
    expect(requiredScope('PUT', p)).toBeNull();
  });

  test('the Lead pattern does not swallow other project routes', () => {
    expect(isPmKeyDenied('PUT', '/api/app/projects/leadership')).toBe(false);
    expect(isPmKeyDenied('POST', '/api/app/projects/p1/lead')).toBe(false);
  });
});

describe('project Trash routes (S1-05)', () => {
  test.each([
    ['DELETE', '/api/app/projects/p1'],
    ['POST', '/api/app/trash/project/p1/restore'],
    ['POST', '/api/app/TRASH/project/p1/restore'],
    ['POST', '/api/app/trash/task/t1/restore'], // S6 kinds land on the same session-only pattern
  ])('%s %s is session only', (m, p) => {
    expect(isPmKeyDenied(m, p)).toBe(true);
    expect(requiredScope(m, p)).toBeNull();
  });

  test('the trash pattern leaves reads open to keys and does not swallow other routes', () => {
    expect(isPmKeyDenied('GET', '/api/app/trash')).toBe(false);
    expect(requiredScope('GET', '/api/app/trash')).toBe('app:read');
    expect(isPmKeyDenied('POST', '/api/app/trashy')).toBe(false);
  });
});

describe('Event Trash routes (S7 E-07)', () => {
  test.each([
    ['DELETE', '/api/app/events/e1'],
    ['DELETE', '/api/app/EVENTS/e1'],
    ['POST', '/api/app/events/e1/cancel'],
    ['POST', '/api/app/trash/event/e1/restore'],
    ['DELETE', '/api/app/trash/event/e1'],
  ])('%s %s is session only', (m, p) => {
    expect(isPmKeyDenied(m, p)).toBe(true);
    expect(requiredScope(m, p)).toBeNull();
  });

  test('the event reads and the Trash list stay open to keys', () => {
    for (const p of ['/api/app/events', '/api/app/events/e1', '/api/app/trash']) {
      expect(isPmKeyDenied('GET', p)).toBe(false);
      expect(requiredScope('GET', p)).toBe('app:read');
    }
  });

  test('both delete routes really exist, so the deny pattern is not guarding thin air', () => {
    expect(PM_DENY_OWNER['DELETE events/*']).toBe('app-events.write.ts');
    expect(appRoutes.some((r) => r.method === 'DELETE' && r.path === '/api/app/events/:id')).toBe(
      true,
    );
    expect(
      appRoutes.some((r) => r.method === 'POST' && r.path === '/api/app/trash/event/:id/restore'),
    ).toBe(true);
  });
});

describe('Team routes (S6 M03/M04)', () => {
  test.each(['/api/app/team', '/api/app/team/u1', '/api/app/team/picker'])(
    'GET %s is open to a key with app:read',
    (p) => {
      expect(isPmKeyDenied('GET', p)).toBe(false);
      expect(requiredScope('GET', p)).toBe('app:read');
    },
  );

  test('Team adds no write route for a key to reach', () => {
    const writes = appRoutes.filter(
      (r) => r.path.startsWith('/api/app/team') && r.method !== 'GET',
    );
    expect(writes).toEqual([]);
  });
});

describe('Trash delete routes (S6, P8 Q2)', () => {
  test.each([
    ['DELETE', '/api/app/trash/project/p1'],
    ['DELETE', '/api/app/trash/task/t1'],
    ['DELETE', '/api/app/TRASH/project/p1'],
    ['DELETE', '/api/app/tasks/t1'],
    ['DELETE', '/api/app/tasks/t1/'],
    ['DELETE', '/api/app/tasks/12'],
    ['DELETE', '/api/app/TASKS/t1'],
  ])('%s %s is denied to every API key, whatever its scopes', (m, p) => {
    expect(isPmKeyDenied(m, p)).toBe(true);
    expect(requiredScope(m, p)).toBeNull();
  });

  test('reads and the task writes keys already have stay open', () => {
    for (const p of ['/api/app/trash', '/api/app/tasks', '/api/app/tasks/t1']) {
      expect(isPmKeyDenied('GET', p)).toBe(false);
      expect(requiredScope('GET', p)).toBe('app:read');
    }
    expect(isPmKeyDenied('POST', '/api/app/tasks')).toBe(false);
    expect(requiredScope('POST', '/api/app/tasks')).toBe('app:write');
    expect(isPmKeyDenied('PATCH', '/api/app/tasks/t1')).toBe(false);
    expect(requiredScope('PATCH', '/api/app/tasks/t1')).toBe('app:write');
  });

  test('the delete patterns do not reach the collection or a lookalike path', () => {
    expect(isPmKeyDenied('DELETE', '/api/app/tasks')).toBe(false);
    expect(isPmKeyDenied('DELETE', '/api/app/trash')).toBe(false);
    expect(isPmKeyDenied('DELETE', '/api/app/trashy/x')).toBe(false);
    expect(isPmKeyDenied('DELETE', '/api/app/tasksy/x')).toBe(false);
  });
});

describe('notification switches (SET)', () => {
  test('a key may read its owner switches but never flip them', () => {
    expect(requiredScope('GET', '/api/app/profile/notifications')).toBe('app:read');
    expect(isPmKeyDenied('GET', '/api/app/profile/notifications')).toBe(false);
    expect(isPmKeyDenied('PUT', '/api/app/profile/notifications')).toBe(true);
    expect(requiredScope('PUT', '/api/app/profile/notifications')).toBeNull();
    expect(requiredScope('put', '/api/app/profile/notifications/')).toBeNull();
  });
});

describe('delete-account check (SET)', () => {
  test('is session only: a key never learns what blocks its owner from deleting the account', () => {
    expect(isPmKeyDenied('GET', '/api/app/profile/delete-check')).toBe(true);
    expect(requiredScope('GET', '/api/app/profile/delete-check')).toBeNull();
    expect(requiredScope('GET', '/api/app/profile/delete-check/')).toBeNull();
  });
});

describe('PM_KEY_DENY patterns', () => {
  test('each pattern has an owner plugin that exists', () => {
    const files = new Set(readdirSync(API_DIR));
    for (const d of PM_KEY_DENY) expect(files.has(PM_DENY_OWNER[d.id] ?? '')).toBe(true);
  });

  test('every pending id is a real deny id (no stale entry left behind)', () => {
    const ids = new Set(PM_KEY_DENY.map((d) => d.id));
    for (const id of PM_DENY_PENDING) expect(ids.has(id)).toBe(true);
  });

  for (const d of PM_KEY_DENY) {
    const owner = PM_DENY_OWNER[d.id] ?? '';
    const pending = PM_DENY_PENDING.includes(d.id);
    const skip = pending || !live.get(owner);
    const title = pending
      ? `"${d.id}" matches a real route (SKIPPED: route arrives later in the slice)`
      : skip
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
      .post('/trash/project/:id/restore', () => ({}))
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
