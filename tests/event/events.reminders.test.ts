/**
 * The reminder tick (S7 E-04): a day before and half an hour before, once per slot, with "now"
 * injected so a meeting can be walked through its timeline without waiting.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, spyOn } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { and, eq, inArray } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import {
  event,
  eventReminder,
  notification,
  notificationPref,
  project as projectTable,
} from '../../server/db/schema';
import {
  EVENT_REMINDER_GRACE_MS,
  EVENT_REMINDER_TICK_MS,
  runReminderTick,
  selectDueReminders,
  startEventReminderScheduler,
} from '../../server/event/events.reminders';
import { cancelEvent, updateEvent } from '../../server/event/events.service';
import { notify } from '../../server/notification/notification.notify';
import { toPrincipal } from '../../server/project/membership.query';
import { createCleaner } from '../support/cleanup';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { createEventFactory, type EventInput } from './factory.event';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'erem' });
// The events start days from the real clock on purpose: nothing here may depend on the wall time.
const T = new Date('2030-03-12T03:00:00Z'); // test-only
const perTest = createEventFactory({ tag: 'erem-t', now: () => T });
afterEach(() => perTest.flush());
afterAll(async () => {
  await perTest.flush();
  await cleaner.flushAll();
});

const MIN = 60_000;
const before = (min: number, start: Date = T) => new Date(start.getTime() - min * MIN);
const as = (u: TestUser): Principal => toPrincipal({ user: u, role: u.role });

let organiser: TestUser;
let ana: TestUser;
let budi: TestUser;
let project: TestProject;

beforeAll(async () => {
  await cleaner.shared(async () => {
    organiser = await f.user({ role: 'project_manager' });
    ana = await f.user();
    budi = await f.user();
    project = await f.project({
      lead: organiser,
      members: [
        [ana, 'member'],
        [budi, 'member'],
      ],
      name: 'Renovasi Dapur', // test-only
    });
  });
});

/** An event at `T` for the three of them, on the project unless told otherwise. */
const meeting = (over: Partial<EventInput> = {}) =>
  perTest.event({ creator: organiser, guests: [ana, budi], project, startsAt: T, ...over });

/** Reminder cards one person holds for one event, oldest first. */
const cards = (u: TestUser, eventId: string) =>
  db
    .select()
    .from(notification)
    .where(
      and(
        eq(notification.recipientId, u.id),
        eq(notification.refId, eventId),
        eq(notification.kind, 'event_reminder'),
      ),
    )
    .orderBy(notification.createdAt);

const counts = async (eventId: string) =>
  Promise.all([organiser, ana, budi].map(async (u) => (await cards(u, eventId)).length));

const claimed = async (eventId: string) =>
  (await db.select().from(eventReminder).where(eq(eventReminder.eventId, eventId)))
    .map((c) => c.offsetMinutes)
    .sort((a, b) => b - a);

