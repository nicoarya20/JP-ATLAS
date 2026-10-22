/**
 * Admin console API (server/api/admin*.ts): the account role matrix (P1 §2.5) and the
 * gate every route must carry. The caller is driven through spies on the session and
 * role resolver, so the real guard, policy and routers all run; targets are real rows.
 * Better Auth's own mutations (ban/unban/remove) are stubbed: we assert this layer.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import Elysia from 'elysia';
import { adminApi } from '../../server/api/admin';
import { apiErrorPlugin } from '../../server/api-error';
import * as auditMod from '../../server/audit';
import { auth } from '../../server/auth';
import { db } from '../../server/db';
import { session, user } from '../../server/db/schema';
import * as rolesMod from '../../server/roles';
import { testUser } from '../support/accounts';

type Caller = { id: string; role: string; impersonatedBy?: string; approval?: string } | null;
const ctx: { caller: Caller } = { caller: null };
const asNobody = () => {
  ctx.caller = null;
};
const asCaller = (c: NonNullable<Caller>) => {
  ctx.caller = c;
};

const noop = (async () => ({})) as unknown as () => Promise<unknown>;
const spies = {
  session: spyOn(auth.api, 'getSession').mockImplementation((async () =>
    ctx.caller
      ? {
          user: {
            id: ctx.caller.id,
            email: `${ctx.caller.id}@test.local`,
            approvalStatus: ctx.caller.approval ?? 'approved',
          },
          session: { impersonatedBy: ctx.caller.impersonatedBy ?? null },
        }
      : null) as unknown as typeof auth.api.getSession),
  role: spyOn(rolesMod, 'resolveUserRole').mockImplementation(
    async () => (ctx.caller?.role ?? 'member') as 'member',
  ),
  ban: spyOn(auth.api, 'banUser').mockImplementation(noop as typeof auth.api.banUser),
  unban: spyOn(auth.api, 'unbanUser').mockImplementation(noop as typeof auth.api.unbanUser),
  remove: spyOn(auth.api, 'removeUser').mockImplementation(noop as typeof auth.api.removeUser),
  audit: spyOn(auditMod, 'audit').mockImplementation(async () => {}),
};

// The real error plugin so every response is checked in its production shape.
const app = new Elysia().use(apiErrorPlugin()).use(adminApi);

async function call(method: string, path: string, body?: unknown) {
  const res = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  return {
    status: res.status,
    body: (await res.json().catch(() => null)) as Record<string, unknown>,
  };
}

const runId = crypto.randomUUID().slice(0, 8);
const id = (k: string) => `adm-${k}-${runId}`;
const SEEDED = {
  member: 'member',
  pm: 'project_manager',
  admin: 'admin',
  sa: 'super-admin',
  // Target row that doubles as the caller, for the "acting on yourself" rows.
  self: 'member',
} as const;
type Target = keyof typeof SEEDED;

beforeAll(async () => {
  await db
    .insert(user)
    .values(
      (Object.keys(SEEDED) as Target[]).map((k) =>
        testUser({ id: id(k), name: id(k), role: SEEDED[k] }),
      ),
    );
});
beforeEach(async () => {
  asNobody();
  for (const s of [spies.ban, spies.unban, spies.remove, spies.audit]) s.mockClear();
  for (const k of Object.keys(SEEDED) as Target[])
    await db
      .update(user)
      .set({ role: SEEDED[k] })
      .where(eq(user.id, id(k)));
});
afterAll(async () => {
  for (const s of Object.values(spies)) s.mockRestore();
  await db.delete(user).where(inArray(user.id, (Object.keys(SEEDED) as Target[]).map(id)));
});

type Row = {
  name: string;
  actor: 'admin' | 'sa';
  target: Target | 'ghost';
  body?: Record<string, unknown>;
  impersonating?: boolean;
  expect: number;
  code?: string;
};
const ACTOR_ROLE = { admin: 'admin', sa: 'super-admin' } as const;

/** Runs one matrix row against `method path(targetId)`; `self` makes the caller the target. */
async function run(method: string, suffix: string, r: Row) {
  const targetId = r.target === 'ghost' ? `ghost-${runId}` : id(r.target);
  asCaller({
    id: r.target === 'self' ? targetId : id(`actor-${r.actor}`),
    role: ACTOR_ROLE[r.actor],
    impersonatedBy: r.impersonating ? 'someone-else' : undefined,
  });
  const res = await call(method, `/admin/users/${targetId}${suffix}`, r.body);
  expect(res.status).toBe(r.expect);
  if (r.code) expect(res.body.code).toBe(r.code);
  return { res, targetId };
}

