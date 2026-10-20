/**
 * The two leave cards: the approval card (action lane, two buttons, closes for every approver when
 * one decides or the requester withdraws) and the outcome (news for the requester). Driven through
 * the emit helpers and the Inbox read, so what a user would see is what is asserted.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { notification, notificationPref } from '../../server/db/schema';
import {
  emitLeaveCanceled,
  emitLeaveDecided,
  emitLeaveRequested,
} from '../../server/notification/emit.leave';
import { inboxActionCount, listInbox } from '../../server/notification/notification.query';
import {
  asPrincipal,
  CLOCK,
  type LeaveWorld,
  leaveCards,
  leaveWorld,
  seedLeave,
} from '../leave/leave.world';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'emitleave' });
let w: LeaveWorld;
beforeEach(async () => {
  w = await leaveWorld(f);
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const FACTS = { startDate: '2026-10-14', endDate: '2026-10-16', days: 3, at: CLOCK.now };

/** A pending request for Dodi and the approval cards for Nico and Ayu, as the service would write them. */
async function requested() {
  const row = await seedLeave(w.dodi, FACTS.startDate, FACTS.endDate, 'pending');
  const facts = { ...FACTS, requestId: row.id, requesterId: w.dodi.id, requesterName: 'Dodi' };
  await emitLeaveRequested(db, { ...facts, approverIds: [w.nico.id, w.ayu.id], dueTasks: 2 });
  return { row, facts };
}

describe('leave_requested', () => {
  it('writes one open action card per approver, carrying the numbers the approver decides on', async () => {
    const { row } = await requested();
    const cards = await leaveCards(row.id, 'leave_requested');
    expect(cards.map((c) => c.recipientId).sort()).toEqual([w.nico.id, w.ayu.id].sort());
    for (const card of cards) {
      expect(card).toMatchObject({
        lane: 'action',
        refType: 'leave',
        actorId: w.dodi.id,
        projectId: null,
        resolvedAt: null,
        payload: {
          name: 'Dodi',
          startDate: '2026-10-14',
          endDate: '2026-10-16',
          days: 3,
          dueTasks: 2,
        },
      });
    }
  });

  it('is idempotent: asking again leaves one card per approver', async () => {
    const { row, facts } = await requested();
    await emitLeaveRequested(db, { ...facts, approverIds: [w.nico.id, w.ayu.id], dueTasks: 2 });
    expect(await leaveCards(row.id, 'leave_requested')).toHaveLength(2);
  });

  it('never reaches the requester, nor an account that cannot sign in', async () => {
    const banned = await f.user({ role: 'admin', banned: true });
    const held = await f.user({ role: 'admin', status: 'pending' });
    const row = await seedLeave(w.dodi, FACTS.startDate, FACTS.endDate);
    await emitLeaveRequested(db, {
      ...FACTS,
      requestId: row.id,
      requesterId: w.dodi.id,
      requesterName: 'Dodi',
      approverIds: [w.dodi.id, banned.id, held.id, w.ayu.id],
      dueTasks: 0,
    });
    expect((await leaveCards(row.id)).map((c) => c.recipientId)).toEqual([w.ayu.id]);
  });

  it('shows in the approver Inbox as the one card with two buttons, and counts toward the bell', async () => {
    const { row } = await requested();
    const p = asPrincipal(w.nico);
    const before = await inboxActionCount(p);
    expect(before).toBeGreaterThanOrEqual(1);
    const page = await listInbox(p, { lane: 'action' }, CLOCK.now);
    if (!page.ok) throw new Error('inbox page expected');
    const card = page.items.find((i) => i.ref.id === row.id);
    expect(card).toMatchObject({
      kind: 'leave_requested',
      sentence: 'Dodi mengajukan cuti',
      button: 'Setujui',
      secondaryButton: 'Tolak',
      href: '/app/settings',
      actor: { id: w.dodi.id, name: 'Dodi' },
    });
    // Every other kind keeps a single button.
    expect(page.items.filter((i) => i.kind !== 'leave_requested' && i.secondaryButton)).toEqual([]);
  });
});

