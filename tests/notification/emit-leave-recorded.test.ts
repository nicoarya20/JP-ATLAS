/**
 * The `leave_recorded` card (P14 D5): the one piece of news the recorded-leave flow sends. Driven
 * through the emit helper and the Inbox read, so what is asserted is the line the person sees — a
 * status an Admin changes for them must not change silently.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { notification } from '../../server/db/schema';
import { emitLeaveRecorded } from '../../server/notification/emit.leave.recorded';
import { inboxActionCount, listInbox } from '../../server/notification/notification.query';
import type { Role } from '../../server/permissions';
import { CLOCK, type LeaveWorld, leaveWorld, seedLeave } from '../leave/leave.world';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'emitleaverec' });
let w: LeaveWorld;
beforeEach(async () => {
  w = await leaveWorld(f);
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const asPrincipal = (u: Pick<TestUser, 'id' | 'role'>): Principal => ({
  id: u.id,
  appRole: u.role as Role,
  impersonating: false,
});

const cards = (refId: string) =>
  db
    .select()
    .from(notification)
    .where(and(eq(notification.refType, 'leave'), eq(notification.refId, refId)));

/** One recorded period of Dodi plus the card Ayu's write would send. */
async function recorded(change: 'set' | 'cleared' = 'set') {
  const row = await seedLeave(w.dodi, '2026-10-14', '2026-10-16');
  await emitLeaveRecorded(db, {
    periodId: row.id,
    userId: w.dodi.id,
    startDate: '2026-10-14',
    endDate: '2026-10-16',
    days: 3,
    by: w.ayu.id,
    change,
    at: CLOCK.now,
  });
  return row;
}

/** Dodi's news lane, as the Inbox renders it. */
async function newsOf(refId: string) {
  const page = await listInbox(asPrincipal(w.dodi), { lane: 'info' }, CLOCK.now);
  if (!page.ok) throw new Error('inbox page expected');
  return page.items.find((i) => i.ref.id === refId);
}

describe('leave_recorded', () => {
  it('tells the person what was recorded, with one button to Pengaturan', async () => {
    const row = await recorded();
    expect(await newsOf(row.id)).toMatchObject({
      kind: 'leave_recorded',
      sentence: 'Cuti Anda dicatat oleh Ayu',
      button: 'Lihat ketersediaan',
      secondaryButton: null,
      href: '/app/settings',
      actor: { id: w.ayu.id, name: 'Ayu' },
    });
  });

  it('says "diakhiri" when the leave under way was ended', async () => {
    const row = await recorded('cleared');
    expect((await newsOf(row.id))?.sentence).toBe('Cuti Anda diakhiri oleh Ayu');
  });

  it('is news, so it never adds to the work the bell counts', async () => {
    const before = await inboxActionCount(asPrincipal(w.dodi));
    const row = await recorded();
    expect(await inboxActionCount(asPrincipal(w.dodi))).toBe(before);
    const [card] = await cards(row.id);
    expect(card).toMatchObject({ lane: 'info', recipientId: w.dodi.id, resolvedAt: null });
  });

  it('keeps the record and the ending apart instead of bundling them into one line', async () => {
    const row = await recorded();
    await emitLeaveRecorded(db, {
      periodId: row.id,
      userId: w.dodi.id,
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      days: 3,
      by: w.ayu.id,
      change: 'cleared',
      at: CLOCK.now,
    });
    const written = await cards(row.id);
    expect(written).toHaveLength(2);
    expect(written.map((c) => c.bundleCount)).toEqual([1, 1]);
  });

  it('sends nothing when an Admin records their own leave', async () => {
    const row = await seedLeave(w.ayu, '2026-10-14', '2026-10-16');
    await emitLeaveRecorded(db, {
      periodId: row.id,
      userId: w.ayu.id,
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      days: 3,
      by: w.ayu.id,
      change: 'set',
      at: CLOCK.now,
    });
    expect(await cards(row.id)).toEqual([]);
  });

  it('stores exactly the four payload fields, so nothing can ride along into a card', async () => {
    const row = await recorded();
    const [card] = await cards(row.id);
    expect(card?.payload).toEqual({
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      days: 3,
      change: 'set',
    });
  });
});
