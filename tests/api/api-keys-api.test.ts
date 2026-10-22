import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import Elysia from 'elysia';
import { apiKeysApi } from '../../server/api/api-keys';
import { createKey } from '../../server/api-keys/service';
import { db } from '../../server/db';
import { auditLog, user } from '../../server/db/schema';
import { testUser } from '../support/accounts';
import { installAuthSpies } from '../support/auth';

const app = new Elysia().use(apiKeysApi);

// The real requireRole runs; only the session and role lookups are spied (replacing the guard module leaks across files).
const SUPER_ADMIN = { id: 'u-test', email: 'u-test@test.local', role: 'super-admin' }; // test-only
const authSpies = installAuthSpies();
const TAG = `kapi-${crypto.randomUUID().slice(0, 8)}`;
const adminId = `${TAG}-admin`;
const json = (method: string, body?: unknown) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});
async function call(path: string, init?: RequestInit) {
  const res = await app.handle(new Request(`http://localhost${path}`, init));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}
let keyId = '';

beforeAll(() => authSpies.as(SUPER_ADMIN));
// Per test: the lifecycle test rotates, revokes and deletes the key, so it must not rely on another test's key.
beforeEach(async () => {
  await db.insert(user).values(
    testUser({
      id: adminId,
      name: 'Key Admin',
      email: `${adminId}@test.local`,
      emailVerified: true,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
  keyId = (
    await createKey({
      name: 'seed',
      ownerId: adminId,
      scopes: ['users:read'],
      expiresDays: 30,
      rateLimitMax: null,
      rateLimitWindowMs: null,
      allowedIps: null,
      note: null,
    })
  ).row.id;
});
afterEach(async () => {
  await db
    .delete(auditLog)
    .where(eq(auditLog.targetType, 'apikey'))
    .catch(() => {});
  await db
    .delete(user)
    .where(eq(user.id, adminId))
    .catch(() => {});
});

describe('API key management API', () => {
  test('scope catalog', async () => {
    const { body } = await call('/api-keys/scopes');
    expect((body.scopes as unknown[]).length).toBeGreaterThan(5);
  });
  test('create enforces role ceiling and expiry rules; returns the key once', async () => {
    const tooHigh = await call(
      '/api-keys',
      json('POST', {
        name: 'terlalu tinggi',
        ownerId: adminId,
        scopes: ['settings:write'],
        expiresDays: 30,
      }),
    );
    expect(tooHigh.status).toBe(400);
    const noExpiry = await call(
      '/api-keys',
      json('POST', {
        name: 'tanpa expiry',
        ownerId: adminId,
        scopes: ['users:read'],
        expiresDays: null,
      }),
    );
    expect(noExpiry.status).toBe(400);
    const ok = await call(
      '/api-keys',
      json('POST', {
        name: 'Integrasi CRM',
        ownerId: adminId,
        scopes: ['users:read', 'posts:write'],
        expiresDays: 90,
        rateLimitMax: 100,
        rateLimitWindowMs: 60_000,
        allowedIps: ['10.0.0.'],
        note: 'untuk sync',
      }),
    );
    expect(ok.status).toBe(200);
    expect((ok.body.key as string).startsWith('sp_live_')).toBe(true);
    const row = ok.body.row as {
      id: string;
      scopes: string[];
      rateLimitMax: number;
      allowedIps: string;
    };
    expect(row.scopes).toEqual(['users:read', 'posts:write']);
    expect(row.rateLimitMax).toBe(100);
    expect(row.allowedIps).toBe('10.0.0.');
    const got = await call(`/api-keys/${row.id}`);
    expect(got.status).toBe(200);
    expect(got.body.key).toBeUndefined();
  });
  test('list, update, usage, rotate, revoke, delete', async () => {
    expect((await call('/api-keys', {})).status).toBe(200);
    expect((await call(`/api-keys?ownerId=${adminId}`)).body.total).toBe(1);
    const upd = await call(
      `/api-keys/${keyId}`,
      json('PUT', { name: 'Integrasi CRM v2', scopes: ['users:read'], note: null }),
    );
    expect(upd.status).toBe(200);
    expect(upd.body.name).toBe('Integrasi CRM v2');
    expect(upd.body.scopes).toEqual(['users:read']);
    const usage = await call(`/api-keys/${keyId}/usage`);
    expect(usage.status).toBe(200);
    expect((usage.body.summary as { total: number }).total).toBe(0);
    const rot = await call(`/api-keys/${keyId}/rotate`, json('POST'));
    expect(rot.status).toBe(200);
    expect((rot.body.key as string).startsWith('sp_live_')).toBe(true);
    const newId = (rot.body.row as { id: string }).id;
    const rev = await call(`/api-keys/${keyId}/revoke`, json('POST'));
    expect(rev.body.status).toBe('revoked');
    expect((await call(`/api-keys/${newId}`, { method: 'DELETE' })).status).toBe(200);
    expect((await call(`/api-keys/${keyId}`, { method: 'DELETE' })).status).toBe(200);
    expect((await call(`/api-keys/${keyId}`)).status).toBe(404);
    const stats = await call('/api-keys/stats');
    expect(typeof stats.body.active).toBe('number');
  });
});
