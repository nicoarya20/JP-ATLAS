/**
 * Inbox API (S3 I04, P5 §5.4) through the real router: the 401 gate, "only your own cards",
 * the keyset page, the bell contract (count = list length), and the rate-limit exemption of
 * `/inbox/count` next to a `/app/tasks` that is still limited.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { notification, projectMember } from '../../server/db/schema';
import { rateLimiter } from '../../server/rate-limit';
import { call, expectApiError, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'inboxapi' });

beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
});
afterEach(async () => {
  await db.delete(notification).where(eq(notification.recipientId, mine.id));
  await db.delete(notification).where(eq(notification.recipientId, theirs.id));
  await cleaner.flushTest();
});
afterAll(() => cleaner.flushAll());

type Item = { id: string; kind: string; read: boolean; group: string; href: string };

let mine: TestUser;
let theirs: TestUser;
let project: TestProject;

/** One card for `recipient`; `at` moves it in the keyset order. */
async function card(
  recipient: TestUser,
  over: Partial<{
    lane: 'action' | 'info';
    at: Date;
    projectId: string | null;
    readAt: Date | null;
  }> = {},
) {
  const at = over.at ?? new Date();
  const [row] = await db
    .insert(notification)
    .values({
      recipientId: recipient.id,
      actorId: theirs.id === recipient.id ? mine.id : theirs.id,
      projectId: over.projectId === undefined ? project.id : over.projectId,
      lane: over.lane ?? 'action',
      kind: over.lane === 'info' ? 'task_commented' : 'task_assigned',
      refType: 'task',
      refId: `inboxapi-task-${crypto.randomUUID()}`,
      dedupeKey: `inboxapi:${crypto.randomUUID()}`,
      payload: { title: 'Cek ukuran lemari dapur', number: 14 }, // test-only
      readAt: over.readAt ?? null,
      createdAt: at,
      updatedAt: at,
    })
    .returning({ id: notification.id });
  return row.id;
}

// Shared team: one account that owns the cards, one that must never see them.
beforeAll(async () => {
  await cleaner.shared(async () => {
    mine = await f.user();
    theirs = await f.user();
    project = await f.project({
      lead: theirs,
      members: [
        [mine, 'member'],
        [theirs, 'manager'],
      ],
    });
  });
});

describe('the gate', () => {
  it('answers 401 (not 422) to an anonymous caller on every route', async () => {
    for (const [method, path] of [
      ['GET', '/app/inbox'],
      ['GET', '/app/inbox/count'],
      ['POST', '/app/inbox/x/read'],
      ['POST', '/app/inbox/read-all'],
    ] as const) {
      const res = await call(method, path);
      expectApiError(res, 401, 'UNAUTHORIZED');
    }
  });

  it('refuses a lane it does not know with the uniform validation error', async () => {
    auth.as(mine);
    const res = await call('GET', '/app/inbox?lane=gossip');
    expect(res.status).toBe(422);
    expect(typeof res.body.requestId).toBe('string');
  });
});

describe('GET /app/inbox', () => {
  it('returns only the caller’s cards and ignores a userId in the query', async () => {
    const own = await card(mine);
    await card(theirs);

    auth.as(mine);
    const res = await call('GET', `/app/inbox?userId=${theirs.id}`);

    expect(res.status).toBe(200);
    expect((res.body.items as Item[]).map((i) => i.id)).toEqual([own]);
  });

  it('pages with the cursor and clamps an absurd limit', async () => {
    const now = Date.now();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) ids.push(await card(mine, { at: new Date(now - i * 60_000) }));

    auth.as(mine);
    const first = await call('GET', '/app/inbox?limit=2');
    expect((first.body.items as Item[]).map((i) => i.id)).toEqual(ids.slice(0, 2));
    expect(first.body.nextCursor).toBeTruthy();

    const second = await call(
      'GET',
      `/app/inbox?limit=2&cursor=${encodeURIComponent(first.body.nextCursor as string)}`,
    );
    expect((second.body.items as Item[]).map((i) => i.id)).toEqual([ids[2]]);
    expect(second.body.nextCursor).toBeNull();

    // Over PAGE_LIMIT_MAX the schema refuses the value rather than silently serving everything.
    expect((await call('GET', '/app/inbox?limit=5000')).status).toBe(422);
  });

  it('answers 400 BAD_CURSOR for a cursor it did not make', async () => {
    auth.as(mine);
    const res = await call('GET', '/app/inbox?cursor=bukan-kursor');
    expectApiError(res, 400, 'BAD_CURSOR');
  });

  it('hides the cards of a project the caller was removed from', async () => {
    await card(mine);
    auth.as(mine);
    expect((await call('GET', '/app/inbox')).body.items).toHaveLength(1);

    await db.delete(projectMember).where(eq(projectMember.userId, mine.id));

    expect((await call('GET', '/app/inbox')).body.items).toHaveLength(0);
    expect((await call('GET', '/app/inbox/count')).body).toMatchObject({ action: 0 });

    // The membership is shared file data, so this test puts it back for the ones after it.
    await db
      .insert(projectMember)
      .values({ projectId: project.id, userId: mine.id, role: 'member' });
  });
});

