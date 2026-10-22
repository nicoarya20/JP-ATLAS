/**
 * The approver's side of `/api/app/leave` through the real router and guard: the list of requests
 * waiting for the caller (scoped by the approval rule, with `dueTasks`) and the two decisions. The
 * requester's side is `app-leave.test.ts`. "Today" is frozen at 2026-10-07.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { AUDIT_ACTIONS } from '../../server/audit';
import { auditLog } from '../../server/db/schema';
import { upsertLeaveSettings } from '../../server/settings-leave';
import { type LeaveWorld, leaveWorld, seedLeave } from '../leave/leave.world';
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

describe('GET /leave/pending', () => {
  it('lists what the caller may decide, soonest first, with the requester and dueTasks', async () => {
    await f.task({ project: w.x, assignee: w.dodi, due: '2026-10-15', status: 'in_progress' });
    await f.task({ project: w.x, assignee: w.dodi, due: '2026-10-16', status: 'todo' });
    await f.task({ project: w.x, assignee: w.dodi, due: '2026-10-16', status: 'canceled' });
    const later = await send(w.dodi, '2026-10-20', '2026-10-21');
    const sooner = await send(w.dodi, '2026-10-14', '2026-10-16', 'rawat jalan');
    as(w.nico);
    const res = await call('GET', '/app/leave/pending');
    expect(res.status).toBe(200);
    const mine = res.body.items.filter((i: Json) => i.requester.id === w.dodi.id);
    expect(mine.map((i: Json) => i.id)).toEqual([sooner.id, later.id]);
    expect(mine[0]).toMatchObject({
      requester: { id: w.dodi.id, name: 'Dodi' },
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      days: 3,
      note: 'rawat jalan',
      dueTasks: 2,
    });
    expect(mine[1].dueTasks).toBe(0);
    expect(res.body).toMatchObject({ page: 1, limit: 25 });
    expect(JSON.stringify(res.body)).not.toContain('@');
  });

  it('is scoped to the rule: a Project Manager sees only Members of the projects they manage', async () => {
    const dodi = await send(w.dodi, '2026-10-14', '2026-10-15');
    const oki = await send(w.oki, '2026-10-14', '2026-10-15');
    const nico = await send(w.nico, '2026-10-14', '2026-10-15');
    const idsFor = async (who: Who) => {
      as(who);
      return new Set(
        (await call('GET', '/app/leave/pending?limit=100')).body.items.map((i: Json) => i.id),
      );
    };
    const forNico = await idsFor(w.nico);
    expect(forNico.has(dodi.id)).toBe(true);
    expect(forNico.has(oki.id)).toBe(false);
    expect(forNico.has(nico.id)).toBe(false);
    const forLea = await idsFor(w.lea);
    expect(forLea.has(oki.id)).toBe(true);
    expect(forLea.has(dodi.id)).toBe(false);
    const forAyu = await idsFor(w.ayu);
    for (const id of [dodi.id, oki.id, nico.id]) expect(forAyu.has(id)).toBe(true);
  });

  it('is empty for a Member, a Member-Pengelola included', async () => {
    await send(w.dodi, '2026-10-14', '2026-10-15');
    for (const who of [w.oki, w.eka]) {
      as(who);
      const res = await call('GET', '/app/leave/pending');
      expect(res.body).toEqual({ items: [], total: 0, page: 1, limit: 25 });
    }
  });

  it('leaves out requests whose last day has passed and the caller’s own', async () => {
    await seedLeave(w.dodi, '2026-10-01', '2026-10-06', 'pending');
    as(w.ayu);
    const stale = await call('GET', '/app/leave/pending?limit=100');
    expect(stale.body.items.some((i: Json) => i.endDate === '2026-10-06')).toBe(false);
    await seedLeave(w.nico, '2026-10-14', '2026-10-15', 'pending');
    as(w.nico);
    const own = await call('GET', '/app/leave/pending?limit=100');
    expect(own.body.items.some((i: Json) => i.requester.id === w.nico.id)).toBe(false);
  });

  it('pages the list and rejects an out-of-range limit', async () => {
    for (const d of ['14', '15', '16'])
      await seedLeave(w.dodi, `2026-11-${d}`, `2026-11-${d}`, 'pending');
    as(w.nico);
    const first = await call('GET', '/app/leave/pending?limit=2&page=1');
    const second = await call('GET', '/app/leave/pending?limit=2&page=2');
    expect(first.body.items).toHaveLength(2);
    expect(second.body.items).toHaveLength(1);
    expect(first.body.total).toBe(3);
    expect(second.body).toMatchObject({ page: 2, limit: 2, total: 3 });
    expectApiError(await call('GET', '/app/leave/pending?limit=1000'), 422, 'VALIDATION');
  });
});

describe('POST /leave/:id/approve and /reject', () => {
  it('approves, audits the decision and answers the request with its decider', async () => {
    const sent = await send(w.dodi, '2026-10-14', '2026-10-16');
    as(w.nico);
    const res = await call('POST', `/app/leave/${sent.id}/approve`);
    expect(res.status).toBe(200);
    expect(res.body.request).toMatchObject({
      id: sent.id,
      status: 'approved',
      decidedBy: { id: w.nico.id, name: 'Nico' },
    });
    const rows = await waitForAudit(eq(auditLog.targetId, sent.id));
    for (const r of rows) cleaner.track('audit', r.id);
    expect(rows[0]).toMatchObject({
      action: AUDIT_ACTIONS.LEAVE_APPROVE,
      targetType: 'leave',
      actorId: w.nico.id,
    });
    expect(JSON.stringify(rows[0].meta)).not.toContain('Dodi');
  });

  it('rejects with an optional reason', async () => {
    const withReason = await send(w.dodi, '2026-10-14', '2026-10-16');
    const noReason = await send(w.oki, '2026-10-14', '2026-10-16');
    as(w.ayu);
    const a = await call('POST', `/app/leave/${withReason.id}/reject`, { reason: 'tim padat' });
    expect(a.body.request).toMatchObject({ status: 'rejected', rejectReason: 'tim padat' });
    const b = await call('POST', `/app/leave/${noReason.id}/reject`, {});
    expect(b.body.request).toMatchObject({ status: 'rejected', rejectReason: null });
    const rows = await waitForAudit(eq(auditLog.targetId, withReason.id));
    for (const r of rows) cleaner.track('audit', r.id);
    expect(rows[0].action).toBe(AUDIT_ACTIONS.LEAVE_REJECT);
  });

  it('answers 409 ALREADY_DECIDED to the second approver and keeps the first outcome', async () => {
    const sent = await send(w.dodi, '2026-10-14', '2026-10-16');
    as(w.nico);
    expect((await call('POST', `/app/leave/${sent.id}/approve`)).status).toBe(200);
    as(w.ayu);
    expectApiError(
      await call('POST', `/app/leave/${sent.id}/reject`, { reason: 'terlambat' }),
      409,
      'ALREADY_DECIDED',
    );
    as(w.dodi);
    expect((await call('GET', '/app/leave/me')).body.state).toBe('approved');
  });

  it('answers 403 SELF_TARGET for your own request and 403 IMPERSONATING while acting as someone', async () => {
    const mine = await send(w.dodi, '2026-10-14', '2026-10-16');
    as(w.dodi);
    expectApiError(await call('POST', `/app/leave/${mine.id}/approve`), 403, 'SELF_TARGET');
    as(w.ayu, { impersonatedBy: w.ayu.id });
    expectApiError(await call('POST', `/app/leave/${mine.id}/approve`), 403, 'IMPERSONATING');
  });

  it('answers 404 to anyone who could not decide it, and for an id that is not there', async () => {
    const sent = await send(w.dodi, '2026-10-14', '2026-10-16');
    for (const who of [w.eka, w.lea, w.oki]) {
      as(who);
      expectApiError(await call('POST', `/app/leave/${sent.id}/approve`), 404, 'NOT_FOUND');
      expectApiError(await call('POST', `/app/leave/${sent.id}/reject`, {}), 404, 'NOT_FOUND');
    }
    as(w.ayu);
    expectApiError(await call('POST', '/app/leave/tidak-ada/approve'), 404, 'NOT_FOUND');
    as(w.dodi);
    expect((await call('GET', '/app/leave/me')).body.state).toBe('pending');
  });

  it('answers 422 for a reason that is too long and 409 for a request that ran out', async () => {
    const sent = await send(w.dodi, '2026-10-14', '2026-10-16');
    as(w.ayu);
    expectApiError(
      await call('POST', `/app/leave/${sent.id}/reject`, { reason: 'x'.repeat(301) }),
      422,
      'VALIDATION',
    );
    const stale = await seedLeave(w.oki, '2026-10-01', '2026-10-06', 'pending');
    expectApiError(await call('POST', `/app/leave/${stale.id}/approve`), 409, 'LEAVE_EXPIRED');
  });
});
