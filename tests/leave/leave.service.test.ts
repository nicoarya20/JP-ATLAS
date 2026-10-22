/**
 * Leave writes against the test database: submit, withdraw, approve, reject. "Today" is injected
 * (2026-10-07), so past/future rules do not depend on the real clock.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { leaveRequest } from '../../server/db/schema';
import type { LeaveWriteResult } from '../../server/leave/leave.dto';
import { cancelLeave, decideLeave, submitLeave } from '../../server/leave/leave.service';
import { LEAVE_MESSAGES } from '../../server/leave/leave.validate';
import { upsertLeaveSettings } from '../../server/settings-leave';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import {
  asPrincipal,
  CLOCK,
  type LeaveWorld,
  leaveCards,
  leaveWorld,
  seedLeave,
} from './leave.world';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'leavesvc' });
let w: LeaveWorld;

beforeEach(async () => {
  w = await leaveWorld(f);
});
afterEach(async () => {
  await upsertLeaveSettings({ requiresApproval: true });
  await cleaner.flushTest();
});
afterAll(() => cleaner.flushAll());

/** Narrows a write result to its request, failing the test with the refusal when it was not ok. */
function okRequest(r: LeaveWriteResult) {
  if (!r.ok) throw new Error(`expected ok, got ${r.code}: ${r.error ?? ''}`);
  return r.request;
}
const refusalOf = (r: LeaveWriteResult) => (r.ok ? null : r);

const ask = (
  who: { id: string; role: string },
  startDate: string,
  endDate: string,
  note?: string,
) => submitLeave(asPrincipal(who as never), { startDate, endDate, note }, CLOCK);

