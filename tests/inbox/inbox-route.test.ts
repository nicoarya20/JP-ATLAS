/**
 * The Inbox route and the shell loader against the real database: the loader seeds only the caller's
 * own cards for both lanes, the bell numbers match the list, an anonymous request is refused before
 * any read, and the page revalidates on a path change only (the tab lives in the query string).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { loader, shouldRevalidate } from '../../app/routes/app/inbox';
import { loader as layoutLoader } from '../../app/routes/app/layout';
import { db } from '../../server/db';
import { notification } from '../../server/db/schema';
import { METRICS } from '../../server/metrics/config';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'inboxrt' });
const spies = installAuthSpies();
afterAll(() => cleaner.flushAll());

let mine: TestUser;
let theirs: TestUser;
beforeAll(async () => {
  await cleaner.shared(async () => {
    mine = await f.user();
    theirs = await f.user();
  });
});
afterEach(async () => {
  for (const u of [mine, theirs]) {
    await db.delete(notification).where(eq(notification.recipientId, u.id));
  }
});

async function card(recipient: TestUser, lane: 'action' | 'info', over: { readAt?: Date } = {}) {
  await db.insert(notification).values({
    recipientId: recipient.id,
    actorId: null,
    projectId: null,
    lane,
    kind: lane === 'action' ? 'user_pending' : 'event_changed',
    refType: lane === 'action' ? 'user' : 'event',
    refId: `inboxrt-${crypto.randomUUID()}`,
    dedupeKey: `inboxrt:${crypto.randomUUID()}`,
    payload: { name: 'Ayu', title: 'Rapat mingguan' }, // test-only
    readAt: over.readAt ?? null,
  });
}

const load = (actor: TestUser | null) => {
  spies.as(actor);
  return loader({
    request: new Request('http://x/app/inbox'),
    params: {},
    context: {},
  } as Parameters<typeof loader>[0]);
};

describe('inbox loader', () => {
  it('refuses an anonymous request before reading any card', async () => {
    await card(mine, 'action');
    const err = await load(null).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Response);
  });

  it('seeds both lanes and the bell with the caller’s own cards, in the team zone', async () => {
    await card(mine, 'action');
    await card(mine, 'action');
    await card(mine, 'info');
    await card(mine, 'info', { readAt: new Date() });
    await card(theirs, 'action');
    const { seed, timeZone } = await load(mine);
    expect(timeZone).toBe(METRICS.TIME_ZONE);
    expect(seed.first.action?.items).toHaveLength(2);
    expect(seed.first.info?.items).toHaveLength(2);
    expect(seed.counts).toEqual({ action: 2, infoUnread: 1 });
    // Same number in the tab label, the bell and the list (P5 G-3).
    expect(seed.counts.action).toBe(seed.first.action?.items.length ?? -1);
    expect(seed.first.action?.items.every((i) => i.kind === 'user_pending')).toBe(true);
    expect(seed.loadedAt).toBeGreaterThan(0);
  });

  it('hands the client plain JSON: timestamps are strings, as the REST API sends them', async () => {
    await card(mine, 'action');
    const { seed } = await load(mine);
    expect(typeof seed.first.action?.items[0]?.createdAt).toBe('string');
  });

  it('is empty, not broken, for someone with no cards', async () => {
    const { seed } = await load(theirs);
    expect(seed.first.action).toEqual({ items: [], nextCursor: null });
    expect(seed.counts).toEqual({ action: 0, infoUnread: 0 });
  });
});

describe('shouldRevalidate', () => {
  const at = (path: string) => new URL(`http://x${path}`);
  it('keeps the data when only the tab changes, and reloads on another path', () => {
    expect(
      shouldRevalidate({ currentUrl: at('/app/inbox'), nextUrl: at('/app/inbox?tab=info') }),
    ).toBe(false);
    expect(shouldRevalidate({ currentUrl: at('/app/tasks'), nextUrl: at('/app/inbox') })).toBe(
      true,
    );
  });
});

describe('app shell loader: the bell numbers', () => {
  const shell = (actor: TestUser) => {
    spies.as(actor);
    return layoutLoader({
      request: new Request('http://x/app'),
      params: {},
      context: {},
    } as Parameters<typeof layoutLoader>[0]);
  };

  it('carries the open-card count from the first render, so bell and badge never flash', async () => {
    await card(mine, 'action');
    await card(mine, 'action');
    await card(mine, 'info');
    const data = await shell(mine);
    expect(data.inbox.counts).toEqual({ action: 2, infoUnread: 1 });
    expect(data.inbox.loadedAt).toBeGreaterThan(0);
  });

  it('shows zero for a person with nothing waiting, never someone else’s number', async () => {
    await card(mine, 'action');
    expect((await shell(theirs)).inbox.counts).toEqual({ action: 0, infoUnread: 0 });
  });
});
