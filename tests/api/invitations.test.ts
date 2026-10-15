/**
 * /api/admin/invitations (S0A-10): create, list and revoke through the real guard, policy and audit.
 * The caller is driven by spies on the session and role resolver; invitations and users are real rows.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { and, eq, inArray, like } from 'drizzle-orm';
import Elysia from 'elysia';
import { claimInvitation } from '../../server/account/invitation.query';
import { decideNewUser } from '../../server/account/signup-gate';
import { adminApi } from '../../server/api/admin';
import { apiErrorPlugin } from '../../server/api-error';
import { apiKeyPlugin } from '../../server/api-keys/plugin';
import { API_KEY_PREFIX, auth } from '../../server/auth';
import { db } from '../../server/db';
import { auditLog, user, userInvitation } from '../../server/db/schema';
import { allowedEmailDomains } from '../../server/env';
import * as rolesMod from '../../server/roles';
import { testUser } from '../support/accounts';

// biome-ignore lint/suspicious/noExplicitAny: test-only loose JSON body, asserted field by field below
type Json = Record<string, any>;
type Caller = { id: string; role: string; impersonatedBy?: string } | null;
const ctx: { caller: Caller } = { caller: null };

const TAG = `inv${crypto.randomUUID().slice(0, 8)}`;
const mail = (k: string) => `${k}-${TAG}@kantor.id`; // test-only
const ADMIN = { id: `${TAG}-admin`, role: 'admin' };
const SUPER = { id: `${TAG}-super`, role: 'super-admin' };

const spies = [
  spyOn(auth.api, 'getSession').mockImplementation((async () =>
    ctx.caller
      ? {
          user: {
            id: ctx.caller.id,
            email: `${ctx.caller.id}@kantor.id`,
            name: 'Penguji',
            approvalStatus: 'approved',
          },
          session: { impersonatedBy: ctx.caller.impersonatedBy ?? null },
        }
      : null) as unknown as typeof auth.api.getSession),
  spyOn(rolesMod, 'resolveUserRole').mockImplementation(
    async () => (ctx.caller?.role ?? 'member') as 'member',
  ),
];

// The key plugin sits in front like in production, so the API-key refusal is the real one.
const app = new Elysia()
  .use(apiErrorPlugin())
  .use(apiKeyPlugin())
  .use(new Elysia({ prefix: '/api' }).use(adminApi));

async function call(method: string, path: string, body?: unknown, headers: HeadersInit = {}) {
  const res = await app.handle(
    new Request(`http://localhost/api${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  return {
    status: res.status,
    body: (await res.json().catch(() => null)) as Json,
  };
}
const create = (email: string, role?: string) =>
  call('POST', '/admin/invitations', { email, role });
const asCaller = (c: NonNullable<Caller>) => {
  ctx.caller = c;
};
const rowFor = async (email: string) =>
  (await db.select().from(userInvitation).where(eq(userInvitation.email, email.toLowerCase())))[0];

/** Audit writes are fire-and-forget, so poll briefly for the row instead of racing it. */
async function auditRows(action: string, targetId: string) {
  for (let i = 0; i < 50; i++) {
    const rows = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, action), eq(auditLog.targetId, targetId)));
    if (rows.length > 0) return rows;
    await Bun.sleep(20);
  }
  return [];
}

beforeAll(async () => {
  await db
    .insert(user)
    .values([
      testUser({ id: ADMIN.id, name: 'Admin Uji', role: 'admin' }),
      testUser({ id: SUPER.id, name: 'Super Uji', role: 'super-admin' }),
    ]);
});
beforeEach(() => {
  ctx.caller = null;
});
afterAll(async () => {
  for (const s of spies) s.mockRestore();
  const ids = (
    await db
      .select({ id: userInvitation.id })
      .from(userInvitation)
      .where(like(userInvitation.email, `%${TAG}%`))
  ).map((r) => r.id);
  if (ids.length) await db.delete(auditLog).where(inArray(auditLog.targetId, ids));
  await db.delete(userInvitation).where(like(userInvitation.email, `%${TAG}%`));
  await db.delete(user).where(like(user.id, `${TAG}-%`));
});

