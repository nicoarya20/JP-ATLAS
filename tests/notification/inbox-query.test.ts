/**
 * Inbox reads (S3 I04, P5 §5.4): keyset paging per lane, the server-side day groups, the defensive
 * project filter, the bell counts and the two "mark read" writes — all scoped to the caller in SQL.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { notification, projectMember } from '../../server/db/schema';
import { METRICS } from '../../server/metrics/config';
import {
  inboxActionCount,
  inboxCounts,
  listInbox,
  markAllRead,
  markRead,
} from '../../server/notification/notification.query';
import { PAGE_LIMIT_DEFAULT, PAGE_LIMIT_MAX } from '../../server/pm/limits';
import { createCleaner } from '../support/cleanup';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'inboxq' });
afterAll(() => cleaner.flushAll());

// 10:00 Jakarta on 18 Oct: far enough from midnight that "today" is unambiguous in METRICS.TIME_ZONE.
const NOW = new Date('2026-10-18T03:00:00Z');
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

let owner: TestUser;
let other: TestUser;
let admin: TestUser;
let project: TestProject;

const principal = (u: TestUser): Principal => ({
  id: u.id,
  appRole: u.role,
  impersonating: false,
});

type CardInput = {
  recipient?: TestUser;
  lane?: 'action' | 'info';
  kind?: string;
  at?: Date;
  updatedAt?: Date;
  readAt?: Date | null;
  resolvedAt?: Date | null;
  projectId?: string | null;
  refType?: 'task' | 'project' | 'user';
  refId?: string;
  payload?: Record<string, unknown>;
  bundleCount?: number;
  actor?: TestUser | null;
};

/** One card straight into the table: these tests are about reading, not about `notify()`. */
async function card(input: CardInput = {}): Promise<string> {
  const at = input.at ?? NOW;
  const [row] = await db
    .insert(notification)
    .values({
      recipientId: (input.recipient ?? owner).id,
      actorId: input.actor === undefined ? other.id : (input.actor?.id ?? null),
      projectId: input.projectId === undefined ? project.id : input.projectId,
      lane: input.lane ?? 'action',
      kind: input.kind ?? (input.lane === 'info' ? 'task_commented' : 'task_assigned'),
      refType: input.refType ?? 'task',
      refId: input.refId ?? `inboxq-task-${crypto.randomUUID()}`,
      dedupeKey: `inboxq:${crypto.randomUUID()}`,
      payload: input.payload ?? { title: 'Cek ukuran lemari dapur', number: 14 }, // test-only
      bundleCount: input.bundleCount ?? 1,
      readAt: input.readAt ?? null,
      resolvedAt: input.resolvedAt ?? null,
      resolvedReason: input.resolvedAt ? 'acted' : null,
      createdAt: at,
      updatedAt: input.updatedAt ?? at,
    })
    .returning({ id: notification.id });
  return row.id;
}

/** `n` action cards one minute apart, newest last in the returned array. */
async function cards(n: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) ids.push(await card({ at: new Date(NOW.getTime() - i * 60_000) }));
  return ids;
}

const listAction = async (u: TestUser, input: Parameters<typeof listInbox>[1] | null = null) => {
  const r = await listInbox(principal(u), input ?? { lane: 'action' }, NOW);
  if (!r.ok) throw new Error(`expected a page, got ${r.code}`);
  return r;
};

beforeAll(async () => {
  await cleaner.shared(async () => {
    owner = await f.user();
    other = await f.user();
    admin = await f.user({ role: 'admin' });
    project = await f.project({ lead: other, members: [[owner, 'member']] });
  });
});

// Each test counts rows, so every account starts with an empty Inbox.
beforeEach(async () => {
  for (const person of [owner, other, admin]) {
    await db.delete(notification).where(eq(notification.recipientId, person.id));
  }
});

