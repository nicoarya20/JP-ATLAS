/**
 * P14 §8 R3. CU-06 deleted the `leave_requested` and `leave_decided` kinds, but the rows they wrote
 * are still in the table until the 30-day sweep takes them. The read must treat them as cards of a
 * kind this build does not know — plain news, no sentence of its own, no button, no crash — which
 * `app/lib/inbox-view.ts` only promises in a docstring. These cases are the proof, driven through
 * the real read so nothing but the stored row is faked.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { notification } from '../../server/db/schema';
import {
  inboxActionCount,
  inboxCounts,
  listInbox,
} from '../../server/notification/notification.query';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'inboxold' });
afterAll(() => cleaner.flushAll());

// 10:00 Jakarta on 18 Oct, the same unambiguous "today" the other Inbox read tests use.
const NOW = new Date('2026-10-18T03:00:00Z');
const DAY_MS = 86_400_000;

let owner: TestUser;
let admin: TestUser;

const principal = (u: TestUser): Principal => ({
  id: u.id,
  appRole: u.role,
  impersonating: false,
});

type RowInput = {
  kind: string;
  lane?: 'action' | 'info';
  at?: Date;
  resolvedAt?: Date | null;
  payload?: Record<string, unknown>;
};

/** One leave card straight into the table: these cases are about reading a row, not about emitting it. */
async function row(input: RowInput): Promise<string> {
  const at = input.at ?? NOW;
  const [written] = await db
    .insert(notification)
    .values({
      recipientId: owner.id,
      actorId: admin.id,
      // A leave card never belongs to a project, exactly as the old emit helper wrote it.
      projectId: null,
      lane: input.lane ?? 'action',
      kind: input.kind,
      refType: 'leave',
      refId: `inboxold-leave-${crypto.randomUUID()}`,
      dedupeKey: `inboxold:${crypto.randomUUID()}`,
      payload: input.payload ?? {},
      bundleCount: 1,
      readAt: null,
      resolvedAt: input.resolvedAt ?? null,
      resolvedReason: input.resolvedAt ? 'acted' : null,
      createdAt: at,
      updatedAt: at,
    })
    .returning({ id: notification.id });
  return written.id;
}

/** A `leave_requested` row exactly as the retired emit helper wrote it, `dueTasks` and all. */
const oldRequest = (over: Partial<RowInput> = {}) =>
  row({
    kind: 'leave_requested',
    payload: {
      name: 'Dodi', // test-only
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      days: 3,
      dueTasks: 2,
    },
    ...over,
  });

/** A `leave_decided` row, including the reject reason the old flow stored as an excerpt. */
const oldDecision = () =>
  row({
    kind: 'leave_decided',
    lane: 'info',
    payload: {
      name: 'Dodi', // test-only
      startDate: '2026-10-14',
      endDate: '2026-10-14',
      days: 1,
      decision: 'rejected',
      excerpt: 'Tenggat proyek', // test-only
    },
  });

const lane = async (which: 'action' | 'info') => {
  const page = await listInbox(principal(owner), { lane: which }, NOW);
  if (!page.ok) throw new Error(`expected a page, got ${page.code}`);
  return page.items;
};

beforeAll(async () => {
  await cleaner.shared(async () => {
    owner = await f.user();
    admin = await f.user({ role: 'admin' });
  });
});

// Each case counts rows, so the Inbox starts empty.
beforeEach(async () => {
  await db.delete(notification).where(eq(notification.recipientId, owner.id));
});

describe('rows of the retired leave approval flow', () => {
  it('reads an old request row as a card with no sentence and no button, not as a failure', async () => {
    const id = await oldRequest();

    const [item] = await lane('action');

    expect(item.id).toBe(id);
    expect(item.kind).toBe('leave_requested');
    expect(item.sentence).toBeNull();
    expect(item.button).toBeNull();
    // The ref still maps, so even a buttonless card points somewhere sane rather than nowhere.
    expect(item.href).toBe('/app/settings');
    // The payload comes back untouched: the client decides what of it still means anything.
    expect(item.payload).toMatchObject({ startDate: '2026-10-14', dueTasks: 2 });
  });

  it('reads an old decision row the same way, keeping its reject reason in the payload', async () => {
    await oldDecision();

    const [item] = await lane('info');

    expect(item.kind).toBe('leave_decided');
    expect(item.sentence).toBeNull();
    expect(item.button).toBeNull();
    expect(item.payload).toMatchObject({ decision: 'rejected', excerpt: 'Tenggat proyek' });
  });

  it('survives an old row whose payload is empty or holds the wrong types', async () => {
    await oldRequest({ payload: {} });
    await oldRequest({ payload: { startDate: 5, days: 'tiga', decision: {} } }); // test-only

    const items = await lane('action');

    expect(items).toHaveLength(2);
    expect(items.map((i) => i.sentence)).toEqual([null, null]);
    expect(items.map((i) => i.button)).toEqual([null, null]);
  });

  it('never reads the old `decision` field as the outcome word of a kind it does know', async () => {
    // A row of the new kind carrying a stale `decision` as well: only `change` may fill {outcome},
    // so the sentence says "dicatat" and the old wording cannot reappear through the back door.
    await row({
      kind: 'leave_recorded',
      lane: 'info',
      payload: {
        startDate: '2026-10-14',
        endDate: '2026-10-16',
        days: 3,
        change: 'set',
        decision: 'approved',
      },
    });

    expect((await lane('info'))[0]?.sentence).toBe(`Cuti Anda dicatat oleh ${admin.name}`);
  });

  it('keeps counting and grouping an old row like any other card of its lane', async () => {
    await oldRequest({ at: new Date(NOW.getTime() - DAY_MS) });
    await oldDecision();
    const recorded = await row({
      kind: 'leave_recorded',
      lane: 'info',
      payload: { startDate: '2026-10-14', endDate: '2026-10-16', days: 3, change: 'set' },
    });

    // The old request is open work, so the "Perlu Anda tanggapi" number still counts it; the two
    // news cards are unread news. A card nobody can act on is better counted than hidden.
    expect(await inboxCounts(principal(owner))).toEqual({ action: 1, infoUnread: 2 });
    expect((await lane('action')).map((i) => i.group)).toEqual(['yesterday']);

    // And the new kind in the same lane is unaffected: it keeps its own sentence and button.
    expect((await lane('info')).find((i) => i.id === recorded)).toMatchObject({
      sentence: `Cuti Anda dicatat oleh ${admin.name}`,
      button: 'Lihat ketersediaan',
      href: '/app/settings',
    });
  });

  it('lets an old request row leave the work queue once it is resolved', async () => {
    await oldRequest({ resolvedAt: NOW });

    expect(await lane('action')).toEqual([]);
    expect(await inboxActionCount(principal(owner))).toBe(0);
  });
});