describe('runReminderTick', () => {
  it('(a) sends one reminder to every participant a day before', async () => {
    const e = await meeting();
    const r = await runReminderTick(before(1440));

    expect(await counts(e.id)).toEqual([1, 1, 1]);
    expect(r).toMatchObject({ sent: 1, stale: 0, failed: 0 });
    const [card] = await cards(ana, e.id);
    expect(card).toMatchObject({ lane: 'info', refType: 'event', projectId: project.id });
    expect(card.payload).toMatchObject({
      title: e.title,
      startsAt: T.toISOString(),
      projectName: 'Renovasi Dapur',
    });
    expect(card.dedupeKey).toBe(`event_reminder:event:${e.id}:${T.getTime()}:1440`);
  });

  it('(b) a second tick at the same moment sends nothing more', async () => {
    const e = await meeting();
    await runReminderTick(before(1440));
    const again = await runReminderTick(before(1440));

    expect(await counts(e.id)).toEqual([1, 1, 1]);
    expect(again).toMatchObject({ claimed: 0, sent: 0 });
    // Later ticks in the same quiet stretch stay silent too.
    await runReminderTick(before(1000));
    expect(await counts(e.id)).toEqual([1, 1, 1]);
  });

  it('(c) sends the second reminder half an hour before', async () => {
    const e = await meeting();
    await runReminderTick(before(1440));
    await runReminderTick(before(30));

    expect(await counts(e.id)).toEqual([2, 2, 2]);
    const keys = (await cards(ana, e.id)).map((c) => c.dedupeKey.split(':').pop());
    expect(keys).toEqual(['1440', '30']);
    expect(await claimed(e.id)).toEqual([1440, 30]);
  });

  it('(d) sends nothing for a cancelled or trashed event, or one whose project is in the Trash', async () => {
    const canceled = await meeting({ canceledAt: before(2000), canceledBy: organiser });
    const trashed = await meeting({ deletedAt: before(2000) });
    const inTrashedProject = await meeting();
    await db
      .update(projectTable)
      .set({ deletedAt: before(2000), deletedBy: organiser.id })
      .where(eq(projectTable.id, project.id));
    try {
      const r = await runReminderTick(before(30));
      expect(r.sent).toBe(0);
      for (const e of [canceled, trashed, inTrashedProject]) {
        expect(await counts(e.id)).toEqual([0, 0, 0]);
        expect(await claimed(e.id)).toEqual([]);
      }
    } finally {
      await db
        .update(projectTable)
        .set({ deletedAt: null, deletedBy: null })
        .where(eq(projectTable.id, project.id));
    }
  });

  it('(d) a cancellation after the first reminder stops the second', async () => {
    const e = await meeting();
    await runReminderTick(before(1440));
    const r = await cancelEvent(as(organiser), e.id, 'Narasumber berhalangan', before(600));
    expect(r.ok).toBe(true);

    await runReminderTick(before(30));
    expect(await counts(e.id)).toEqual([1, 1, 1]);
  });

  it('(e) moving the event re-arms the slots and reminds at the new time', async () => {
    const e = await meeting();
    await runReminderTick(before(1440));
    expect(await claimed(e.id)).toEqual([1440]);

    const later = new Date(T.getTime() + 120 * MIN);
    const moved = await updateEvent(as(organiser), e.id, {
      startsAt: later.toISOString(),
      endsAt: new Date(later.getTime() + 60 * MIN).toISOString(),
    });
    expect(moved.ok).toBe(true);
    expect(await claimed(e.id)).toEqual([]);

    // The old "a day before" moment no longer is one: the event is two hours further away.
    await runReminderTick(before(1440));
    expect(await counts(e.id)).toEqual([1, 1, 1]);

    await runReminderTick(before(1440, later));
    await runReminderTick(before(30, later));
    expect(await counts(e.id)).toEqual([3, 3, 3]);
    const keys = (await cards(ana, e.id)).map((c) => c.dedupeKey.split(':').slice(-2).join(':'));
    expect(keys).toEqual([
      `${T.getTime()}:1440`,
      `${later.getTime()}:1440`,
      `${later.getTime()}:30`,
    ]);
    const newest = (await cards(ana, e.id)).at(-1);
    expect(newest?.payload).toMatchObject({ startsAt: later.toISOString() });
  });

  it('(f) claims a slot that is past the grace window without sending it', async () => {
    const e = await meeting();
    const lateBy = EVENT_REMINDER_GRACE_MS / MIN + 1;
    const r = await runReminderTick(new Date(before(1440).getTime() + lateBy * MIN));

    expect(r).toMatchObject({ claimed: 1, sent: 0, stale: 1 });
    expect(await counts(e.id)).toEqual([0, 0, 0]);
    expect(await claimed(e.id)).toEqual([1440]);

    // The stale slot never comes back; the next one still does.
    await runReminderTick(before(1200));
    expect(await counts(e.id)).toEqual([0, 0, 0]);
    await runReminderTick(before(30));
    expect(await counts(e.id)).toEqual([1, 1, 1]);
  });

  it('(f) still sends a slot that is exactly at the edge of the grace window', async () => {
    const e = await meeting();
    await runReminderTick(new Date(before(1440).getTime() + EVENT_REMINDER_GRACE_MS));
    expect(await counts(e.id)).toEqual([1, 1, 1]);
  });

  it('(f) an event created late claims the day-before slot silently', async () => {
    const e = await meeting();
    const r = await runReminderTick(before(100));
    expect(r).toMatchObject({ claimed: 1, sent: 0, stale: 1 });
    expect(await counts(e.id)).toEqual([0, 0, 0]);
  });

  it('(g) skips a participant who switched the event reminders off, and only for reminders', async () => {
    await db.insert(notificationPref).values([
      { userId: ana.id, category: 'event_reminder', inApp: false },
      { userId: budi.id, category: 'news', inApp: false },
    ]);
    try {
      const e = await meeting();
      await runReminderTick(before(1440));
      expect(await counts(e.id)).toEqual([1, 0, 1]);
    } finally {
      await db.delete(notificationPref).where(inArray(notificationPref.userId, [ana.id, budi.id]));
    }
  });

  it('sends nothing once the event has started', async () => {
    const e = await meeting();
    const r = await runReminderTick(new Date(T.getTime() + MIN));
    expect(r.claimed).toBe(0);
    expect(await counts(e.id)).toEqual([0, 0, 0]);
  });

  it('honours the offsets stored on the event', async () => {
    const e = await meeting();
    await db
      .update(event)
      .set({ remindersMinutes: [60] })
      .where(eq(event.id, e.id));
    await runReminderTick(before(1440));
    expect(await counts(e.id)).toEqual([0, 0, 0]);
    await runReminderTick(before(60));
    expect(await counts(e.id)).toEqual([1, 1, 1]);
    expect(await claimed(e.id)).toEqual([60]);
  });

  it('two ticks racing at the same moment still send one card per person', async () => {
    const e = await meeting();
    await Promise.all([runReminderTick(before(1440)), runReminderTick(before(1440))]);
    expect(await counts(e.id)).toEqual([1, 1, 1]);
  });

  it('rolls an event back when its card cannot be sent, and retries it next tick', async () => {
    const broken = await meeting();
    const fine = await meeting();
    const failing: typeof notify = async (exec, input) => {
      if (input.ref.id === broken.id) throw new Error('inbox down'); // test-only
      return notify(exec, input);
    };
    const r = await runReminderTick(before(1440), { exec: db, notify: failing });

    expect(r).toMatchObject({ failed: 1, sent: 1 });
    expect(await counts(fine.id)).toEqual([1, 1, 1]);
    // The claim went back with the failed transaction, so the slot is still open.
    expect(await claimed(broken.id)).toEqual([]);
    await runReminderTick(before(1440));
    expect(await counts(broken.id)).toEqual([1, 1, 1]);
    expect(await counts(fine.id)).toEqual([1, 1, 1]);
  });
});