describe('POST /admin/invitations', () => {
  test('creates an invitation (201) with the normalized email and an audit row with a masked email', async () => {
    asCaller(ADMIN);
    const res = await create(`  ${mail('Budi').toUpperCase()} `, 'project_manager');
    expect(res.status).toBe(201);
    expect(res.body.invitation).toMatchObject({ email: mail('budi'), role: 'project_manager' });
    const row = await rowFor(mail('budi'));
    expect(row?.invitedBy).toBe(ADMIN.id);

    const [entry] = await auditRows('invitation.create', res.body.invitation.id);
    expect(entry?.summary).toContain('b***@kantor.id');
    expect(JSON.stringify(entry)).not.toContain(mail('budi'));
    expect(entry?.actorEmail).toBe('i***@kantor.id');
  });

  test('role defaults to member', async () => {
    asCaller(ADMIN);
    const res = await create(mail('default'));
    expect(res.status).toBe(201);
    expect(res.body.invitation.role).toBe('member');
  });

  test('the same email again is 409 INVITATION_EXISTS, whatever the letter case', async () => {
    asCaller(ADMIN);
    expect((await create(mail('dup'))).status).toBe(201);
    for (const variant of [mail('dup'), mail('dup').toUpperCase(), ` ${mail('Dup')} `]) {
      const res = await create(variant);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('INVITATION_EXISTS');
    }
  });

  test('Admin cannot invite admin or super-admin (403); a super-admin may invite admin', async () => {
    asCaller(ADMIN);
    for (const role of ['admin', 'super-admin']) {
      const res = await create(mail(`no-${role}`), role);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('TARGET_PROTECTED');
      expect(await rowFor(mail(`no-${role}`))).toBeUndefined();
    }
    asCaller(SUPER);
    expect((await create(mail('adm'), 'admin')).status).toBe(201);
    expect((await create(mail('sa'), 'super-admin')).status).toBe(403);
  });

  test('bad input: unknown role is 422 VALIDATION; malformed or missing email is INVALID_EMAIL', async () => {
    asCaller(ADMIN);
    const role = await create(mail('badrole'), 'raja');
    expect([role.status, role.body.code]).toEqual([422, 'VALIDATION']);
    for (const email of ['bukan-email', 'a b@kantor.id', 'budi@', '']) {
      const res = await create(email);
      expect([email, res.status, res.body.code]).toEqual([email, 422, 'INVALID_EMAIL']);
    }
    const missing = await call('POST', '/admin/invitations', {});
    expect([missing.status, missing.body.code]).toEqual([422, 'INVALID_EMAIL']);
  });

  test('a domain outside ALLOWED_EMAIL_DOMAINS is 422 DOMAIN_NOT_ALLOWED', async () => {
    const domains = allowedEmailDomains as Set<string>; // test-only: the env set is a plain Set
    domains.add('kantor.id');
    try {
      asCaller(ADMIN);
      const res = await create(`x-${TAG}@lain.example`);
      expect([res.status, res.body.code]).toEqual([422, 'DOMAIN_NOT_ALLOWED']);
      expect((await create(mail('inside'))).status).toBe(201);
    } finally {
      domains.delete('kantor.id');
    }
  });

  test('while impersonating the action is 403 IMPERSONATING and nothing is written', async () => {
    asCaller({ ...ADMIN, impersonatedBy: SUPER.id });
    const res = await create(mail('imp'));
    expect([res.status, res.body.code]).toEqual([403, 'IMPERSONATING']);
    expect(await rowFor(mail('imp'))).toBeUndefined();
  });

  test('members, project managers and anonymous callers never reach it', async () => {
    expect((await create(mail('anon'))).status).toBe(401);
    for (const role of ['member', 'project_manager']) {
      asCaller({ id: `${TAG}-m`, role });
      const res = await create(mail('nope'));
      expect([res.status, res.body.code]).toEqual([403, 'NOT_ADMIN']);
    }
  });
});

