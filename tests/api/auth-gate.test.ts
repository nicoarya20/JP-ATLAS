/**
 * /api/auth/* gate (S0A-08): Better Auth's admin and email endpoints are closed at the HTTP edge.
 * The pure verdicts are swept with the R12 §3.5 payloads; the end-to-end cases prove that a real
 * Admin session cannot reach `admin/ban-user`, while the same request direct to Better Auth would.
 */
import { afterAll, afterEach, beforeAll, describe, expect, spyOn, test } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { api } from '../../server/api';
import { createAuthMount, evaluateAuthPath, normalizeAuthPath } from '../../server/api/auth-gate';
import { auth } from '../../server/auth';
import { db } from '../../server/db';
import { session, user } from '../../server/db/schema';

const DEV = { isProd: false };
const PROD = { isProd: true };
const BASE = 'http://localhost';
const SWEEP_METHODS = ['GET', 'POST'];

// test-only: R12 §3.5 sweep payloads (every spelling of the closed admin endpoint)
const CLOSED_ADMIN_PATHS = [
  '/api/auth/admin/ban-user',
  '/api/auth/Admin/ban-user',
  '/api/auth/ADMIN/BAN-USER',
  '//api//auth//admin//ban-user',
  '/api/auth//admin//ban-user',
  '/api/auth/admin/ban-user/',
  '/api/auth/admin/ban-user//',
  '/api/auth/%61dmin/ban-user',
  '/api/auth/%41dmin/ban-user',
  '/api/auth/admin%2Fban-user',
  '/api/auth/admin%2fban-user',
  '/api/auth/admin/%62an-user',
  '/api/auth/admin/list-users',
  '/api/auth/admin/list-user-sessions',
  '/api/auth/admin/set-role',
  '/api/auth/admin/remove-user',
  '/api/auth/admin/impersonate-user/extra',
  '/api/auth/admin/impersonate-users',
  '/api/auth/admin/',
  '/api/auth/admin',
  '/api/auth/x/../admin/ban-user',
  '/api/auth/x%2F..%2Fadmin%2Fban-user',
  '/api/auth/%2561dmin/ban-user',
];

describe('normalizeAuthPath', () => {
  test('canonicalises case, encoding, repeated and trailing slashes', () => {
    expect(normalizeAuthPath('/api/Auth//%41dmin%2Fban-User/')).toBe('/admin/ban-user');
    expect(normalizeAuthPath('/api/auth')).toBe('/');
    expect(normalizeAuthPath('/api/auth/')).toBe('/');
  });
  test('returns null for undecodable, double-encoded, dot-segment and foreign paths', () => {
    expect(normalizeAuthPath('/api/auth/%E0%A4%A')).toBeNull();
    expect(normalizeAuthPath('/api/auth/%2561dmin')).toBeNull();
    expect(normalizeAuthPath('/api/auth/a%2F..%2Fb')).toBeNull();
    expect(normalizeAuthPath('/api/authx/get-session')).toBeNull();
    expect(normalizeAuthPath('/api/posts')).toBeNull();
  });
});

describe('evaluateAuthPath', () => {
  test.each(CLOSED_ADMIN_PATHS.flatMap((p) => SWEEP_METHODS.map((m) => [m, p] as const)))(
    '%s %s → not-found (dev and prod)',
    (method, path) => {
      expect(evaluateAuthPath(path, method, DEV)).toBe('not-found');
      expect(evaluateAuthPath(path, method, PROD)).toBe('not-found');
    },
  );

  test('the two impersonation endpoints pass, in any spelling', () => {
    for (const p of [
      '/api/auth/admin/impersonate-user',
      '/api/auth/admin/stop-impersonating',
      '/api/auth/Admin/Impersonate-User/',
      '/api/auth/%61dmin/stop-impersonating',
    ])
      for (const m of SWEEP_METHODS) expect(evaluateAuthPath(p, m, PROD)).toBe('pass');
  });

  test('email sign-up and sign-in are open in dev and closed in production', () => {
    for (const p of [
      '/api/auth/sign-up/email',
      '/api/auth/Sign-Up/Email/',
      '/api/auth//sign-up//email',
      '/api/auth/sign-in/email',
      '/api/auth/%73ign-in/email',
    ]) {
      expect(evaluateAuthPath(p, 'POST', DEV)).toBe('pass');
      expect(evaluateAuthPath(p, 'POST', PROD)).toBe('not-found');
    }
  });

  test('anonymous sign-in stays closed until its plugin is removed (S0A-13)', () => {
    expect(evaluateAuthPath('/api/auth/sign-in/anonymous', 'POST', DEV)).toBe('not-found');
    expect(evaluateAuthPath('/api/auth/Sign-In/Anonymous', 'POST', DEV)).toBe('not-found');
  });

  test('self-service endpoints and Google sign-in pass; non-auth paths and bad escapes do not', () => {
    for (const p of [
      '/api/auth/get-session',
      '/api/auth/sign-out',
      '/api/auth/sign-in/social',
      '/api/auth/callback/google',
      '/api/auth/multi-session/list-device-sessions',
    ])
      expect(evaluateAuthPath(p, 'GET', PROD)).toBe('pass');
    expect(evaluateAuthPath('/api/auth/%E0%A4%A', 'GET', DEV)).toBe('not-found');
    expect(evaluateAuthPath('/api/tidak-ada', 'GET', DEV)).toBe('not-found');
  });

  test('delete-user needs an impersonation check for state-changing methods only', () => {
    expect(evaluateAuthPath('/api/auth/delete-user', 'POST', PROD)).toBe('check-impersonation');
    expect(evaluateAuthPath('/api/auth/Delete-User/', 'POST', DEV)).toBe('check-impersonation');
    expect(evaluateAuthPath('/api/auth/delete-user/callback', 'GET', DEV)).toBe('pass');
    expect(evaluateAuthPath('/api/auth/delete-user', 'OPTIONS', DEV)).toBe('pass');
  });
});