describe('listInbox', () => {
  it('returns only the caller’s open action cards, newest first', async () => {
    const ids = await cards(3);
    await card({ resolvedAt: NOW }); // already handled: out of the work queue
    await card({ recipient: other }); // somebody else's card

    const { items, nextCursor } = await listAction(owner);

    expect(items.map((i) => i.id)).toEqual(ids);
    expect(nextCursor).toBeNull();
  });

  it('builds the card the UI renders: actor, ref, copy, href and read flag', async () => {
    await card({ payload: { title: 'Pesan keramik lantai', number: 42 }, bundleCount: 1 }); // test-only

    const [item] = (await listAction(owner)).items;

    expect(item).toMatchObject({
      kind: 'task_assigned',
      lane: 'action',
      ref: { type: 'task', id: expect.any(String), number: 42 },
      bundleCount: 1,
      read: false,
      group: 'today',
      href: '/app/tasks/42',
      button: 'Lihat tugas',
    });
    expect(item.actor).toMatchObject({ id: other.id, name: other.name });
    expect(item.sentence).toBe(`${other.name} menunjuk Anda mengerjakan #42`);
    expect(item.createdAt).toBe(NOW.toISOString());
  });

  it('leaves an unknown kind readable instead of failing', async () => {
    await card({ kind: 'task_teleported' });

    const [item] = (await listAction(owner)).items;

    expect(item.kind).toBe('task_teleported');
    expect(item.sentence).toBeNull();
    expect(item.button).toBeNull();
  });

  it('names no actor for a system card', async () => {
    await card({ actor: null });

    const [item] = (await listAction(owner)).items;

    expect(item.actor).toBeNull();
    expect(item.sentence).toBe('Anda ditunjuk mengerjakan #14');
  });

  it('groups by the team day: today, yesterday, older', async () => {
    await card({ at: NOW });
    await card({ at: new Date(NOW.getTime() - DAY_MS) });
    await card({ at: new Date(NOW.getTime() - 5 * DAY_MS) });

    const groups = (await listAction(owner)).items.map((i) => i.group);

    expect(groups).toEqual(['today', 'yesterday', 'older']);
    // The zone is the team's, not the host's: the same instants in UTC could fall on another date.
    expect(METRICS.TIME_ZONE).toBe('Asia/Jakarta');
  });

  it('walks three keyset pages without a repeat or a gap', async () => {
    const ids = await cards(7);

    const seen: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 3; page++) {
      const r = await listAction(owner, { lane: 'action', limit: 3, cursor });
      seen.push(...r.items.map((i) => i.id));
      expect(r.items.length).toBe(page === 2 ? 1 : 3);
      cursor = r.nextCursor ?? undefined;
      // The last page must not hand out another cursor, or the client would loop forever.
      expect(cursor === undefined).toBe(page === 2);
    }
    expect(seen).toEqual(ids);
    expect(new Set(seen).size).toBe(ids.length);
  });

  it('clamps the limit to the page maximum and refuses a broken cursor', async () => {
    await cards(2);

    const wide = await listAction(owner, { lane: 'action', limit: PAGE_LIMIT_MAX + 500 });
    expect(wide.items).toHaveLength(2);
    const tiny = await listAction(owner, { lane: 'action', limit: 0 });
    expect(tiny.items).toHaveLength(1);

    const broken = await listInbox(
      principal(owner),
      { lane: 'action', cursor: 'not-a-cursor' },
      NOW,
    );
    expect(broken).toEqual({ ok: false, code: 'BAD_CURSOR' });
  });

  it('defaults to the shared page size', async () => {
    const r = await listAction(owner);
    expect(PAGE_LIMIT_DEFAULT).toBeGreaterThan(0);
    expect(r.items.length).toBeLessThanOrEqual(PAGE_LIMIT_DEFAULT);
  });

  it('hides a project card from someone who is no longer a member, but not from an Admin', async () => {
    const id = await card();
    expect((await listAction(owner)).items.map((i) => i.id)).toEqual([id]);

    await db.delete(projectMember).where(eq(projectMember.userId, owner.id));

    expect((await listAction(owner)).items).toEqual([]);
    // An account card belongs to no project, so losing a membership cannot hide it.
    const accountCard = await card({ projectId: null, refType: 'user', refId: owner.id });
    expect((await listAction(owner)).items.map((i) => i.id)).toEqual([accountCard]);

    await db
      .insert(projectMember)
      .values({ projectId: project.id, userId: owner.id, role: 'member' });
    const adminCard = await card({ recipient: admin });
    expect((await listAction(admin)).items.map((i) => i.id)).toEqual([adminCard]);
  });

  it('orders the news lane by its bundle time and reports the bundle size', async () => {
    const older = await card({ lane: 'info', at: new Date(NOW.getTime() - 2 * HOUR_MS) });
    const bundled = await card({
      lane: 'info',
      at: new Date(NOW.getTime() - 3 * HOUR_MS),
      updatedAt: NOW,
      bundleCount: 5,
      payload: { title: 'Cek ukuran lemari dapur', number: 12 }, // test-only
    });
    await card({ lane: 'action' }); // the work queue is a separate lane

    const { items } = await listAction(owner, { lane: 'info' });

    expect(items.map((i) => i.id)).toEqual([bundled, older]);
    expect(items[0]).toMatchObject({ bundleCount: 5, group: 'today' });
    expect(items[0].sentence).toBe('5 komentar baru di #12');
  });
});