describe('closing the approval card', () => {
  it('closes it for every approver when one decides: "acted" for the decider, "elsewhere" for the rest', async () => {
    const { row, facts } = await requested();
    // Ayu is a fresh account, so this card is her whole queue until someone else decides.
    expect(await inboxActionCount(asPrincipal(w.ayu))).toBe(1);
    await emitLeaveDecided(db, { ...facts, decision: 'approved', by: w.nico.id });
    const byHolder = new Map(
      (await leaveCards(row.id, 'leave_requested')).map((c) => [c.recipientId, c]),
    );
    expect(byHolder.get(w.nico.id)).toMatchObject({ resolvedReason: 'acted' });
    expect(byHolder.get(w.ayu.id)).toMatchObject({ resolvedReason: 'elsewhere' });
    expect(await inboxActionCount(asPrincipal(w.ayu))).toBe(0);
    const open = await db
      .select()
      .from(notification)
      .where(and(eq(notification.refId, row.id), eq(notification.recipientId, w.ayu.id)));
    expect(open.every((c) => c.resolvedAt !== null)).toBe(true);
  });

  it('closes it as "target_closed" for every approver when the requester withdraws', async () => {
    const { row } = await requested();
    await emitLeaveCanceled(db, row.id, CLOCK.now);
    const cards = await leaveCards(row.id, 'leave_requested');
    expect(cards).toHaveLength(2);
    for (const card of cards) expect(card).toMatchObject({ resolvedReason: 'target_closed' });
  });

  it('keeps a closed card closed: a second decision or withdrawal changes nothing', async () => {
    const { row, facts } = await requested();
    await emitLeaveDecided(db, { ...facts, decision: 'approved', by: w.nico.id });
    const first = await leaveCards(row.id, 'leave_requested');
    await emitLeaveCanceled(db, row.id, new Date(CLOCK.now.getTime() + 60_000));
    const second = await leaveCards(row.id, 'leave_requested');
    expect(second.map((c) => [c.recipientId, c.resolvedReason, c.resolvedAt?.getTime()])).toEqual(
      first.map((c) => [c.recipientId, c.resolvedReason, c.resolvedAt?.getTime()]),
    );
  });
});

describe('leave_decided', () => {
  it('tells only the requester, as news, with the outcome and the reject reason', async () => {
    const { row, facts } = await requested();
    await emitLeaveDecided(db, {
      ...facts,
      decision: 'rejected',
      by: w.ayu.id,
      reason: 'sprint padat',
    });
    const cards = await leaveCards(row.id, 'leave_decided');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      recipientId: w.dodi.id,
      lane: 'info',
      actorId: w.ayu.id,
      payload: { decision: 'rejected', excerpt: 'sprint padat', days: 3 },
    });
    const page = await listInbox(asPrincipal(w.dodi), { lane: 'info' }, CLOCK.now);
    if (!page.ok) throw new Error('inbox page expected');
    expect(page.items.find((i) => i.ref.id === row.id)).toMatchObject({
      sentence: 'Pengajuan cuti Anda ditolak oleh Ayu',
      button: 'Lihat cuti',
      secondaryButton: null,
    });
  });

  it('is a single card even when decided twice, and obeys the "Kabar terbaru" switch', async () => {
    const { row, facts } = await requested();
    await emitLeaveDecided(db, { ...facts, decision: 'approved', by: w.nico.id });
    await emitLeaveDecided(db, { ...facts, decision: 'approved', by: w.nico.id });
    const [card] = await leaveCards(row.id, 'leave_decided');
    expect(await leaveCards(row.id, 'leave_decided')).toHaveLength(1);
    expect(card.bundleCount).toBeGreaterThanOrEqual(1);

    await db.insert(notificationPref).values({ userId: w.oki.id, category: 'news', inApp: false });
    const other = await seedLeave(w.oki, FACTS.startDate, FACTS.endDate);
    await emitLeaveDecided(db, {
      ...FACTS,
      requestId: other.id,
      requesterId: w.oki.id,
      requesterName: 'Oki',
      decision: 'approved',
      by: w.lea.id,
    });
    expect(await leaveCards(other.id, 'leave_decided')).toEqual([]);
  });
});
