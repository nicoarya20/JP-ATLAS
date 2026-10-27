/** /api/app/* is the product API: mounted on the main router and closed to anonymous callers. */
import { afterAll, describe, expect, spyOn, test } from 'bun:test';
import { api } from '../../server/api';
import { auth } from '../../server/auth';
import * as rolesMod from '../../server/roles';

type Actor = { id: string; name: string; email: string; approvalStatus?: string; banned?: boolean };
const ctx: { actor: Actor | null } = { actor: null };
const spies = [
  spyOn(auth.api, 'getSession').mockImplementation((async () =>
    ctx.actor
      ? { user: { approvalStatus: 'approved', ...ctx.actor } }
      : null) as unknown as typeof auth.api.getSession),
  spyOn(rolesMod, 'resolveUserRole').mockImplementation(async () => 'member'),
];
afterAll(() => {
  for (const s of spies) s.mockRestore();
});

async function whoami() {
  const res = await api.handle(new Request('http://localhost/api/app/whoami'));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe('/api/app', () => {
  test('no session → 401 JSON with an error code', async () => {
    ctx.actor = null;
    const { status, body } = await whoami();
    expect(status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
    expect(typeof body.error).toBe('string');
    expect(typeof body.requestId).toBe('string');
  });

  test('signed-in user → 200 with own identity', async () => {
    ctx.actor = { id: 'app-u1', name: 'App User', email: 'app-u1@test.local' };
    const { status, body } = await whoami();
    expect(status).toBe(200);
    // `caps` is the app-wide capability map every client reads instead of branching on the role
    // (GAP A-17); the per-role values and the parity with the web layout are in app-whoami-caps.test.ts.
    expect(body).toEqual({
      userId: 'app-u1',
      name: 'App User',
      role: 'member',
      caps: { createProject: false, createEvent: true, dashboard: false, dev: false },
    });
  });

  test.each([
    ['pending', 'ACCOUNT_PENDING'],
    ['rejected', 'ACCOUNT_REJECTED'],
  ])('%s account → 403 %s with the uniform error shape', async (approvalStatus, code) => {
    ctx.actor = {
      id: `app-${approvalStatus}`,
      name: 'Held',
      email: 'held@test.local',
      approvalStatus,
    };
    const { status, body } = await whoami();
    expect(status).toBe(403);
    expect(body.code).toBe(code);
    expect(body.status).toBe(403);
    expect(typeof body.error).toBe('string');
    expect(typeof body.requestId).toBe('string');
  });

  test('banned account keeps the signed-out answer (401), no third 403 code', async () => {
    ctx.actor = { id: 'app-banned', name: 'Banned', email: 'banned@test.local', banned: true };
    const { status, body } = await whoami();
    expect(status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
