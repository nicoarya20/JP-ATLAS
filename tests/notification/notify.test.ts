/**
 * `notify()` (S3 I03, P5 §5.3 butir 1-5): idempotent per event, bundling per hour for the news lane,
 * filtering its own recipients, and — above all — never taking the domain transaction down with it.
 */
import { afterAll, beforeAll, describe, expect, it, spyOn } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import {
  notification,
  notificationPref,
  projectMember,
  taskActivity,
} from '../../server/db/schema';
import { logger } from '../../server/logger';
import { notify } from '../../server/notification/notification.notify';
import { inTx } from '../../server/pm/tx';
import { createCleaner } from '../support/cleanup';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'notifsend' });
afterAll(() => cleaner.flushAll());

const AT = new Date('2026-10-18T09:30:00Z');
const AN_HOUR_LATER = new Date('2026-10-18T10:05:00Z');
// Statements Postgres needs to run a savepoint; they are not queries the budget is about.
const CONTROL = /^\s*(begin|commit|rollback|savepoint|release)\b/i;

let actor: TestUser;
let worker: TestUser;
let outsider: TestUser;
let project: TestProject;

/** The cards one recipient holds, newest first. */
const cardsOf = (recipientId: string) =>
  db.select().from(notification).where(eq(notification.recipientId, recipientId));

const taskRef = (id: string) => ({ type: 'task', id }) as const;

/** Adds a member to the shared project; the factory only seeds members when it creates one. */
const joinProject = (member: TestUser) =>
  db.insert(projectMember).values({ projectId: project.id, userId: member.id, role: 'member' });
const taskPayload = { title: 'Cek ukuran lemari dapur', number: 14 }; // test-only

beforeAll(async () => {
  await cleaner.shared(async () => {
    actor = await f.user();
    worker = await f.user();
    outsider = await f.user();
    project = await f.project({ lead: actor, members: [[worker, 'member']] });
  });
});

describe('action cards', () => {
  it('writes one card for the same event however often it is reported', async () => {
    const task = await f.task({ project, creator: actor, assignee: worker });
    const input = {
      kind: 'task_assigned',
      recipients: [worker.id],
      actorId: actor.id,
      projectId: project.id,
      ref: taskRef(task.id),
      sub: 'activity-1',
      payload: taskPayload,
      at: AT,
    } as const;

    expect(await notify(db, input)).toEqual({ inserted: 1, bundled: 0, skipped: 0 });
    expect(await notify(db, input)).toEqual({ inserted: 0, bundled: 1, skipped: 0 });

    const cards = await cardsOf(worker.id);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      lane: 'action',
      kind: 'task_assigned',
      refType: 'task',
      refId: task.id,
      dedupeKey: `task_assigned:task:${task.id}:activity-1`,
      bundleCount: 1,
      readAt: null,
      resolvedAt: null,
    });
  });

  it('never tells the actor about their own action, and keeps out everyone else', async () => {
    const task = await f.task({ project, creator: actor, assignee: actor });

    const result = await notify(db, {
      kind: 'task_assigned',
      recipients: [actor.id, outsider.id],
      actorId: actor.id,
      projectId: project.id,
      ref: taskRef(task.id),
      sub: 'activity-2',
      payload: taskPayload,
      at: AT,
    });

    expect(result).toEqual({ inserted: 0, bundled: 0, skipped: 0 });
    expect(await cardsOf(actor.id)).toHaveLength(0);
    expect(await cardsOf(outsider.id)).toHaveLength(0);
  });

  it('cannot be silenced by the news preference: the work queue is not news', async () => {
    const quiet = await f.user();
    const task = await f.task({ project, creator: actor, assignee: quiet });
    await db.insert(notificationPref).values({ userId: quiet.id, category: 'news', inApp: false });

    const result = await notify(db, {
      kind: 'task_assigned',
      recipients: [quiet.id],
      actorId: actor.id,
      projectId: null,
      ref: taskRef(task.id),
      sub: 'activity-3',
      payload: taskPayload,
      at: AT,
    });

    expect(result.inserted).toBe(1);
  });
});

describe('info cards', () => {
  const comment = (recipient: TestUser, taskId: string, at: Date) =>
    notify(db, {
      kind: 'task_commented',
      recipients: [recipient.id],
      actorId: actor.id,
      projectId: project.id,
      ref: taskRef(taskId),
      payload: { title: 'Cek ukuran lemari dapur', number: 12 }, // test-only
      at,
    });

  it('bundles repeats of the same hour into one unread card', async () => {
    const reader = await f.user();
    await joinProject(reader);
    const task = await f.task({ project, creator: actor, assignee: worker });

    expect(await comment(reader, task.id, AT)).toEqual({ inserted: 1, bundled: 0, skipped: 0 });
    // The reader opens the card before the next two comments arrive.
    await db
      .update(notification)
      .set({ readAt: AT })
      .where(eq(notification.recipientId, reader.id));
    expect(await comment(reader, task.id, AT)).toEqual({ inserted: 0, bundled: 1, skipped: 0 });
    expect(await comment(reader, task.id, AT)).toEqual({ inserted: 0, bundled: 1, skipped: 0 });

    const cards = await cardsOf(reader.id);
    expect(cards).toHaveLength(1);
    expect(cards[0].bundleCount).toBe(3);
    // Bundling makes the card unread again, otherwise new comments would arrive invisibly.
    expect(cards[0].readAt).toBeNull();
    expect(cards[0].updatedAt).toEqual(AT);
  });

  it('starts a new card in the next hour', async () => {
    const reader = await f.user();
    await joinProject(reader);
    const task = await f.task({ project, creator: actor, assignee: worker });

    await comment(reader, task.id, AT);
    await comment(reader, task.id, AN_HOUR_LATER);

    const cards = await cardsOf(reader.id);
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.bundleCount)).toEqual([1, 1]);
    expect(new Set(cards.map((c) => c.dedupeKey)).size).toBe(2);
  });

  it('is skipped for a recipient who switched "Kabar terbaru" off', async () => {
    const quiet = await f.user();
    await joinProject(quiet);
    await db.insert(notificationPref).values({ userId: quiet.id, category: 'news', inApp: false });
    const task = await f.task({ project, creator: actor, assignee: worker });

    expect(await comment(quiet, task.id, AT)).toEqual({ inserted: 0, bundled: 0, skipped: 0 });
    expect(await cardsOf(quiet.id)).toHaveLength(0);
  });
});