const ROLE_ROWS: Row[] = [
  {
    name: 'Admin: Member → PM',
    actor: 'admin',
    target: 'member',
    body: { role: 'project_manager' },
    expect: 200,
  },
  {
    name: 'Admin: PM → Member',
    actor: 'admin',
    target: 'pm',
    body: { role: 'member' },
    expect: 200,
  },
  {
    name: 'Admin cannot grant admin',
    actor: 'admin',
    target: 'member',
    body: { role: 'admin' },
    expect: 403,
    code: 'TARGET_PROTECTED',
  },
  {
    name: 'Admin → Admin is protected',
    actor: 'admin',
    target: 'admin',
    body: { role: 'member' },
    expect: 403,
    code: 'TARGET_PROTECTED',
  },
  {
    name: 'Admin → SA is protected',
    actor: 'admin',
    target: 'sa',
    body: { role: 'member' },
    expect: 403,
    code: 'TARGET_PROTECTED',
  },
  {
    name: 'SA → SA is protected',
    actor: 'sa',
    target: 'sa',
    body: { role: 'member' },
    expect: 403,
    code: 'TARGET_PROTECTED',
  },
  {
    name: 'SA: Admin → Member',
    actor: 'sa',
    target: 'admin',
    body: { role: 'member' },
    expect: 200,
  },
  {
    name: 'SA: Member → Admin',
    actor: 'sa',
    target: 'member',
    body: { role: 'admin' },
    expect: 200,
  },
  {
    name: 'nobody can grant super-admin',
    actor: 'sa',
    target: 'member',
    body: { role: 'super-admin' },
    expect: 403,
    code: 'TARGET_PROTECTED',
  },
  {
    name: 'own role is off limits',
    actor: 'admin',
    target: 'self',
    body: { role: 'member' },
    expect: 403,
    code: 'SELF_TARGET',
  },
  {
    name: 'impersonating',
    actor: 'sa',
    target: 'member',
    body: { role: 'project_manager' },
    impersonating: true,
    expect: 403,
    code: 'IMPERSONATING',
  },
  {
    name: 'unknown role value',
    actor: 'sa',
    target: 'member',
    body: { role: 'owner' },
    expect: 422,
    code: 'VALIDATION',
  },
  {
    name: 'unknown target',
    actor: 'sa',
    target: 'ghost',
    body: { role: 'member' },
    expect: 404,
    code: 'NOT_FOUND',
  },
];

describe('POST /admin/users/:id/role — actor × target matrix', () => {
  test.each(ROLE_ROWS)('$name → $expect', async (r) => {
    const { targetId } = await run('POST', '/role', r);
    const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, targetId));
    if (r.expect === 200) expect(row.role).toBe(r.body?.role as string);
    else if (r.target !== 'ghost') expect(row.role).toBe(SEEDED[r.target]);
    expect(spies.audit.mock.calls.length).toBe(r.expect === 200 ? 1 : 0);
  });

  test('Admin Member → PM writes the audit entry with {from, to}', async () => {
    await run('POST', '/role', ROLE_ROWS[0]);
    const entry = spies.audit.mock.calls[0][0];
    expect(entry.action).toBe(auditMod.AUDIT_ACTIONS.USER_ROLE_SET);
    expect(entry.meta).toEqual({ from: 'member', to: 'project_manager' });
    expect(entry.targetId).toBe(id('member'));
  });

  test('a legacy "user" role reads as member and can be promoted', async () => {
    await db
      .update(user)
      .set({ role: 'user' })
      .where(eq(user.id, id('member')));
    const { res } = await run('POST', '/role', ROLE_ROWS[0]);
    expect(res.body.ok).toBe(true);
    expect(spies.audit.mock.calls[0][0].meta).toEqual({ from: 'member', to: 'project_manager' });
  });
});

