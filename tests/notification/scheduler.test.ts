/**
 * Daily purge of old Inbox cards (S3 I11, P5 §6 I11): age is measured against an injected clock,
 * an open action card is never deleted, a second tick is harmless, and the job is not installed
 * while tests run.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../server/db';
import { notification } from '../../server/db/schema';
import { logger } from '../../server/logger';
import { NOTIF_RETENTION_DAYS } from '../../server/notification/notification.catalog';
import {
  purgeOldNotifications,
  runNotificationPurge,
  startNotificationPurgeScheduler,
} from '../../server/notification/notification.scheduler';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'notifpurge' });
afterAll(() => cleaner.flushAll());

const DAY_MS = 86_400_000;
const NOW = new Date('2026-10-18T12:00:00Z').getTime();
const daysAgo = (days: number) => new Date(NOW - days * DAY_MS);
const OLD = daysAgo(NOTIF_RETENTION_DAYS + 1);
const RECENT = daysAgo(NOTIF_RETENTION_DAYS - 1);

let owner: TestUser;

type CardInput = {
  lane: 'action' | 'info';
  createdAt: Date;
  resolvedAt?: Date | null;
};

/** One card straight into the table; the sweep is about age and lane, not about `notify()`. */
async function card(input: CardInput): Promise<string> {
  const [row] = await db
    .insert(notification)
    .values({
      recipientId: owner.id,
      lane: input.lane,
      kind: input.lane === 'action' ? 'task_assigned' : 'task_commented',
      refType: 'task',
      refId: `notifpurge-${crypto.randomUUID()}`,
      dedupeKey: `purge:${crypto.randomUUID()}`,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      resolvedAt: input.resolvedAt ?? null,
      resolvedReason: input.resolvedAt ? 'acted' : null,
    })
    .returning({ id: notification.id });
  return row.id;
}

const survivors = async (ids: string[]) =>
  (await db.select({ id: notification.id }).from(notification).where(inArray(notification.id, ids)))
    .map((row) => row.id)
    .sort();

beforeAll(async () => {
  await cleaner.shared(async () => {
    owner = await f.user();
  });
});

// Every test counts its own rows, so the owner starts each one with an empty Inbox.
beforeEach(async () => {
  await db.delete(notification).where(eq(notification.recipientId, owner.id));
});

describe('purgeOldNotifications', () => {
  it('drops cards past the window and keeps the ones inside it', async () => {
    const oldNews = await card({ lane: 'info', createdAt: OLD });
    const freshNews = await card({ lane: 'info', createdAt: RECENT });
    const oldResolved = await card({ lane: 'action', createdAt: OLD, resolvedAt: daysAgo(30) });
    const freshResolved = await card({
      lane: 'action',
      createdAt: RECENT,
      resolvedAt: daysAgo(1),
    });

    expect(await purgeOldNotifications(NOW)).toBe(2);
    expect(await survivors([oldNews, freshNews, oldResolved, freshResolved])).toEqual(
      [freshNews, freshResolved].sort(),
    );
  });

  it('never deletes an action card that is still open, however old it is', async () => {
    const stillOpen = await card({ lane: 'action', createdAt: daysAgo(400) });

    expect(await purgeOldNotifications(NOW)).toBe(0);
    expect(await survivors([stillOpen])).toEqual([stillOpen]);
  });

  it('is idempotent: a second run finds nothing left to delete', async () => {
    await card({ lane: 'info', createdAt: OLD });

    expect(await purgeOldNotifications(NOW)).toBe(1);
    expect(await purgeOldNotifications(NOW)).toBe(0);
  });

  it('clears a backlog larger than one batch', async () => {
    // 505 rows: the loop has to come back for the remainder after the first DELETE of 500.
    const rows = Array.from({ length: 505 }, () => ({
      recipientId: owner.id,
      lane: 'info' as const,
      kind: 'task_commented',
      refType: 'task' as const,
      refId: `notifpurge-${crypto.randomUUID()}`,
      dedupeKey: `purge-bulk:${crypto.randomUUID()}`,
      createdAt: OLD,
      updatedAt: OLD,
    }));
    await db.insert(notification).values(rows);

    expect(await purgeOldNotifications(NOW)).toBe(505);
  });
});

describe('runNotificationPurge', () => {
  it('logs the count only, with no recipient or title', async () => {
    await card({ lane: 'info', createdAt: OLD });
    const info = spyOn(logger, 'info');

    expect(await runNotificationPurge(NOW)).toBe(1);

    const [payload, message] = info.mock.calls.at(-1) as [Record<string, unknown>, string];
    info.mockRestore();
    expect(message).toBe('inbox cards purged');
    expect(Object.keys(payload)).toEqual(['deleted']);
    expect(payload.deleted).toBe(1);
  });

  it('says nothing when there was nothing to purge', async () => {
    const info = spyOn(logger, 'info');

    expect(await runNotificationPurge(NOW)).toBe(0);

    const quiet = info.mock.calls.every(([, message]) => message !== 'inbox cards purged');
    info.mockRestore();
    expect(quiet).toBe(true);
  });
});

describe('startNotificationPurgeScheduler', () => {
  const timer = { unref() {} } as unknown as ReturnType<typeof setTimeout>;

  it('checks hourly, runs at most once a day, and ignores a second start', () => {
    let intervalMs = 0;
    let starts = 0;
    const t = spyOn(globalThis, 'setTimeout').mockImplementation((() => {
      starts++;
      return timer;
    }) as unknown as typeof setTimeout);
    const i = spyOn(globalThis, 'setInterval').mockImplementation(((_: unknown, ms: number) => {
      intervalMs = ms;
      return timer;
    }) as unknown as typeof setInterval);

    startNotificationPurgeScheduler();
    startNotificationPurgeScheduler();

    t.mockRestore();
    i.mockRestore();
    expect(intervalMs).toBe(60 * 60_000);
    // One boot run, from the first call only.
    expect(starts).toBe(1);
  });

  it('is only installed outside tests', () => {
    const source = readFileSync(path.join(import.meta.dir, '../../server/api/index.ts'), 'utf8');
    const guard = source.indexOf("if (process.env.NODE_ENV !== 'test') {");
    const call = source.indexOf('startNotificationPurgeScheduler();', guard);
    expect(guard).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(guard);
    // Inside the guarded block: no closing brace between the guard and the call.
    expect(source.slice(guard, call)).not.toContain('\n}');
  });
});