describe('createAuthMount', () => {
  const handler = spyOn(auth, 'handler').mockImplementation(
    async () => new Response('forwarded', { status: 200 }),
  );
  const getSession = spyOn(auth.api, 'getSession');
  afterEach(() => {
    handler.mockClear();
    getSession.mockReset();
  });
  afterAll(() => {
    handler.mockRestore();
    getSession.mockRestore();
  });
  const req = (path: string, method = 'POST') => new Request(`${BASE}${path}`, { method });

  test('production answers the uniform JSON 404 for email endpoints and never calls Better Auth', async () => {
    const mount = createAuthMount(true);
    for (const p of ['/api/auth/sign-up/email', '/api/auth/sign-in/email']) {
      const res = await mount(req(p));
      expect(res.status).toBe(404);
      expect(((await res.json()) as { code: string }).code).toBe('NOT_FOUND');
    }
    expect(handler).not.toHaveBeenCalled();
  });

  test('dev forwards email sign-up to Better Auth', async () => {
    const res = await createAuthMount(false)(req('/api/auth/sign-up/email'));
    expect(await res.text()).toBe('forwarded');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('forwards the two impersonation endpoints untouched', async () => {
    const mount = createAuthMount(true);
    for (const p of ['/api/auth/admin/impersonate-user', '/api/auth/admin/stop-impersonating'])
      expect((await mount(req(p))).status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  test('delete-user during an impersonated session → 403 IMPERSONATING, Better Auth not called', async () => {
    getSession.mockResolvedValue({ session: { impersonatedBy: 'admin-1' } } as never);
    const res = await createAuthMount(true)(req('/api/auth/delete-user'));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string; status: number; requestId: string };
    expect([body.code, body.status, typeof body.requestId]).toEqual([
      'IMPERSONATING',
      403,
      'string',
    ]);
    expect(handler).not.toHaveBeenCalled();
  });

  test('delete-user from a normal session or without one is forwarded', async () => {
    getSession.mockResolvedValueOnce({ session: { impersonatedBy: null } } as never);
    expect((await createAuthMount(true)(req('/api/auth/delete-user'))).status).toBe(200);
    getSession.mockResolvedValueOnce(null as never);
    expect((await createAuthMount(true)(req('/api/auth/delete-user'))).status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  test('delete-user fails closed with context when the session lookup throws', async () => {
    getSession.mockRejectedValue(new Error('db down'));
    await expect(createAuthMount(true)(req('/api/auth/delete-user'))).rejects.toThrow(
      /Failed to read session for \/delete-user: db down/,
    );
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('through the real API (api.handle)', () => {
  test('every sweep payload answers the uniform JSON 404', async () => {
    for (const path of CLOSED_ADMIN_PATHS)
      for (const method of SWEEP_METHODS) {
        const res = await api.handle(new Request(`${BASE}${path}`, { method }));
        expect([method, path, res.status]).toEqual([method, path, 404]);
        expect(((await res.json()) as { code: string }).code).toBe('NOT_FOUND');
      }
  });

  test('Better Auth still serves its self-service endpoints', async () => {
    const res = await api.handle(new Request(`${BASE}/api/auth/get-session`));
    expect(res.status).toBe(200);
  });
});

describe('a real Admin session cannot ban through Better Auth', () => {
  const TAG = `agate-${crypto.randomUUID().slice(0, 8)}`;
  const password = `pw-${crypto.randomUUID()}`; // test-only
  const adminEmail = `${TAG}-admin@example.test`;
  const targetEmail = `${TAG}-target@example.test`;
  let adminCookie = '';
  let targetId = '';
  let adminId = '';
  const ban = (cookie: string) => ({
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json', origin: BASE },
    body: JSON.stringify({ userId: targetId, banReason: 'gate test' }),
  });
  const isBanned = async () =>
    (await db.select({ b: user.banned }).from(user).where(eq(user.id, targetId)))[0]?.b === true;

  beforeAll(async () => {
    const a = await auth.api.signUpEmail({
      body: { email: adminEmail, password, name: 'Gate Admin' },
    });
    const t = await auth.api.signUpEmail({
      body: { email: targetEmail, password, name: 'Gate Target' },
    });
    adminId = a.user.id;
    targetId = t.user.id;
    await db
      .update(user)
      .set({ role: 'admin', approvalStatus: 'approved', emailVerified: true })
      .where(eq(user.id, adminId));
    await db.update(user).set({ approvalStatus: 'approved' }).where(eq(user.id, targetId));
    const signIn = await auth.api.signInEmail({
      body: { email: adminEmail, password },
      returnHeaders: true,
    });
    adminCookie = signIn.headers
      .getSetCookie()
      .map((c) => c.split(';', 1)[0])
      .join('; ');
  });

  afterAll(async () => {
    await db.delete(session).where(inArray(session.userId, [adminId, targetId]));
    await db.delete(user).where(inArray(user.id, [adminId, targetId]));
  });

  test('the gate answers 404 and the target stays unbanned', async () => {
    const res = await api.handle(new Request(`${BASE}/api/auth/admin/ban-user`, ban(adminCookie)));
    expect(res.status).toBe(404);
    expect(await isBanned()).toBe(false);
  });

  test('control: the same request straight to Better Auth would have banned the target', async () => {
    const res = await auth.handler(
      new Request(`${BASE}/api/auth/admin/ban-user`, ban(adminCookie)),
    );
    expect(res.status).toBe(200);
    expect(await isBanned()).toBe(true);
  });
});