describe('GET /app/inbox/count', () => {
  it('is the length of the action list (bell = badge = list)', async () => {
    for (let i = 0; i < 3; i++) await card(mine, { at: new Date(Date.now() - i * 60_000) });
    await card(mine, { lane: 'info' });

    auth.as(mine);
    const list = await call('GET', '/app/inbox?lane=action&limit=100');
    const count = await call('GET', '/app/inbox/count');

    expect(count.body).toEqual({ action: (list.body.items as Item[]).length, infoUnread: 1 });
    expect(count.body.action).toBe(3);
  });

  it('is not rate limited, while /app/tasks still is', async () => {
    const original = { ...rateLimiter.config };
    // A tiny limit makes the point in a few requests; the exemption is what is under test.
    rateLimiter.configure({ limit: 5 });
    try {
      auth.as(mine);
      const limited: number[] = [];
      for (let i = 0; i < 200; i++) {
        const res = await call('GET', '/app/inbox/count');
        if (res.status !== 200) limited.push(i + 1);
      }
      expect(limited).toEqual([]);
      // Same client, same window: an ordinary app route is still capped.
      const statuses: number[] = [];
      for (let i = 0; i < 8; i++) statuses.push((await call('GET', '/app/tasks')).status);
      expect(statuses).toContain(429);
    } finally {
      rateLimiter.configure(original);
      resetApiLimiters();
    }
  });
});

describe('POST /app/inbox/:id/read and /read-all', () => {
  it('marks the caller’s card read, twice without complaining', async () => {
    const id = await card(mine, { lane: 'info' });

    auth.as(mine);
    expect((await call('POST', `/app/inbox/${id}/read`)).status).toBe(200);
    expect((await call('POST', `/app/inbox/${id}/read`)).status).toBe(200);

    const items = (await call('GET', '/app/inbox?lane=info')).body.items as Item[];
    expect(items[0].read).toBe(true);
    expect((await call('GET', '/app/inbox/count')).body.infoUnread).toBe(0);
  });

  it('answers 404 for someone else’s card, exactly like a missing id', async () => {
    const other = await card(theirs, { lane: 'info' });

    auth.as(mine);
    const foreign = await call('POST', `/app/inbox/${other}/read`);
    const missing = await call('POST', '/app/inbox/inboxapi-no-such-card/read');

    expectApiError(foreign, 404, 'NOT_FOUND');
    expectApiError(missing, 404, 'NOT_FOUND');
    expect(foreign.body.error).toBe(missing.body.error);
    const [untouched] = await db.select().from(notification).where(eq(notification.id, other));
    expect(untouched.readAt).toBeNull();
  });

  it('read-all clears the news dots of the caller only', async () => {
    await card(mine, { lane: 'info' });
    await card(mine, { lane: 'info' });
    await card(mine);
    await card(theirs, { lane: 'info' });

    auth.as(mine);
    expect((await call('POST', '/app/inbox/read-all')).body).toEqual({ updated: 2 });
    expect((await call('POST', '/app/inbox/read-all')).body).toEqual({ updated: 0 });

    const counts = (await call('GET', '/app/inbox/count')).body;
    expect(counts).toEqual({ action: 1, infoUnread: 0 });
    const [mineNot] = await db
      .select()
      .from(notification)
      .where(eq(notification.recipientId, theirs.id));
    expect(mineNot.readAt).toBeNull();
  });
});
