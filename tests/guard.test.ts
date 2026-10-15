/**
 * Tests for the per-role layout guards (server/guard.ts). requireRole /
 * requireAnyRole must: bounce anonymous requests to /login, bounce a logged-in
 * user in the wrong area to their own home (homeFor), and return {user, role}
 * when the role is allowed. Session + resolved role are mocked so each case is
 * deterministic; redirectToHome is already covered by auth-flow.test.ts.
 */
import { afterAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { inArray } from 'drizzle-orm';

type SessionUser = {
  id: string;
  email: string;
  banned?: boolean;
  banExpires?: Date | null;
  createdAt?: Date;
  approvalStatus?: string;
} | null;
const ctx: { user: SessionUser; role: string; impersonatedBy: string | null } = {
  user: null,
  role: 'member',
  impersonatedBy: null,
};

// spyOn (not a module replacement) so every override is reverted in afterAll. bun's
// module replacement is process-wide with no restore path, so replacing
// `./auth` would leave auth-flow.test.ts mounting an undefined auth.handler,
// and replacing `./roles` would clobber the real resolveUserRole that
// roles.test.ts exercises. Spies are scoped to this file.
import { auth } from '../server/auth';
import * as rolesMod from '../server/roles';

// Accounts are approved unless a test says otherwise (a real session always carries the field).
const sessionSpy = spyOn(auth.api, 'getSession').mockImplementation((async () =>
  ctx.user
    ? {
        user: { approvalStatus: 'approved', ...ctx.user },
        session: { impersonatedBy: ctx.impersonatedBy },
      }
    : null) as unknown as typeof auth.api.getSession);
const roleSpy = spyOn(rolesMod, 'resolveUserRole').mockImplementation(
  async () => ctx.role as 'member',
);

import { setApiKeyIdentity } from '../server/api-keys/identity';
import { db } from '../server/db';
import { user as userTable } from '../server/db/schema';
import {
  assertAccountApproved,
  getBannedUser,
  getHeldAccount,
  redirectToHome,
  requireAnyRole,
  requireRole,
  requireUser,
  resolveActor,
} from '../server/guard';
import { ROLES } from '../server/permissions';
import * as settingsCore from '../server/settings.core';
import { testUser } from './support/accounts';

afterAll(() => {
  sessionSpy.mockRestore();
  roleSpy.mockRestore();
});

const request = (headers?: Record<string, string>) =>
  new Request('http://localhost/whatever', { headers });

/** Invoke `fn` and return the redirect Response it throws, or null if it returned. */
async function catchRedirect(fn: () => Promise<unknown>): Promise<Response | null> {
  try {
    await fn();
    return null;
  } catch (thrown) {
    if (thrown instanceof Response) return thrown;
    throw thrown;
  }
}

beforeEach(() => {
  ctx.user = null;
  ctx.role = 'member';
  ctx.impersonatedBy = null;
});

describe('requireRole', () => {
  test('anonymous → redirect to /login', async () => {
    ctx.user = null;
    const res = await catchRedirect(() => requireRole(request(), ROLES.ADMIN));
    expect(res?.status).toBe(302);
    expect(res?.headers.get('Location')).toBe('/login');
  });

  test('stale session cookie without a session → /login with a notice', async () => {
    ctx.user = null;
    const res = await catchRedirect(() =>
      requireRole(request({ cookie: 'better-auth.session_token=abc; other=1' }), ROLES.MEMBER),
    );
    expect(res?.headers.get('Location')).toBe('/login?notice=session');
  });

  test('banned user with a live session → /banned; expired ban passes', async () => {
    ctx.user = { id: 'b1', email: 'b1@test.local', banned: true, banExpires: null };
    ctx.role = ROLES.MEMBER;
    const res = await catchRedirect(() => requireRole(request(), ROLES.MEMBER));
    expect(res?.headers.get('Location')).toBe('/banned');
    ctx.user = {
      id: 'b2',
      email: 'b2@test.local',
      banned: true,
      banExpires: new Date(Date.now() - 1),
    };
    const ok = await catchRedirect(() => requireRole(request(), ROLES.MEMBER));
    expect(ok).toBeNull();
  });

  test('wrong role → redirect to the caller’s own home', async () => {
    ctx.user = { id: 'u1', email: 'u1@test.local' };
    ctx.role = ROLES.MEMBER; // a user hitting an admin-only area
    const res = await catchRedirect(() => requireRole(request(), ROLES.ADMIN));
    expect(res?.status).toBe(302);
    expect(res?.headers.get('Location')).toBe('/app');
  });

  test('matching role → returns user and role', async () => {
    ctx.user = { id: 'u2', email: 'u2@test.local' };
    ctx.role = ROLES.ADMIN;
    const out = (await requireRole(request(), ROLES.ADMIN)) as {
      user: { id: string };
      role: string;
    };
    expect(out.user.id).toBe('u2');
    expect(out.role).toBe(ROLES.ADMIN);
  });
});

describe('requireAnyRole', () => {
  test('super-admin is allowed into an area that lists admin + super-admin', async () => {
    ctx.user = { id: 'u3', email: 'u3@test.local' };
    ctx.role = ROLES.SUPER_ADMIN;
    const out = (await requireAnyRole(request(), [ROLES.ADMIN, ROLES.SUPER_ADMIN])) as {
      role: string;
    };
    expect(out.role).toBe(ROLES.SUPER_ADMIN);
  });

  test('role outside the allowed set → redirect home', async () => {
    ctx.user = { id: 'u4', email: 'u4@test.local' };
    ctx.role = ROLES.ADMIN;
    const res = await catchRedirect(() => requireAnyRole(request(), [ROLES.SUPER_ADMIN]));
    expect(res?.status).toBe(302);
    expect(res?.headers.get('Location')).toBe('/dashboard');
  });
});

describe('resolveActor — session lookup', () => {
  const longAgo = new Date(Date.now() - 8 * 86_400_000);

  test('an old session resolves without any settings lookup and carries no demo flag', async () => {
    const readSpy = spyOn(settingsCore, 'readSettingsRow');
    try {
      ctx.user = { id: 'u6', email: 'u6@test.local', createdAt: longAgo };
      const actor = await resolveActor(request());
      expect(actor?.user.id).toBe('u6');
      expect(actor).not.toHaveProperty('isDemo');
      expect(readSpy).not.toHaveBeenCalled();
    } finally {
      readSpy.mockRestore();
    }
  });
});

describe('requireUser', () => {
  test('anonymous → /login; every role passes', async () => {
    const res = await catchRedirect(() => requireUser(request()));
    expect(res?.headers.get('Location')).toBe('/login');
    ctx.user = { id: 'u5', email: 'u5@test.local' };
    for (const role of Object.values(ROLES)) {
      ctx.role = role;
      const out = (await requireUser(request())) as { role: string };
      expect(out.role).toBe(role);
    }
  });
});

describe('held accounts', () => {
  const heldCases = [
    ['pending', '/waiting'],
    ['rejected', '/waiting'],
  ] as const;

  test.each(heldCases)(
    '%s account → %s on any guard, kind recorded for the request',
    async (status, target) => {
      ctx.user = { id: `h-${status}`, email: `h-${status}@test.local`, approvalStatus: status };
      const req = request();
      const res = await catchRedirect(() => requireUser(req));
      expect(res?.headers.get('Location')).toBe(target);
      expect(getHeldAccount(req)?.kind).toBe(status);
      expect(await resolveActor(request())).toBeNull();
    },
  );

  test('approved account passes and has no held record', async () => {
    ctx.user = { id: 'h-ok', email: 'h-ok@test.local', approvalStatus: 'approved' };
    const req = request();
    expect((await requireUser(req)).user.id).toBe('h-ok');
    expect(getHeldAccount(req)).toBeNull();
  });

  test('active ban → /banned and getBannedUser keeps working; pending is not reported as banned', async () => {
    ctx.user = { id: 'h-b', email: 'h-b@test.local', banned: true, banExpires: null };
    const req = request();
    const res = await catchRedirect(() => requireUser(req));
    expect(res?.headers.get('Location')).toBe('/banned');
    expect(getBannedUser(req)?.id).toBe('h-b');
    ctx.user = { id: 'h-p', email: 'h-p@test.local', approvalStatus: 'pending' };
    const pending = request();
    await catchRedirect(() => requireUser(pending));
    expect(getBannedUser(pending)).toBeNull();
  });

  test('an expired ban lifts for an approved account but not for a pending one', async () => {
    const expired = new Date(Date.now() - 1);
    ctx.user = { id: 'h-e1', email: 'h-e1@test.local', banned: true, banExpires: expired };
    expect(await catchRedirect(() => requireUser(request()))).toBeNull();
    ctx.user = {
      id: 'h-e2',
      email: 'h-e2@test.local',
      banned: true,
      banExpires: expired,
      approvalStatus: 'pending',
    };
    const res = await catchRedirect(() => requireUser(request()));
    expect(res?.headers.get('Location')).toBe('/waiting');
  });

  test('a session payload without approvalStatus fails closed', async () => {
    sessionSpy.mockImplementationOnce((async () => ({
      user: { id: 'h-n', email: 'h-n@test.local' },
      session: {},
    })) as unknown as typeof auth.api.getSession);
    const res = await catchRedirect(() => requireUser(request()));
    expect(res?.headers.get('Location')).toBe('/waiting');
  });

  test('verified super-admin (role resolved from env) passes', async () => {
    ctx.user = { id: 'h-sa', email: 'h-sa@test.local', approvalStatus: 'approved' };
    ctx.role = ROLES.SUPER_ADMIN;
    const out = await requireRole(request(), ROLES.SUPER_ADMIN);
    expect(out.role).toBe(ROLES.SUPER_ADMIN);
  });

  test.each([ROLES.MEMBER, ROLES.PROJECT_MANAGER])(
    '%s opening /dashboard is sent to /app',
    async (role) => {
      ctx.user = { id: `h-${role}`, email: `h-${role}@test.local` };
      ctx.role = role;
      const res = await catchRedirect(() => requireRole(request(), ROLES.ADMIN));
      expect(res?.headers.get('Location')).toBe('/app');
    },
  );

  test('redirectToHome: pending → /waiting, approved → role home', async () => {
    ctx.user = { id: 'h-r1', email: 'h-r1@test.local', approvalStatus: 'pending' };
    expect((await catchRedirect(() => redirectToHome(request())))?.headers.get('Location')).toBe(
      '/waiting',
    );
    ctx.user = { id: 'h-r2', email: 'h-r2@test.local' };
    ctx.role = ROLES.ADMIN;
    expect((await catchRedirect(() => redirectToHome(request())))?.headers.get('Location')).toBe(
      '/dashboard',
    );
  });
});

describe('Actor.impersonatedBy', () => {
  test('is the admin id while impersonating and null otherwise', async () => {
    ctx.user = { id: 'i-target', email: 'i-target@test.local' };
    ctx.impersonatedBy = 'i-admin';
    expect((await resolveActor(request()))?.impersonatedBy).toBe('i-admin');
    ctx.impersonatedBy = null;
    expect((await resolveActor(request()))?.impersonatedBy).toBeNull();
  });
});

describe('assertAccountApproved', () => {
  const thrownBy = async (fn: () => void): Promise<Response | null> => {
    try {
      fn();
      return null;
    } catch (e) {
      if (e instanceof Response) return e;
      throw e;
    }
  };

  test('approved account returns quietly', async () => {
    expect(
      await thrownBy(() => assertAccountApproved({ user: { approvalStatus: 'approved' } })),
    ).toBeNull();
  });

  test.each([
    ['pending', 'ACCOUNT_PENDING'],
    ['rejected', 'ACCOUNT_REJECTED'],
  ])('%s throws 403 %s', async (approvalStatus, code) => {
    const res = await thrownBy(() => assertAccountApproved({ user: { approvalStatus } }));
    expect(res?.status).toBe(403);
    expect(((await (res as Response).json()) as { code: string }).code).toBe(code);
  });

  test('banned throws 401 (no third 403 code)', async () => {
    const res = await thrownBy(() =>
      assertAccountApproved({ user: { approvalStatus: 'approved', banned: true } }),
    );
    expect(res?.status).toBe(401);
  });
});

describe('resolveActor via API key', () => {
  const ids: string[] = [];
  afterAll(async () => {
    if (ids.length) await db.delete(userTable).where(inArray(userTable.id, ids));
  });

  /** Seed an owner row and a request already carrying the identity the api-key plugin would set. */
  async function keyRequest(overrides: Parameters<typeof testUser>[0] = {}) {
    const row = testUser(overrides);
    await db.insert(userTable).values(row);
    ids.push(row.id);
    const req = request();
    setApiKeyIdentity(req, {
      keyId: 'guard-test-key',
      keyName: null,
      scopes: [],
      user: { id: row.id, email: row.email, name: row.name },
      role: ROLES.MEMBER,
      startedAt: 0,
    });
    return req;
  }

  test('approved owner → actor with viaApiKey and no impersonator', async () => {
    const actor = await resolveActor(await keyRequest());
    expect(actor?.viaApiKey).toBe(true);
    expect(actor?.impersonatedBy).toBeNull();
  });

  test.each(['pending', 'rejected'] as const)(
    '%s owner → null with the kind recorded',
    async (approvalStatus) => {
      const req = await keyRequest({ approvalStatus });
      expect(await resolveActor(req)).toBeNull();
      expect(getHeldAccount(req)?.kind).toBe(approvalStatus);
    },
  );

  test('active ban → null; expired ban on an approved owner → actor', async () => {
    const banned = await keyRequest({ banned: true, banExpires: new Date(Date.now() + 3_600_000) });
    expect(await resolveActor(banned)).toBeNull();
    expect(getHeldAccount(banned)?.kind).toBe('banned');
    const lifted = await keyRequest({ banned: true, banExpires: new Date(Date.now() - 1000) });
    expect((await resolveActor(lifted))?.viaApiKey).toBe(true);
  });
});
