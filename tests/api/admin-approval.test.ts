/** Approve and reject over HTTP (S0A-10): real guard, policy, service and audit behind /api/admin/users/:id/*. */
import { afterAll, beforeAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { and, eq, inArray, like } from 'drizzle-orm';
import Elysia from 'elysia';
import { actionMeta } from '../../app/lib/audit-api';
import { adminApi } from '../../server/api/admin';
import { apiErrorPlugin } from '../../server/api-error';
import { apiKeyPlugin } from '../../server/api-keys/plugin';
import { API_KEY_PREFIX, auth } from '../../server/auth';
import { db } from '../../server/db';
import { auditLog, user } from '../../server/db/schema';
import * as rolesMod from '../../server/roles';
import { testUser } from '../support/accounts';

// ---- Approval endpoints (S0A-10): the real guard, policy, service and audit behind HTTP. ----

type Caller = { id: string; role: string; impersonatedBy?: string } | null;
// biome-ignore lint/suspicious/noExplicitAny: test-only loose JSON body, asserted field by field below
type Json = Record<string, any>;

describe('POST /admin/users/:id/approve|reject', () => {
  const RUN = crypto.randomUUID().slice(0, 8);
  const uid = (k: string) => `apr-${k}-${RUN}`;
  const caller: { current: Caller } = { current: null };
  const as = (k: string, role: string, impersonatedBy?: string) => {
    caller.current = { id: uid(k), role, impersonatedBy };
  };
  const app = new Elysia()
    .use(apiErrorPlugin())
    .use(apiKeyPlugin())
    .use(new Elysia({ prefix: '/api' }).use(adminApi));
  let spies: Array<{ mockRestore: () => void }> = [];

  async function post(id: string, verb: 'approve' | 'reject', body: unknown = {}, headers = {}) {
    const res = await app.handle(
      new Request(`http://localhost/api/admin/users/${id}/${verb}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
    );
    return { status: res.status, body: (await res.json().catch(() => null)) as Json };
  }
  const stored = async (k: string) =>
    (
      await db
        .select()
        .from(user)
        .where(eq(user.id, uid(k)))
    )[0] as typeof user.$inferSelect;
  /** Resets one account to a known approval state before each scenario. */
  const reset = async (k: string, status: 'pending' | 'approved' | 'rejected', role = 'member') => {
    await db.delete(user).where(eq(user.id, uid(k)));
    await db.insert(user).values(
      testUser({
        id: uid(k),
        name: `Calon ${k}`,
        email: `${k}-${RUN}@kantor.id`,
        role,
        approvalStatus: status,
      }),
    );
  };
  async function auditFor(action: string, targetId: string) {
    for (let i = 0; i < 50; i++) {
      const rows = await db
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.action, action), eq(auditLog.targetId, targetId)));
      if (rows.length) return rows;
      await Bun.sleep(20);
    }
    return [];
  }

  beforeAll(async () => {
    spies = [
      spyOn(auth.api, 'getSession').mockImplementation((async () =>
        caller.current
          ? {
              user: {
                id: caller.current.id,
                email: `${caller.current.id}@kantor.id`,
                approvalStatus: 'approved',
              },
              session: { impersonatedBy: caller.current.impersonatedBy ?? null },
            }
          : null) as unknown as typeof auth.api.getSession),
      spyOn(rolesMod, 'resolveUserRole').mockImplementation(
        async () => (caller.current?.role ?? 'member') as 'member',
      ),
    ];
    await db
      .insert(user)
      .values([
        testUser({ id: uid('admin'), role: 'admin', name: 'Admin Uji' }),
        testUser({ id: uid('super'), role: 'super-admin', name: 'Super Uji' }),
      ]);
  });
  beforeEach(() => {
    caller.current = null;
  });
  afterAll(async () => {
    for (const s of spies) s.mockRestore();
    const ids = (
      await db
        .select({ id: user.id })
        .from(user)
        .where(like(user.id, `apr-%-${RUN}`))
    ).map((r) => r.id);
    await db.delete(auditLog).where(inArray(auditLog.targetId, ids));
    await db.delete(user).where(inArray(user.id, ids));
  });

  test('every audit action of this task has a label in ACTION_META', () => {
    for (const a of [
      'user.approve',
      'user.reject',
      'invitation.create',
      'invitation.revoke',
      'invitation.use',
    ]) {
      expect(actionMeta(a).label).not.toBe(a);
    }
  });

  test('Admin approves a pending member (200) and the audit row masks the email', async () => {
    await reset('m1', 'pending');
    as('admin', 'admin');
    const res = await post(uid('m1'), 'approve');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: uid('m1'),
      approvalStatus: 'approved',
      role: 'member',
    });
    const row = await stored('m1');
    expect([row.approvalStatus, row.approvalDecidedBy]).toEqual(['approved', uid('admin')]);
    const [entry] = await auditFor('user.approve', uid('m1'));
    expect(entry?.summary).toContain('Calon m1');
    expect(entry?.summary).toContain('m***@kantor.id');
    expect(JSON.stringify(entry)).not.toContain(`m1-${RUN}@kantor.id`);
  });

  test('approve can choose the role; Admin may pick PM but not admin, a super-admin may', async () => {
    await reset('m2', 'pending');
    as('admin', 'admin');
    expect((await post(uid('m2'), 'approve', { role: 'project_manager' })).body.user.role).toBe(
      'project_manager',
    );
    await reset('m2', 'pending');
    const denied = await post(uid('m2'), 'approve', { role: 'admin' });
    expect([denied.status, denied.body.code]).toEqual([403, 'TARGET_PROTECTED']);
    expect((await stored('m2')).approvalStatus).toBe('pending');
    as('super', 'super-admin');
    expect((await post(uid('m2'), 'approve', { role: 'admin' })).status).toBe(200);
    const unknown = await post(uid('m2'), 'approve', { role: 'raja' });
    expect([unknown.status, unknown.body.code]).toEqual([422, 'VALIDATION']);
  });

  test('reject needs a reason (422 REASON_REQUIRED), stores it, and audits user.reject', async () => {
    await reset('m3', 'pending');
    as('admin', 'admin');
    for (const body of [{}, { reason: '' }, { reason: '  ' }, { reason: 'ab' }]) {
      const res = await post(uid('m3'), 'reject', body);
      expect([res.status, res.body.code]).toEqual([422, 'REASON_REQUIRED']);
    }
    expect((await stored('m3')).approvalStatus).toBe('pending');
    const ok = await post(uid('m3'), 'reject', { reason: ' Bukan karyawan ' });
    expect(ok.status).toBe(200);
    expect((await stored('m3')).approvalReason).toBe('Bukan karyawan');
    expect((await auditFor('user.reject', uid('m3'))).length).toBe(1);
  });

  test('state matrix: approved → approve/reject and rejected → reject are 409 WRONG_STATE; rejected → approve is 200', async () => {
    as('admin', 'admin');
    await reset('m4', 'approved');
    for (const verb of ['approve', 'reject'] as const) {
      const res = await post(uid('m4'), verb, { reason: 'alasan jelas' });
      expect([res.status, res.body.code]).toEqual([409, 'WRONG_STATE']);
    }
    await reset('m4', 'rejected');
    const again = await post(uid('m4'), 'reject', { reason: 'alasan jelas' });
    expect([again.status, again.body.code]).toEqual([409, 'WRONG_STATE']);
    expect((await post(uid('m4'), 'approve')).status).toBe(200);
  });

  test('two simultaneous approvals: exactly one 200 and one 409 WRONG_STATE', async () => {
    await reset('m5', 'pending');
    as('admin', 'admin');
    const both = await Promise.all([post(uid('m5'), 'approve'), post(uid('m5'), 'approve')]);
    expect(both.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(both.find((r) => r.status === 409)?.body.code).toBe('WRONG_STATE');
    expect((await auditFor('user.approve', uid('m5'))).length).toBe(1);
  });

  test('Admin → Admin, Admin → SA and self are refused; a super-admin may act on an Admin', async () => {
    await reset('peer', 'pending', 'admin');
    await reset('boss', 'pending', 'super-admin');
    as('admin', 'admin');
    for (const [target, code] of [
      ['peer', 'TARGET_PROTECTED'],
      ['boss', 'TARGET_PROTECTED'],
    ] as const) {
      for (const verb of ['approve', 'reject'] as const) {
        const res = await post(uid(target), verb, { reason: 'alasan jelas' });
        expect([target, verb, res.status, res.body.code]).toEqual([target, verb, 403, code]);
      }
    }
    await db
      .update(user)
      .set({ approvalStatus: 'pending' })
      .where(eq(user.id, uid('admin')));
    const self = await post(uid('admin'), 'approve');
    expect([self.status, self.body.code]).toEqual([403, 'SELF_TARGET']);
    as('super', 'super-admin');
    expect((await post(uid('peer'), 'approve')).status).toBe(200);
    await db
      .update(user)
      .set({ approvalStatus: 'approved' })
      .where(eq(user.id, uid('admin')));
  });

  test('unknown user is 404, members are 403 NOT_ADMIN, anonymous is 401', async () => {
    as('admin', 'admin');
    const ghost = await post(`ghost-${RUN}`, 'approve');
    expect([ghost.status, ghost.body.code]).toEqual([404, 'NOT_FOUND']);
    as('admin', 'member');
    expect((await post(uid('m1'), 'approve')).body.code).toBe('NOT_ADMIN');
    caller.current = null;
    expect((await post(uid('m1'), 'reject')).status).toBe(401);
  });

  test('while impersonating both actions are 403 IMPERSONATING and nothing changes', async () => {
    await reset('m6', 'pending');
    as('admin', 'admin', uid('super'));
    for (const verb of ['approve', 'reject'] as const) {
      const res = await post(uid('m6'), verb, { reason: 'alasan jelas' });
      expect([res.status, res.body.code]).toEqual([403, 'IMPERSONATING']);
    }
    expect((await stored('m6')).approvalStatus).toBe('pending');
  });

  test('an API key is refused (403) on approve, reject and role, while ban keeps its scope', async () => {
    await reset('m7', 'pending');
    const key = { 'x-api-key': `${API_KEY_PREFIX}anything-at-all` };
    for (const verb of ['approve', 'reject'] as const) {
      expect((await post(uid('m7'), verb, { reason: 'alasan jelas' }, key)).status).toBe(403);
    }
    const role = await app.handle(
      new Request(`http://localhost/api/admin/users/${uid('m7')}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...key },
        body: JSON.stringify({ role: 'admin' }),
      }),
    );
    expect(role.status).toBe(403);
    expect((await stored('m7')).approvalStatus).toBe('pending');
    // Control: a route that does carry a scope proceeds to key verification (401 for this fake key).
    const mapped = await app.handle(
      new Request('http://localhost/api/admin/users', { headers: key }),
    );
    expect(mapped.status).toBe(401);
  });
});