describe('payload', () => {
  it('stores only known fields, each cut to its limit', async () => {
    const reader = await f.user();
    await joinProject(reader);
    const task = await f.task({ project, creator: actor, assignee: worker });

    await notify(db, {
      kind: 'task_commented',
      recipients: [reader.id],
      actorId: actor.id,
      projectId: project.id,
      ref: taskRef(task.id),
      payload: {
        title: 'T'.repeat(250), // test-only
        number: 12,
        excerpt: 'k'.repeat(200), // test-only
        // A caller must not be able to smuggle a contact detail into the Inbox.
        email: 'rahasia@example.test', // test-only
      } as never,
      at: AT,
    });

    const [card] = await cardsOf(reader.id);
    expect(Object.keys(card.payload).sort()).toEqual(['excerpt', 'number', 'title']);
    expect((card.payload.title as string).length).toBe(200);
    expect((card.payload.excerpt as string).length).toBe(140);
  });
});

describe('failure containment', () => {
  it('lets the domain write commit when the card cannot be written, and logs only err and kind', async () => {
    // An Admin passes the access filter without a membership row, so the insert is reached and then
    // fails on the project FK — the realistic shape of "the card could not be written".
    const admin = await f.user({ role: 'admin' });
    const task = await f.task({ project, creator: actor, assignee: worker });
    const activityId = cleaner.track('taskPart', `notifsend-a-${crypto.randomUUID()}`);
    const warn = spyOn(logger, 'warn');

    const result = await inTx(async (tx) => {
      await tx
        .insert(taskActivity)
        .values({ id: activityId, taskId: task.id, actorId: actor.id, action: 'assignee_changed' });
      return notify(tx, {
        kind: 'task_assigned',
        recipients: [admin.id],
        actorId: actor.id,
        projectId: 'notifsend-ghost-project',
        ref: taskRef(task.id),
        sub: activityId,
        payload: taskPayload,
        at: AT,
      });
    });

    expect(result).toEqual({ inserted: 0, bundled: 0, skipped: 1 });
    // The domain row survived the failed card: that is the whole point of the savepoint.
    const saved = await db.select().from(taskActivity).where(eq(taskActivity.id, activityId));
    expect(saved).toHaveLength(1);
    expect(await cardsOf(admin.id)).toHaveLength(0);

    const [payload, message] = warn.mock.calls.at(-1) as [Record<string, unknown>, string];
    expect(message).toBe('notification skipped');
    expect(Object.keys(payload).sort()).toEqual(['err', 'kind']);
    expect(payload.kind).toBe('task_assigned');
    warn.mockRestore();
  });

  it('writes nothing for a kind that is reserved for a later stage', async () => {
    const admin = await f.user({ role: 'admin' });
    const warn = spyOn(logger, 'warn');

    const result = await notify(db, {
      kind: 'mention',
      recipients: [admin.id],
      actorId: actor.id,
      projectId: null,
      ref: taskRef('notifsend-task'),
      payload: taskPayload,
      at: AT,
    });

    expect(result).toEqual({ inserted: 0, bundled: 0, skipped: 1 });
    expect(await cardsOf(admin.id)).toHaveLength(0);
    expect(warn.mock.calls.at(-1)?.[1]).toBe('notification kind not shipped');
    warn.mockRestore();
  });
});

describe('cost', () => {
  it('spends at most 3 queries: one filter, one insert', async () => {
    const reader = await f.user();
    const second = await f.user();
    await f.project({
      lead: actor,
      members: [
        [reader, 'member'],
        [second, 'member'],
      ],
    });
    const task = await f.task({ project, creator: actor, assignee: worker });
    const counter = countQueries();

    const result = await notify(counter.exec, {
      kind: 'task_commented',
      recipients: [reader.id, second.id, outsider.id],
      actorId: actor.id,
      projectId: null,
      ref: taskRef(task.id),
      payload: taskPayload,
      at: AT,
    });

    expect(result.inserted).toBe(3);
    const queries = counter.queries.filter((q) => !CONTROL.test(q));
    expect(queries.length).toBeLessThanOrEqual(3);
    expect(queries.filter((q) => /insert into/i.test(q))).toHaveLength(1);
  });

  it('asks the database nothing when there is no recipient left to tell', async () => {
    const counter = countQueries();
    const result = await notify(counter.exec, {
      kind: 'task_assigned',
      recipients: [actor.id],
      actorId: actor.id,
      projectId: project.id,
      ref: taskRef('notifsend-task'),
      payload: taskPayload,
      at: AT,
    });
    expect(result).toEqual({ inserted: 0, bundled: 0, skipped: 0 });
    expect(counter.queries).toHaveLength(0);
  });
});