const BAN_ROWS: Row[] = [
  {
    name: 'Admin bans Member',
    actor: 'admin',
    target: 'member',
    body: { reason: 'spam' },
    expect: 200,
  },
  { name: 'SA bans Admin', actor: 'sa', target: 'admin', body: {}, expect: 200 },
  {
    name: 'Admin → Admin is protected',
    actor: 'admin',
    target: 'admin',
    body: {},
    expect: 403,
    code: 'TARGET_PROTECTED',
  },
  {
    name: 'Admin → SA is protected',
    actor: 'admin',
    target: 'sa',
    body: {},
    expect: 403,
    code: 'TARGET_PROTECTED',
  },
  {
    name: 'SA → SA is protected',
    actor: 'sa',
    target: 'sa',
    body: {},
    expect: 403,
    code: 'TARGET_PROTECTED',
  },
  {
    name: 'cannot ban yourself',
    actor: 'admin',
    target: 'self',
    body: {},
    expect: 403,
    code: 'SELF_TARGET',
  },
  {
    name: 'impersonating',
    actor: 'sa',
    target: 'member',
    body: {},
    impersonating: true,
    expect: 403,
    code: 'IMPERSONATING',
  },
  {
    name: 'unknown target',
    actor: 'sa',
    target: 'ghost',
    body: {},
    expect: 404,
    code: 'NOT_FOUND',
  },
];

describe('POST /admin/users/:id/ban|unban — actor × target matrix', () => {
  test.each(BAN_ROWS)('ban: $name → $expect', async (r) => {
    await run('POST', '/ban', r);
    expect(spies.ban).toHaveBeenCalledTimes(r.expect === 200 ? 1 : 0);
    expect(spies.audit.mock.calls.length).toBe(r.expect === 200 ? 1 : 0);
  });

  test.each(BAN_ROWS.map((r) => ({ ...r, body: {} })))('unban: $name → $expect', async (r) => {
    await run('POST', '/unban', r);
    expect(spies.unban).toHaveBeenCalledTimes(r.expect === 200 ? 1 : 0);
    if (r.expect === 200)
      expect(spies.audit.mock.calls[0][0].action).toBe(auditMod.AUDIT_ACTIONS.USER_UNBAN);
  });

  test('a ban ends every live session of the target', async () => {
    await db.insert(session).values({
      id: `adm-sess-${runId}`,
      token: `adm-tok-${runId}`,
      userId: id('member'),
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const { res } = await run('POST', '/ban', BAN_ROWS[0]);
    expect(res.body.revokedSessions).toBe(1);
    const left = await db
      .select({ id: session.id })
      .from(session)
      .where(eq(session.userId, id('member')));
    expect(left.length).toBe(0);
  });
});

const DELETE_ROWS: Row[] = [
  { name: 'SA deletes Member', actor: 'sa', target: 'member', expect: 200 },
  { name: 'SA deletes Admin', actor: 'sa', target: 'admin', expect: 200 },
  { name: 'SA cannot delete SA', actor: 'sa', target: 'sa', expect: 403, code: 'TARGET_PROTECTED' },
  { name: 'SA cannot delete self', actor: 'sa', target: 'self', expect: 403, code: 'SELF_TARGET' },
  {
    name: 'Admin cannot delete Member',
    actor: 'admin',
    target: 'member',
    expect: 403,
    code: 'NOT_APP_ROLE',
  },
  {
    name: 'Admin → Admin is protected',
    actor: 'admin',
    target: 'admin',
    expect: 403,
    code: 'TARGET_PROTECTED',
  },
  {
    name: 'impersonating',
    actor: 'sa',
    target: 'member',
    impersonating: true,
    expect: 403,
    code: 'IMPERSONATING',
  },
  { name: 'unknown target', actor: 'sa', target: 'ghost', expect: 404, code: 'NOT_FOUND' },
];

describe('DELETE /admin/users/:id — actor × target matrix', () => {
  test.each(DELETE_ROWS)('$name → $expect', async (r) => {
    await run('DELETE', '', r);
    expect(spies.remove).toHaveBeenCalledTimes(r.expect === 200 ? 1 : 0);
    if (r.expect === 200)
      expect(spies.audit.mock.calls[0][0].action).toBe(auditMod.AUDIT_ACTIONS.USER_DELETE);
  });
});
