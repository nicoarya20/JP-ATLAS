/**
 * `/api/app/leave` through the real router and guard (auth is spied, not replaced): the requester's
 * own state, sending and withdrawing a request. The approver's side is `app-leave.decide.test.ts` and
 * the workspace switch `app-leave.settings.test.ts`. "Today" is frozen at 2026-10-07.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { AUDIT_ACTIONS } from '../../server/audit';
import { db } from '../../server/db';
import { auditLog, leaveRequest } from '../../server/db/schema';
import { LEAVE_HISTORY_LIMIT } from '../../server/leave/leave.dto';
import { upsertLeaveSettings } from '../../server/settings-leave';
import { type LeaveWorld, leaveCards, leaveWorld, seedLeave } from '../leave/leave.world';
import { call, expectApiError, type Json, resetApiLimiters, waitForAudit } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW, freezeAt } from '../support/clock';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'leaveapi' });
let w: LeaveWorld;

beforeEach(async () => {
  auth.as(null);
  resetApiLimiters();
  freezeAt(ATLAS_NOW);
  w = await leaveWorld(f);
});
afterEach(async () => {
  await upsertLeaveSettings({ requiresApproval: true });
  await cleaner.flushTest();
});
afterAll(() => cleaner.flushAll());

type Who = LeaveWorld['dodi'];
const as = (who: Who, opts?: { impersonatedBy?: string }) => auth.as(who, opts);
const send = async (who: Who, startDate: string, endDate: string, note?: string): Promise<Json> => {
  as(who);
  const res = await call('POST', '/app/leave', { startDate, endDate, note });
  expect(res.status).toBe(201);
  return res.body.request;
};

describe('sign-in gate', () => {
  it.each([
    ['GET', '/app/leave/me'],
    ['POST', '/app/leave'],
    ['DELETE', '/app/leave/x'],
    ['GET', '/app/leave/pending'],
    ['POST', '/app/leave/x/approve'],
    ['POST', '/app/leave/x/reject'],
    ['GET', '/app/leave/settings'],
    ['PUT', '/app/leave/settings'],
  ])('%s %s answers 401 without a session', async (method, path) => {
    const res = await call(method, path, method === 'GET' || method === 'DELETE' ? undefined : {});
    expectApiError(res, 401, 'UNAUTHORIZED');
  });
});

describe('GET /leave/me', () => {
  it('starts as none, with the switch and an empty history', async () => {
    as(w.dodi);
    const res = await call('GET', '/app/leave/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ state: 'none', request: null, history: [], requiresApproval: true });
  });

  it('follows a request through pending, approved and back to none once it is over', async () => {
    const sent = await send(w.dodi, '2026-10-14', '2026-10-16', 'ke dokter');
    as(w.dodi);
    let me = (await call('GET', '/app/leave/me')).body;
    expect(me.state).toBe('pending');
    expect(me.request).toMatchObject({
      id: sent.id,
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      days: 3,
      note: 'ke dokter',
      status: 'pending',
      decidedBy: null,
      canCancel: true,
    });
    expect(me.history.map((h: Json) => h.id)).toEqual([sent.id]);

    as(w.nico);
    expect((await call('POST', `/app/leave/${sent.id}/approve`)).status).toBe(200);
    as(w.dodi);
    me = (await call('GET', '/app/leave/me')).body;
    expect(me.state).toBe('approved');
    expect(me.request.decidedBy).toEqual({ id: w.nico.id, name: 'Nico' });

    freezeAt(new Date('2026-10-20T03:00:00Z'));
    me = (await call('GET', '/app/leave/me')).body;
    expect(me.state).toBe('none');
    expect(me.request).toBeNull();
    expect(me.history[0]).toMatchObject({ id: sent.id, status: 'approved', canCancel: false });
  });

  it('shows rejected, with the reason, only while the last request is the rejected one', async () => {
    const sent = await send(w.dodi, '2026-10-14', '2026-10-16');
    as(w.ayu);
    await call('POST', `/app/leave/${sent.id}/reject`, { reason: 'sprint padat' });
    as(w.dodi);
    let me = (await call('GET', '/app/leave/me')).body;
    expect(me.state).toBe('rejected');
    expect(me.request).toMatchObject({
      id: sent.id,
      status: 'rejected',
      rejectReason: 'sprint padat',
    });

    // Asking again replaces the rejected state; withdrawing that leaves none, not rejected.
    const again = await send(w.dodi, '2026-10-14', '2026-10-16');
    me = (await call('GET', '/app/leave/me')).body;
    expect(me).toMatchObject({ state: 'pending', request: { id: again.id } });
    expect(me.history.map((h: Json) => h.status)).toEqual(['pending', 'rejected']);
    as(w.dodi);
    await call('DELETE', `/app/leave/${again.id}`);
    me = (await call('GET', '/app/leave/me')).body;
    expect(me.state).toBe('none');
  });

  it('keeps only the newest requests in history, newest first, and nobody else’s', async () => {
    for (let i = 0; i < LEAVE_HISTORY_LIMIT + 3; i++) {
      await seedLeave(
        w.dodi,
        `2026-09-${String(i + 1).padStart(2, '0')}`,
        `2026-09-${String(i + 1).padStart(2, '0')}`,
        'canceled',
      );
    }
    await seedLeave(w.eka, '2026-09-01', '2026-09-01', 'approved');
    as(w.dodi);
    const me = (await call('GET', '/app/leave/me')).body;
    expect(me.history).toHaveLength(LEAVE_HISTORY_LIMIT);
    const created = me.history.map((h: Json) => h.createdAt);
    expect(created).toEqual([...created].sort().reverse());
    expect(me.history.every((h: Json) => h.userId === w.dodi.id)).toBe(true);
  });

  it('reports the approval switch', async () => {
    await upsertLeaveSettings({ requiresApproval: false });
    as(w.dodi);
    expect((await call('GET', '/app/leave/me')).body.requiresApproval).toBe(false);
  });
});

describe('POST /leave', () => {
  it('answers 201 with the pending request for a Member', async () => {
    as(w.dodi);
    const res = await call('POST', '/app/leave', {
      startDate: '2026-10-14',
      endDate: '2026-10-16',
    });
    expect(res.status).toBe(201);
    expect(res.body.request).toMatchObject({
      userId: w.dodi.id,
      status: 'pending',
      days: 3,
      note: null,
    });
    expect(await leaveCards(res.body.request.id, 'leave_requested')).not.toHaveLength(0);
  });

  it('approves at once for an Admin and while the switch is off', async () => {
    expect((await send(w.ayu, '2026-10-14', '2026-10-14')).status).toBe('approved');
    await upsertLeaveSettings({ requiresApproval: false });
    const req = await send(w.nico, '2026-10-14', '2026-10-14');
    expect(req).toMatchObject({ status: 'approved', decidedBy: null });
  });

  it('answers 422 VALIDATION with a sentence the user can act on', async () => {
    as(w.dodi);
    const cases: Array<[Json, string]> = [
      [{ startDate: '2026-10-06', endDate: '2026-10-08' }, 'sebelum hari ini'],
      [{ startDate: '2026-10-10', endDate: '2026-10-09' }, 'tidak boleh sebelum tanggal mulai'],
      [{ startDate: '2026-02-30', endDate: '2026-03-02' }, 'Tanggal belum sah'],
      [{ startDate: '2026-10-14', endDate: '2027-10-14' }, 'paling lama'],
      [{ startDate: '2026-10-14', endDate: '2026-10-14', note: 'x'.repeat(501) }, 'Catatan'],
    ];
    for (const [body, fragment] of cases) {
      const res = await call('POST', '/app/leave', body);
      expectApiError(res, 422, 'VALIDATION');
      expect(res.body.error).toContain(fragment);
    }
    // A missing field is refused at the boundary, before the service.
    expectApiError(
      await call('POST', '/app/leave', { startDate: '2026-10-14' }),
      422,
      'VALIDATION',
    );
    expect(await db.select().from(leaveRequest).where(eq(leaveRequest.userId, w.dodi.id))).toEqual(
      [],
    );
  });

  it('ignores a field the form does not have, so a caller cannot pick its own status', async () => {
    as(w.dodi);
    const res = await call('POST', '/app/leave', {
      startDate: '2026-10-14',
      endDate: '2026-10-14',
      status: 'approved',
      userId: w.eka.id,
    });
    expect(res.status).toBe(201);
    expect(res.body.request).toMatchObject({ status: 'pending', userId: w.dodi.id });
  });

  it('answers 409 LEAVE_OVERLAP for a range that shares a day with an open request', async () => {
    await send(w.dodi, '2026-10-14', '2026-10-16');
    const res = await call('POST', '/app/leave', {
      startDate: '2026-10-16',
      endDate: '2026-10-18',
    });
    expectApiError(res, 409, 'LEAVE_OVERLAP');
  });
});

describe('DELETE /leave/:id', () => {
  it('withdraws the caller’s own request and audits it', async () => {
    const sent = await send(w.dodi, '2026-10-14', '2026-10-16');
    const res = await call('DELETE', `/app/leave/${sent.id}`);
    expect(res.status).toBe(200);
    expect(res.body.request).toMatchObject({ id: sent.id, status: 'canceled', canCancel: false });
    const rows = await waitForAudit(eq(auditLog.targetId, sent.id));
    expect(rows).toHaveLength(1);
    for (const r of rows) cleaner.track('audit', r.id);
    expect(rows[0]).toMatchObject({
      action: AUDIT_ACTIONS.LEAVE_CANCEL,
      targetType: 'leave',
      actorId: w.dodi.id,
    });
  });

  it('answers 409 for a request that is already final and 404 for one that is not there', async () => {
    const done = await seedLeave(w.dodi, '2026-10-14', '2026-10-16', 'rejected');
    as(w.dodi);
    expectApiError(await call('DELETE', `/app/leave/${done.id}`), 409, 'WRONG_STATE');
    expectApiError(await call('DELETE', '/app/leave/tidak-ada'), 404, 'NOT_FOUND');
  });

  it('answers 403 NOT_OWNER to an approver who sees it and 404 to a stranger', async () => {
    const sent = await send(w.dodi, '2026-10-14', '2026-10-16');
    as(w.ayu);
    expectApiError(await call('DELETE', `/app/leave/${sent.id}`), 403, 'NOT_OWNER');
    as(w.oki);
    expectApiError(await call('DELETE', `/app/leave/${sent.id}`), 404, 'NOT_FOUND');
  });
});