describe('submitLeave', () => {
  it('keeps a Member request pending and asks the Project Manager and the Admin, nobody else', async () => {
    const req = okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16', ' ke dokter '));
    expect(req).toMatchObject({
      userId: w.dodi.id,
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      days: 3,
      note: 'ke dokter',
      status: 'pending',
      decidedBy: null,
      decidedAt: null,
      canCancel: true,
    });
    const cards = await leaveCards(req.id, 'leave_requested');
    const holders = new Set(cards.map((c) => c.recipientId));
    expect(holders.has(w.nico.id)).toBe(true);
    expect(holders.has(w.ayu.id)).toBe(true);
    // Not the requester, not a Member-Pengelola, not a Project Manager of an unrelated project, not another Member.
    for (const out of [w.dodi, w.eka, w.lea, w.oki]) expect(holders.has(out.id)).toBe(false);
    expect(cards[0]).toMatchObject({
      lane: 'action',
      actorId: w.dodi.id,
      projectId: null,
      payload: {
        name: 'Dodi',
        startDate: '2026-10-14',
        endDate: '2026-10-16',
        days: 3,
        dueTasks: 0,
      },
    });
  });

  it("asks only the Admin for a Project Manager's request", async () => {
    const req = okRequest(await ask(w.nico, '2026-10-14', '2026-10-14'));
    expect(req.status).toBe('pending');
    const holders = new Set((await leaveCards(req.id)).map((c) => c.recipientId));
    expect(holders.has(w.ayu.id)).toBe(true);
    for (const out of [w.nico, w.lea, w.dodi, w.eka]) expect(holders.has(out.id)).toBe(false);
  });

  it('approves an Admin request at once, with no decider and no card', async () => {
    const req = okRequest(await ask(w.ayu, '2026-10-14', '2026-10-15'));
    expect(req).toMatchObject({ status: 'approved', decidedBy: null, rejectReason: null });
    expect(req.decidedAt).toBe(CLOCK.now.toISOString());
    expect(await leaveCards(req.id)).toEqual([]);
  });

  it('approves every request at once while the approval switch is off', async () => {
    await upsertLeaveSettings({ requiresApproval: false });
    for (const who of [w.dodi, w.nico]) {
      const req = okRequest(await ask(who, '2026-10-14', '2026-10-14'));
      expect(req.status).toBe('approved');
      expect(await leaveCards(req.id)).toEqual([]);
    }
  });

  it('allows starting today and refuses a start in the past', async () => {
    expect(okRequest(await ask(w.dodi, '2026-10-07', '2026-10-07')).days).toBe(1);
    const past = refusalOf(await ask(w.oki, '2026-10-06', '2026-10-08'));
    expect(past).toMatchObject({ code: 'VALIDATION', error: LEAVE_MESSAGES.pastStart });
    expect(await db.select().from(leaveRequest).where(eq(leaveRequest.userId, w.oki.id))).toEqual(
      [],
    );
  });

  it('refuses a range that shares a day with a pending or approved request (409)', async () => {
    okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16'));
    for (const [from, to] of [
      ['2026-10-16', '2026-10-18'],
      ['2026-10-12', '2026-10-14'],
      ['2026-10-15', '2026-10-15'],
      ['2026-10-10', '2026-10-30'],
    ]) {
      expect(refusalOf(await ask(w.dodi, from, to))).toMatchObject({ code: 'LEAVE_OVERLAP' });
    }
    // Back to back is fine: the days do not share a date.
    expect(okRequest(await ask(w.dodi, '2026-10-17', '2026-10-18')).status).toBe('pending');
    await seedLeave(w.eka, '2026-11-02', '2026-11-04', 'approved');
    expect(refusalOf(await ask(w.eka, '2026-11-04', '2026-11-05'))).toMatchObject({
      code: 'LEAVE_OVERLAP',
    });
  });

  it('lets a range be asked again once the earlier one was rejected or canceled', async () => {
    await seedLeave(w.dodi, '2026-10-14', '2026-10-16', 'rejected');
    await seedLeave(w.dodi, '2026-10-20', '2026-10-22', 'canceled');
    expect(okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16')).status).toBe('pending');
    expect(okRequest(await ask(w.dodi, '2026-10-20', '2026-10-22')).status).toBe('pending');
  });

  it('lets only one of two simultaneous overlapping submits through', async () => {
    const results = await Promise.all([
      ask(w.dodi, '2026-10-14', '2026-10-16'),
      ask(w.dodi, '2026-10-15', '2026-10-17'),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.map((r) => refusalOf(r)?.code).filter(Boolean)).toEqual(['LEAVE_OVERLAP']);
  });

  it('counts the unfinished tasks due inside the range on the approval card', async () => {
    const inRange = ['2026-10-14', '2026-10-16'];
    for (const due of inRange)
      await f.task({ project: w.x, assignee: w.dodi, due, status: 'todo' });
    await f.task({ project: w.x, assignee: w.dodi, due: '2026-10-14', status: 'done' });
    await f.task({ project: w.x, assignee: w.dodi, due: '2026-10-17', status: 'todo' });
    await f.task({ project: w.x, assignee: w.eka, due: '2026-10-15', status: 'todo' });
    const req = okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16'));
    const [card] = await leaveCards(req.id, 'leave_requested');
    expect(card.payload).toMatchObject({ dueTasks: 2 });
  });
});

describe('cancelLeave', () => {
  const cancel = (who: { id: string; role: string }, id: string) =>
    cancelLeave(asPrincipal(who as never), id, CLOCK);

  it('withdraws a pending request and closes the approval cards for everybody', async () => {
    const req = okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16'));
    const done = okRequest(await cancel(w.dodi, req.id));
    expect(done).toMatchObject({ status: 'canceled', canCancel: false });
    const cards = await leaveCards(req.id, 'leave_requested');
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.resolvedAt).not.toBeNull();
      expect(card.resolvedReason).toBe('target_closed');
    }
  });

  it('withdraws an approved leave up to its last day, and no later', async () => {
    const live = await seedLeave(w.dodi, '2026-10-05', '2026-10-07', 'approved');
    expect(okRequest(await cancel(w.dodi, live.id)).status).toBe('canceled');
    const over = await seedLeave(w.eka, '2026-10-01', '2026-10-06', 'approved');
    expect(refusalOf(await cancel(w.eka, over.id))).toMatchObject({ code: 'WRONG_STATE' });
  });

  it('leaves a rejected or canceled request alone', async () => {
    for (const status of ['rejected', 'canceled'] as const) {
      const row = await seedLeave(w.dodi, '2026-11-01', '2026-11-02', status);
      expect(refusalOf(await cancel(w.dodi, row.id))).toMatchObject({ code: 'WRONG_STATE' });
    }
  });

  it("is the owner's alone: an approver who can see it gets 403, a stranger 404", async () => {
    const req = okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16'));
    expect(refusalOf(await cancel(w.ayu, req.id))).toMatchObject({ code: 'NOT_OWNER' });
    expect(refusalOf(await cancel(w.nico, req.id))).toMatchObject({ code: 'NOT_OWNER' });
    for (const stranger of [w.eka, w.lea, w.oki]) {
      expect(refusalOf(await cancel(stranger, req.id))).toMatchObject({ code: 'NOT_FOUND' });
    }
    expect(refusalOf(await cancel(w.dodi, 'tidak-ada'))).toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('decideLeave', () => {
  const decide = (
    who: { id: string; role: string },
    id: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ) => decideLeave(asPrincipal(who as never), id, decision, reason, CLOCK);

  it('approves for the Project Manager who manages the shared project and tells the requester', async () => {
    const req = okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16'));
    const done = okRequest(await decide(w.nico, req.id, 'approved'));
    expect(done).toMatchObject({
      status: 'approved',
      decidedBy: { id: w.nico.id, name: 'Nico' },
      rejectReason: null,
      canCancel: true,
    });
    expect(done.decidedAt).toBe(CLOCK.now.toISOString());

    const requested = await leaveCards(req.id, 'leave_requested');
    const byHolder = new Map(requested.map((c) => [c.recipientId, c]));
    // The decider's card is "acted"; the other approver's is "elsewhere" (handled by someone else).
    expect(byHolder.get(w.nico.id)).toMatchObject({ resolvedReason: 'acted' });
    expect(byHolder.get(w.ayu.id)).toMatchObject({ resolvedReason: 'elsewhere' });

    const [news] = await leaveCards(req.id, 'leave_decided');
    expect(news).toMatchObject({
      recipientId: w.dodi.id,
      lane: 'info',
      actorId: w.nico.id,
      payload: { decision: 'approved', startDate: '2026-10-14', endDate: '2026-10-16', days: 3 },
    });
  });

  it('rejects with a reason the requester reads, and a blank reason stays empty', async () => {
    const one = okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16'));
    const rejected = okRequest(await decide(w.ayu, one.id, 'rejected', ' sprint sedang padat '));
    expect(rejected).toMatchObject({ status: 'rejected', rejectReason: 'sprint sedang padat' });
    const [news] = await leaveCards(one.id, 'leave_decided');
    expect(news.payload).toMatchObject({ decision: 'rejected', excerpt: 'sprint sedang padat' });

    const two = okRequest(await ask(w.dodi, '2026-10-20', '2026-10-21'));
    const blank = okRequest(await decide(w.ayu, two.id, 'rejected', '   '));
    expect(blank.rejectReason).toBeNull();
    const [bare] = await leaveCards(two.id, 'leave_decided');
    expect(bare.payload).not.toHaveProperty('excerpt');
  });

  it('lets the first decider win and gives the second 409 ALREADY_DECIDED', async () => {
    const req = okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16'));
    okRequest(await decide(w.nico, req.id, 'approved'));
    expect(refusalOf(await decide(w.ayu, req.id, 'rejected'))).toMatchObject({
      code: 'ALREADY_DECIDED',
    });
    const [stored] = await db.select().from(leaveRequest).where(eq(leaveRequest.id, req.id));
    expect(stored.status).toBe('approved');
    expect(await leaveCards(req.id, 'leave_decided')).toHaveLength(1);
  });

  it('lets only one of two simultaneous decisions through', async () => {
    const req = okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16'));
    const results = await Promise.all([
      decide(w.nico, req.id, 'approved'),
      decide(w.ayu, req.id, 'rejected'),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.map((r) => refusalOf(r)?.code).filter(Boolean)).toEqual(['ALREADY_DECIDED']);
    expect(await leaveCards(req.id, 'leave_decided')).toHaveLength(1);
  });

  it('never lets anybody decide their own request', async () => {
    const mine = okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16'));
    expect(refusalOf(await decide(w.dodi, mine.id, 'approved'))).toMatchObject({
      code: 'SELF_TARGET',
    });
    const nicos = okRequest(await ask(w.nico, '2026-10-14', '2026-10-16'));
    expect(refusalOf(await decide(w.nico, nicos.id, 'approved'))).toMatchObject({
      code: 'SELF_TARGET',
    });
  });

  it('hides a request from people who could not decide it (404), whatever role they hold', async () => {
    const req = okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16'));
    for (const who of [w.eka, w.lea, w.oki]) {
      expect(refusalOf(await decide(who, req.id, 'approved'))).toMatchObject({ code: 'NOT_FOUND' });
    }
    expect(refusalOf(await decide(w.ayu, 'tidak-ada', 'approved'))).toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it("leaves a Project Manager's request to the Admin alone", async () => {
    const req = okRequest(await ask(w.nico, '2026-10-14', '2026-10-16'));
    for (const peer of [w.lea]) {
      expect(refusalOf(await decide(peer, req.id, 'approved'))).toMatchObject({
        code: 'NOT_FOUND',
      });
    }
    expect(okRequest(await decide(w.ayu, req.id, 'approved')).status).toBe('approved');
  });

  it('does not let an impersonating Admin decide', async () => {
    const req = okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16'));
    const r = await decideLeave(asPrincipal(w.ayu as never, true), req.id, 'approved', null, CLOCK);
    expect(refusalOf(r)).toMatchObject({ code: 'IMPERSONATING' });
  });

  it('refuses a request whose last day has passed, and a reason that is too long', async () => {
    const stale = await seedLeave(w.dodi, '2026-10-01', '2026-10-06', 'pending');
    expect(refusalOf(await decide(w.ayu, stale.id, 'approved'))).toMatchObject({
      code: 'LEAVE_EXPIRED',
    });
    const req = okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16'));
    const long = refusalOf(await decide(w.ayu, req.id, 'rejected', 'x'.repeat(301)));
    expect(long).toMatchObject({ code: 'VALIDATION', error: LEAVE_MESSAGES.reasonTooLong });
  });

  it('does not touch a request that was withdrawn in between', async () => {
    const req = okRequest(await ask(w.dodi, '2026-10-14', '2026-10-16'));
    okRequest(await cancelLeave(asPrincipal(w.dodi as never), req.id, CLOCK));
    expect(refusalOf(await decide(w.ayu, req.id, 'approved'))).toMatchObject({
      code: 'ALREADY_DECIDED',
    });
  });
});
