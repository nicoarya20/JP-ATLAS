/** Approval service (S0A-10) against the test database: policy matrix, atomic transitions, races, masked audit. */
import { afterAll, beforeAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { eq, like } from 'drizzle-orm';
import type { Principal } from '../../server/access/user.policy';
import { approveUser, rejectUser } from '../../server/account/approval.service';
import { maskEmail } from '../../server/account/mask-email';
import * as auditMod from '../../server/audit';
import { db } from '../../server/db';
import { user } from '../../server/db/schema';
import { testUser } from '../support/accounts';

const TAG = `apv${crypto.randomUUID().slice(0, 8)}`;
const id = (k: string) => `${TAG}-${k}`;
const email = (k: string) => `${k}-${TAG}@kantor.id`; // test-only
const principal = (k: string, appRole: Principal['appRole'], impersonating = false): Principal => ({
  id: id(k),
  appRole,
  impersonating,
});
const ADMIN = principal('admin', 'admin');
const SUPER = principal('super', 'super-admin');

const audit = spyOn(auditMod, 'audit').mockImplementation(async () => {});
const rowOf = async (k: string) =>
  (
    await db
      .select()
      .from(user)
      .where(eq(user.id, id(k)))
  )[0] as typeof user.$inferSelect;

/** Puts the named account back to a known state so tests do not depend on each other. */
const seed = async (k: string, over: Partial<typeof user.$inferInsert> = {}) => {
  await db.delete(user).where(eq(user.id, id(k)));
  await db.insert(user).values(
    testUser({
      id: id(k),
      name: `Budi ${k}`,
      email: email(k),
      approvalStatus: 'pending',
      ...over,
    }),
  );
};

beforeAll(async () => {
  await seed('admin', { approvalStatus: 'approved', role: 'admin' });
  await seed('super', { approvalStatus: 'approved', role: 'super-admin' });
});
beforeEach(() => audit.mockClear());
afterAll(async () => {
  audit.mockRestore();
  await db.delete(user).where(like(user.id, `${TAG}-%`));
});

describe('maskEmail', () => {
  test('keeps the first character and the domain only', () => {
    expect(maskEmail('budi@kantor.id')).toBe('b***@kantor.id');
    expect(maskEmail('a@b.co')).toBe('a***@b.co');
  });
  test('hides values without a usable local part', () => {
    expect(maskEmail('@kantor.id')).toBe('***');
    expect(maskEmail('no-at-sign')).toBe('***');
    expect(maskEmail('')).toBe('***');
    expect(maskEmail(null)).toBe('***');
  });
});

describe('approveUser', () => {
  test('approves a pending account, records who decided and keeps the role', async () => {
    await seed('p1');
    const r = await approveUser({ actor: ADMIN, targetId: id('p1') });
    expect(r).toMatchObject({ ok: true, user: { id: id('p1'), approvalStatus: 'approved' } });
    const row = await rowOf('p1');
    expect(row.approvalStatus).toBe('approved');
    expect(row.approvalDecidedBy).toBe(id('admin'));
    expect(row.approvalDecidedAt).toBeInstanceOf(Date);
    expect(row.approvalReason).toBeNull();
    expect(row.role).toBe('member');
  });

  test('an Admin may pick Project Manager; the role is written with the approval', async () => {
    await seed('p2');
    const r = await approveUser({ actor: ADMIN, targetId: id('p2'), role: 'project_manager' });
    expect(r).toMatchObject({ ok: true, user: { role: 'project_manager' } });
    expect((await rowOf('p2')).role).toBe('project_manager');
  });

  test('role ceiling: Admin cannot grant admin or super-admin, and nothing is written', async () => {
    await seed('p3');
    for (const role of ['admin', 'super-admin'] as const) {
      const r = await approveUser({ actor: ADMIN, targetId: id('p3'), role });
      expect(r).toEqual({ ok: false, code: 'TARGET_PROTECTED' });
    }
    expect((await rowOf('p3')).approvalStatus).toBe('pending');
  });

  test('a super-admin may grant admin', async () => {
    await seed('p4');
    const r = await approveUser({ actor: SUPER, targetId: id('p4'), role: 'admin' });
    expect(r).toMatchObject({ ok: true, user: { role: 'admin' } });
  });

  test('rejected accounts can be approved later', async () => {
    await seed('p5', { approvalStatus: 'rejected', approvalReason: 'salah daftar' });
    expect((await approveUser({ actor: ADMIN, targetId: id('p5') })).ok).toBe(true);
    const row = await rowOf('p5');
    expect(row.approvalStatus).toBe('approved');
    expect(row.approvalReason).toBeNull(); // the old rejection reason must not outlive the decision
  });

  test('refusals use the policy codes and leave the row untouched', async () => {
    await seed('approved', { approvalStatus: 'approved' });
    await seed('adm2', { role: 'admin' });
    await seed('sa2', { role: 'super-admin' });
    const cases = [
      ['already approved', ADMIN, 'approved', 'WRONG_STATE'],
      ['ghost target', ADMIN, 'ghost', 'NOT_FOUND'],
      ['Admin → Admin', ADMIN, 'adm2', 'TARGET_PROTECTED'],
      ['Admin → SA', ADMIN, 'sa2', 'TARGET_PROTECTED'],
      ['self', principal('adm2', 'admin'), 'adm2', 'SELF_TARGET'],
      ['member caller', principal('approved', 'member'), 'adm2', 'NOT_ADMIN'],
      ['impersonating', principal('admin', 'admin', true), 'approved', 'IMPERSONATING'],
    ] as const;
    for (const [name, actor, target, code] of cases) {
      const r = await approveUser({ actor, targetId: id(target) });
      expect({ name, r }).toEqual({ name, r: { ok: false, code } });
    }
    expect((await rowOf('adm2')).approvalStatus).toBe('pending');
    expect(audit).not.toHaveBeenCalled();
  });

  test('audits with name + id and a masked email, never the raw address', async () => {
    await seed('aud');
    await approveUser({ actor: ADMIN, actorEmail: email('admin'), targetId: id('aud') });
    expect(audit).toHaveBeenCalledTimes(1);
    const call = audit.mock.calls[0]?.[0];
    expect(call?.action).toBe('user.approve');
    expect(call?.targetId).toBe(id('aud'));
    expect(call?.summary).toContain(`Budi aud (${id('aud')}, a***@kantor.id)`);
    const dump = JSON.stringify(call);
    expect(dump).not.toContain(email('aud'));
    expect(dump).not.toContain(email('admin'));
    expect(call?.actor?.email).toBe('a***@kantor.id');
  });
});

describe('rejectUser', () => {
  test('rejects a pending account and stores the trimmed reason', async () => {
    await seed('r1');
    const r = await rejectUser({ actor: ADMIN, targetId: id('r1'), reason: '  Bukan karyawan  ' });
    expect(r).toMatchObject({ ok: true, user: { approvalStatus: 'rejected' } });
    const row = await rowOf('r1');
    expect(row.approvalStatus).toBe('rejected');
    expect(row.approvalReason).toBe('Bukan karyawan');
    expect(row.approvalDecidedBy).toBe(id('admin'));
    expect(audit.mock.calls[0]?.[0].action).toBe('user.reject');
  });

  test('a missing, blank, too short or too long reason is REASON_REQUIRED', async () => {
    await seed('r2');
    for (const reason of [undefined, null, '', '   ', 'ab', 'x'.repeat(201)]) {
      const r = await rejectUser({ actor: ADMIN, targetId: id('r2'), reason });
      expect({ reason, r }).toEqual({ reason, r: { ok: false, code: 'REASON_REQUIRED' } });
    }
    expect((await rowOf('r2')).approvalStatus).toBe('pending');
  });

  test('approved and already rejected accounts cannot be rejected (WRONG_STATE)', async () => {
    await seed('r3', { approvalStatus: 'approved' });
    await seed('r4', { approvalStatus: 'rejected' });
    for (const k of ['r3', 'r4']) {
      const r = await rejectUser({ actor: ADMIN, targetId: id(k), reason: 'alasan jelas' });
      expect(r).toEqual({ ok: false, code: 'WRONG_STATE' });
    }
  });

  test('Admin → Admin is protected, a super-admin may reject an Admin, impersonation is blocked', async () => {
    await seed('r5', { role: 'admin' });
    const reason = 'alasan jelas';
    expect(await rejectUser({ actor: ADMIN, targetId: id('r5'), reason })).toEqual({
      ok: false,
      code: 'TARGET_PROTECTED',
    });
    expect(
      await rejectUser({
        actor: principal('super', 'super-admin', true),
        targetId: id('r5'),
        reason,
      }),
    ).toEqual({ ok: false, code: 'IMPERSONATING' });
    expect((await rejectUser({ actor: SUPER, targetId: id('r5'), reason })).ok).toBe(true);
  });

  test('the audit entry masks the email and carries the reason in meta only', async () => {
    await seed('r6');
    await rejectUser({ actor: ADMIN, targetId: id('r6'), reason: 'alasan jelas' });
    const call = audit.mock.calls[0]?.[0];
    expect(call?.summary).toContain('r***@kantor.id');
    expect(JSON.stringify(call)).not.toContain(email('r6'));
    expect(call?.meta).toMatchObject({ from: 'pending', reason: 'alasan jelas' });
  });
});

describe('simultaneous decisions', () => {
  test('two approvals at once: exactly one wins, the other is WRONG_STATE', async () => {
    await seed('c1');
    const results = await Promise.all([
      approveUser({ actor: ADMIN, targetId: id('c1') }),
      approveUser({ actor: SUPER, targetId: id('c1') }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, code: 'WRONG_STATE' }]);
    expect(audit).toHaveBeenCalledTimes(1); // only the winner is audited
  });

  test('approve racing reject never ends in a state neither decision produced', async () => {
    await seed('c2');
    const [a, r] = await Promise.all([
      approveUser({ actor: ADMIN, targetId: id('c2') }),
      rejectUser({ actor: SUPER, targetId: id('c2'), reason: 'alasan jelas' }),
    ]);
    expect(a.ok || r.ok).toBe(true);
    const final = (await rowOf('c2')).approvalStatus;
    // Both can succeed only in the order reject → approve (rejected → approved is legal); then approve is final.
    if (a.ok && r.ok) expect(final).toBe('approved');
    else expect(final).toBe(a.ok ? 'approved' : 'rejected');
  });
});