describe('selectDueReminders', () => {
  it('lists an event only while a slot is due and unclaimed', async () => {
    const e = await meeting();
    const ids = async (now: Date) => (await selectDueReminders(now)).map((d) => d.id);

    expect(await ids(before(1500))).not.toContain(e.id);
    expect(await ids(before(1440))).toContain(e.id);
    await runReminderTick(before(1440));
    expect(await ids(before(1000))).not.toContain(e.id);
    expect(await ids(before(30))).toContain(e.id);
    const due = (await selectDueReminders(before(30))).find((d) => d.id === e.id);
    expect(due?.offsets.sort((a, b) => b - a)).toEqual([1440, 30]);
  });
});

describe('startEventReminderScheduler', () => {
  const timer = { unref() {} } as unknown as ReturnType<typeof setInterval>;
  const state = globalThis as { __simplePmEventReminders?: { started: boolean } };

  it('ticks every minute and ignores a second start', () => {
    if (state.__simplePmEventReminders) state.__simplePmEventReminders.started = false;
    const calls: number[] = [];
    const i = spyOn(globalThis, 'setInterval').mockImplementation(((_: unknown, ms: number) => {
      calls.push(ms);
      return timer;
    }) as unknown as typeof setInterval);

    startEventReminderScheduler();
    startEventReminderScheduler();
    i.mockRestore();

    expect(calls).toEqual([EVENT_REMINDER_TICK_MS]);
    expect(EVENT_REMINDER_TICK_MS).toBe(60_000);
  });

  it('is only installed outside tests', () => {
    const source = readFileSync(path.join(import.meta.dir, '../../server/api/index.ts'), 'utf8');
    const guard = source.indexOf("if (process.env.NODE_ENV !== 'test') {");
    const call = source.indexOf('startEventReminderScheduler();', guard);
    expect(guard).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(guard);
    expect(source.slice(guard, call)).not.toContain('\n}');
  });
});