describe('counts', () => {
  it('counts exactly what the action list returns (bell = badge = list)', async () => {
    await cards(4);
    await card({ resolvedAt: NOW });
    await card({ lane: 'info' });
    await card({ recipient: other });

    const list = await listAction(owner, { lane: 'action', limit: PAGE_LIMIT_MAX });

    expect(await inboxActionCount(principal(owner))).toBe(list.items.length);
    expect(await inboxActionCount(principal(owner))).toBe(4);
  });

  it('counts unread news separately and ignores read ones', async () => {
    await cards(2);
    await card({ lane: 'info' });
    await card({ lane: 'info', readAt: NOW });

    expect(await inboxCounts(principal(owner))).toEqual({ action: 2, infoUnread: 1 });
  });

  it('drops the cards of a project the caller left, so the badge cannot outlive access', async () => {
    await cards(3);
    await db.delete(projectMember).where(eq(projectMember.userId, owner.id));

    expect(await inboxActionCount(principal(owner))).toBe(0);

    await db
      .insert(projectMember)
      .values({ projectId: project.id, userId: owner.id, role: 'member' });
    expect(await inboxActionCount(principal(owner))).toBe(3);
  });
});

describe('markRead / markAllRead', () => {
  it('marks one card read, keeps the first read time and never moves it in the list', async () => {
    const id = await card({ lane: 'info' });

    expect(await markRead(principal(owner), id)).toBe(true);
    const [first] = await db.select().from(notification).where(eq(notification.id, id));
    expect(first.readAt).not.toBeNull();
    expect(first.updatedAt).toEqual(NOW);

    expect(await markRead(principal(owner), id)).toBe(true);
    const [again] = await db.select().from(notification).where(eq(notification.id, id));
    expect(again.readAt).toEqual(first.readAt);
    expect(again.updatedAt).toEqual(NOW);
  });

  it('refuses a card of someone else and an id that does not exist, the same way', async () => {
    const theirs = await card({ recipient: other });

    expect(await markRead(principal(owner), theirs)).toBe(false);
    expect(await markRead(principal(owner), 'inboxq-no-such-card')).toBe(false);
    const [untouched] = await db.select().from(notification).where(eq(notification.id, theirs));
    expect(untouched.readAt).toBeNull();
  });

  it('marks every unread news card read and leaves the work queue alone', async () => {
    await card({ lane: 'info' });
    await card({ lane: 'info' });
    await card({ lane: 'info', readAt: NOW });
    const work = await card({ lane: 'action' });
    await card({ lane: 'info', recipient: other });

    expect(await markAllRead(principal(owner))).toBe(2);
    expect(await markAllRead(principal(owner))).toBe(0);

    expect((await inboxCounts(principal(owner))).infoUnread).toBe(0);
    const [action] = await db.select().from(notification).where(eq(notification.id, work));
    expect(action.readAt).toBeNull();
    const [mine] = await db
      .select()
      .from(notification)
      .where(eq(notification.recipientId, other.id));
    expect(mine.readAt).toBeNull();
  });
});

describe('cost', () => {
  it('serves 20 cards with one query, and the counts with two', async () => {
    await cards(20);
    const list = countQueries();

    const page = await listInbox(principal(owner), { lane: 'action', limit: 20 }, NOW, list.exec);

    expect(page.ok && page.items).toHaveLength(20);
    expect(list.queries.length).toBeLessThanOrEqual(3);
    expect(list.queries).toHaveLength(1);

    const counts = countQueries();
    await inboxCounts(principal(owner), counts.exec);
    expect(counts.queries).toHaveLength(2);
  });
});