describe('DELETE /admin/invitations/:id', () => {
  test('revokes, audits invitation.revoke, and a later first login is held as pending', async () => {
    asCaller(ADMIN);
    const created = await create(mail('revoke'));
    const invId = created.body.invitation.id as string;

    const res = await call('DELETE', `/admin/invitations/${invId}`);
    expect(res.status).toBe(200);
    expect((await rowFor(mail('revoke')))?.revokedAt).not.toBeNull();

    const [entry] = await auditRows('invitation.revoke', invId);
    expect(entry?.targetType).toBe('invitation');
    expect(JSON.stringify(entry)).not.toContain(mail('revoke'));
    expect(entry?.summary).toContain('r***@kantor.id');

    // The "login": the sign-up decision with the real claim finds no live invitation.
    const decision = await decideNewUser(
      { email: mail('revoke'), emailVerified: true, viaEmailSignUp: false },
      { isProd: true, superAdminEmails: new Set(), allowedDomains: new Set(), claimInvitation },
    );
    expect(decision).toMatchObject({ allow: true, data: { approvalStatus: 'pending' } });
  });

  test('revoking twice or a used invitation is 409 WRONG_STATE; an unknown id is 404', async () => {
    asCaller(ADMIN);
    const first = (await create(mail('twice'))).body.invitation.id as string;
    expect((await call('DELETE', `/admin/invitations/${first}`)).status).toBe(200);
    const again = await call('DELETE', `/admin/invitations/${first}`);
    expect([again.status, again.body.code]).toEqual([409, 'WRONG_STATE']);

    const used = (await create(mail('used'))).body.invitation.id as string;
    await db
      .update(userInvitation)
      .set({ acceptedAt: new Date() })
      .where(eq(userInvitation.id, used));
    const usedRes = await call('DELETE', `/admin/invitations/${used}`);
    expect([usedRes.status, usedRes.body.code]).toEqual([409, 'WRONG_STATE']);

    const ghost = await call('DELETE', `/admin/invitations/ghost-${TAG}`);
    expect([ghost.status, ghost.body.code]).toEqual([404, 'NOT_FOUND']);
  });

  test('two simultaneous revokes: one 200 and one 409', async () => {
    asCaller(ADMIN);
    const invId = (await create(mail('race'))).body.invitation.id as string;
    const both = await Promise.all([
      call('DELETE', `/admin/invitations/${invId}`),
      call('DELETE', `/admin/invitations/${invId}`),
    ]);
    expect(both.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  test('an Admin cannot revoke an admin-level invitation; a super-admin can', async () => {
    asCaller(SUPER);
    const invId = (await create(mail('adm-rev'), 'admin')).body.invitation.id as string;
    asCaller(ADMIN);
    const denied = await call('DELETE', `/admin/invitations/${invId}`);
    expect([denied.status, denied.body.code]).toEqual([403, 'TARGET_PROTECTED']);
    asCaller(SUPER);
    expect((await call('DELETE', `/admin/invitations/${invId}`)).status).toBe(200);
  });

  test('is blocked while impersonating', async () => {
    asCaller(ADMIN);
    const invId = (await create(mail('imp-rev'))).body.invitation.id as string;
    asCaller({ ...ADMIN, impersonatedBy: SUPER.id });
    const res = await call('DELETE', `/admin/invitations/${invId}`);
    expect([res.status, res.body.code]).toEqual([403, 'IMPERSONATING']);
    expect((await rowFor(mail('imp-rev')))?.revokedAt).toBeNull();
  });
});

describe('GET /admin/invitations', () => {
  test('lists newest first with a derived status, a page cap and a total', async () => {
    asCaller(ADMIN);
    const base = (await db.select({ id: userInvitation.id }).from(userInvitation)).length;
    const past = new Date(Date.now() - 86_400_000);
    await db.insert(userInvitation).values([
      { email: mail('l-expired'), invitedBy: ADMIN.id, expiresAt: past },
      {
        email: mail('l-used'),
        invitedBy: ADMIN.id,
        expiresAt: new Date(Date.now() + 86_400_000),
        acceptedAt: new Date(),
      },
    ]);
    const res = await call('GET', '/admin/invitations?limit=1000');
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100); // clamped to the page cap
    expect(res.body.total).toBeGreaterThanOrEqual(base + 2);
    const status = (email: string) =>
      (res.body.invitations as Array<{ email: string; status: string }>).find(
        (i) => i.email === email,
      )?.status;
    expect(status(mail('l-expired'))).toBe('expired');
    expect(status(mail('l-used'))).toBe('used');
    expect(status(mail('revoke'))).toBe('revoked');
    expect(status(mail('default'))).toBe('active');
    const inviter = (res.body.invitations as Array<{ email: string; invitedByName: string }>).find(
      (i) => i.email === mail('l-used'),
    );
    expect(inviter?.invitedByName).toBe('Admin Uji');
  });

  test('filters by status and pages with limit/offset', async () => {
    asCaller(ADMIN);
    const onlyUsed = await call('GET', '/admin/invitations?status=used&limit=100');
    expect(onlyUsed.body.invitations.every((i: { status: string }) => i.status === 'used')).toBe(
      true,
    );
    const p1 = await call('GET', '/admin/invitations?limit=2&offset=0');
    const p2 = await call('GET', '/admin/invitations?limit=2&offset=2');
    expect(p1.body.invitations).toHaveLength(2);
    expect(p1.body.invitations[0].id).not.toBe(p2.body.invitations[0].id);
    const bad = await call('GET', '/admin/invitations?status=gaib');
    expect([bad.status, bad.body.code]).toEqual([422, 'VALIDATION']);
  });

  test('members get 403 NOT_ADMIN', async () => {
    asCaller({ id: `${TAG}-m`, role: 'member' });
    expect((await call('GET', '/admin/invitations')).status).toBe(403);
  });
});

describe('API keys', () => {
  const key = { 'x-api-key': `${API_KEY_PREFIX}anything-at-all` };

  test('every invitation route answers 403 to an API key, before the key is even checked', async () => {
    const calls: Array<[string, string, unknown?]> = [
      ['GET', '/admin/invitations'],
      ['POST', '/admin/invitations', { email: mail('key') }],
      ['DELETE', '/admin/invitations/any-id'],
    ];
    for (const [method, path, body] of calls) {
      const res = await call(method, path, body, key);
      expect([method, res.status]).toEqual([method, 403]);
    }
    expect(await rowFor(mail('key'))).toBeUndefined();
  });

  test('control: a mapped route does reach key verification (401), so the 403s above come from the scope map', async () => {
    const res = await call('GET', '/admin/users', undefined, key);
    expect(res.status).toBe(401);
  });
});
