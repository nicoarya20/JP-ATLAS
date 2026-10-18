/**
 * The status and comment hooks (S3 I06, P5 §5.5 rows 3-6): finishing, cancelling and reopening a
 * task, and commenting on it, seen from the Inbox. Driven through the services, so the cards are
 * written and closed by the same code every caller goes through.
 */
import { afterAll, afterEach, describe, expect, it, spyOn } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { notification, taskActivity } from '../../server/db/schema';
import * as recipientsMod from '../../server/notification/notification.recipients';
import { createTask, type TaskAuthor } from '../../server/task/task.service';
import { addComment } from '../../server/task/task-comment.service';
import { applyTransition } from '../../server/task/task-workflow.service';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'emitflow' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const NOW = new Date('2026-10-18T09:00:00Z'); // test-only
const clock = { now: NOW, today: '2026-10-18' };
const principal = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });
const author = (u: TestUser): TaskAuthor => ({ principal: principal(u), name: u.name });

const cardsOf = (recipient: TestUser, taskId: string) =>
  db
    .select()
    .from(notification)
    .where(and(eq(notification.recipientId, recipient.id), eq(notification.refId, taskId)))
    // Cards written in one request share `at`, so the kind breaks the tie deterministically.
    .orderBy(notification.createdAt, notification.kind);

const kindsOf = async (recipient: TestUser, taskId: string) =>
  (await cardsOf(recipient, taskId)).map((c) => c.kind);

/** `lead` creates and manages, `member` does the work, `mate` watches, `boss` is an Admin outside. */
async function graph() {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const mate = await f.user();
  const boss = await f.user({ role: 'admin' });
  const proj = await f.project({
    lead,
    members: [
      [member, 'member'],
      [mate, 'member'],
    ],
  });
  return { lead, member, mate, boss, proj };
}

/** A task `lead` created for `member`, so `member` holds one open `task_assigned` card. */
async function assigned(g: Awaited<ReturnType<typeof graph>>) {
  const r = await createTask(
    author(g.lead),
    { projectId: g.proj.id, title: 'Pasang rak dapur', assigneeId: g.member.id }, // test-only
    clock,
  );
  if (!r.ok) throw new Error(`createTask refused with ${r.code}`);
  for (const row of await db
    .select({ id: taskActivity.id })
    .from(taskActivity)
    .where(eq(taskActivity.taskId, r.task.id))) {
    cleaner.track('taskPart', row.id);
  }
  return cleaner.track('task', r.task.id);
}

/** Runs one step and fails the test with the refusal code instead of a bare assertion. */
async function step(
  by: TestUser,
  taskId: string,
  action: 'start' | 'complete' | 'cancel' | 'reopen' | 'uncancel',
) {
  const input =
    action === 'cancel'
      ? { category: 'not_needed' as const }
      : action === 'reopen'
        ? { reason: 'Masih ada yang kurang' } // test-only
        : {};
  const r = await applyTransition(author(by), taskId, action, input, clock);
  if (!r.ok) throw new Error(`${action} refused with ${r.code}`);
  const rows = await db
    .select({ id: taskActivity.id })
    .from(taskActivity)
    .where(eq(taskActivity.taskId, taskId));
  for (const row of rows) cleaner.track('taskPart', row.id);
  return r;
}

describe('start', () => {
  it('answers the card: taking up the work is what it asked for', async () => {
    const g = await graph();
    const taskId = await assigned(g);
    await step(g.member, taskId, 'start');

    const [card] = await cardsOf(g.member, taskId);
    expect(card).toMatchObject({ kind: 'task_assigned', resolvedReason: 'acted' });
    expect(card?.resolvedAt).not.toBeNull();
  });
});

describe('complete', () => {
  it('closes the card and tells the creator and the worker, but not whoever pressed it', async () => {
    const g = await graph();
    const taskId = await assigned(g);
    await step(g.lead, taskId, 'complete');

    const worker = await cardsOf(g.member, taskId);
    expect(worker.map((c) => c.kind).sort()).toEqual(['task_assigned', 'task_done']);
    expect(worker.find((c) => c.kind === 'task_assigned')).toMatchObject({
      resolvedReason: 'acted',
    });
    expect(worker.find((c) => c.kind === 'task_done')).toMatchObject({
      lane: 'info',
      resolvedAt: null,
      bundleCount: 1,
    });
    // The lead both created the task and completed it, so they hear nothing about their own press.
    expect(await kindsOf(g.lead, taskId)).toEqual([]);
    expect(await kindsOf(g.mate, taskId)).toEqual([]);
  });

  it('closes the worker card even when somebody else finished the task', async () => {
    const g = await graph();
    const taskId = await assigned(g);
    await step(g.boss, taskId, 'complete');

    const worker = await cardsOf(g.member, taskId);
    expect(worker.find((c) => c.kind === 'task_assigned')).toMatchObject({
      resolvedReason: 'acted',
    });
    expect(worker.map((c) => c.kind)).toContain('task_done');
    expect(await kindsOf(g.lead, taskId)).toEqual(['task_done']);
  });
});

describe('cancel and reopen', () => {
  it('closes every open card on a cancelled task and reports the change as news', async () => {
    const g = await graph();
    const taskId = await assigned(g);
    await step(g.lead, taskId, 'cancel');

    const worker = await cardsOf(g.member, taskId);
    const card = worker.find((c) => c.kind === 'task_assigned');
    expect(card).toMatchObject({ resolvedReason: 'target_closed' });
    expect(card?.resolvedAt).not.toBeNull();
    expect(worker.find((c) => c.kind === 'task_changed')).toMatchObject({
      lane: 'info',
      resolvedAt: null,
    });
  });

  it('does not bring the old assignment card back when the task is reopened', async () => {
    const g = await graph();
    const taskId = await assigned(g);
    await step(g.member, taskId, 'start');
    await step(g.member, taskId, 'complete');
    await step(g.lead, taskId, 'reopen');

    const assignedCards = (await cardsOf(g.member, taskId)).filter(
      (c) => c.kind === 'task_assigned',
    );
    expect(assignedCards).toHaveLength(1);
    expect(assignedCards[0]?.resolvedAt).not.toBeNull();
    expect(await kindsOf(g.member, taskId)).toContain('task_changed');
  });
});

describe('comments', () => {
  it('bundles an hour of comments into one card for the followers, and none for the writer', async () => {
    const g = await graph();
    const taskId = await assigned(g);
    for (let n = 1; n <= 5; n += 1) {
      const r = await addComment(author(g.member), taskId, `Catatan ${n}`, clock); // test-only
      if (!r.ok) throw new Error(`addComment refused with ${r.code}`);
      cleaner.track('taskPart', r.comment.id);
    }

    const forLead = (await cardsOf(g.lead, taskId)).filter((c) => c.kind === 'task_commented');
    expect(forLead).toHaveLength(1);
    expect(forLead[0]).toMatchObject({ lane: 'info', bundleCount: 5, readAt: null });
    expect(forLead[0]?.payload).toMatchObject({ excerpt: 'Catatan 5' });
    expect(await kindsOf(g.member, taskId)).toEqual(['task_assigned']);
  });

  it('tells a follower who only ever commented, because commenting is following', async () => {
    const g = await graph();
    const taskId = await assigned(g);
    const first = await addComment(author(g.mate), taskId, 'Ukurannya sudah pas?', clock);
    if (!first.ok) throw new Error(`addComment refused with ${first.code}`);
    cleaner.track('taskPart', first.comment.id);
    const second = await addComment(author(g.member), taskId, 'Sudah, besok dipasang', clock);
    if (!second.ok) throw new Error(`addComment refused with ${second.code}`);
    cleaner.track('taskPart', second.comment.id);

    expect(await kindsOf(g.mate, taskId)).toEqual(['task_commented']);
  });
});

describe('a card that cannot be written', () => {
  const spy = () => spyOn(recipientsMod, 'filterRecipients');
  afterEach(() => spy().mockRestore());

  it('does not fail the transition, and 409 still comes only from the conditional update', async () => {
    const g = await graph();
    const taskId = await assigned(g);
    spy().mockRejectedValue(new Error('recipient lookup is down'));

    const done = await applyTransition(author(g.lead), taskId, 'complete', {}, clock);
    expect(done.ok).toBe(true);
    if (done.ok) expect(done.task.status).toBe('done');
    expect(await kindsOf(g.member, taskId)).toEqual(['task_assigned']);

    spy().mockRestore();
    const raced = await Promise.all([
      applyTransition(author(g.lead), taskId, 'reopen', { reason: 'Masih ada yang kurang' }, clock),
      applyTransition(author(g.lead), taskId, 'reopen', { reason: 'Masih ada yang kurang' }, clock),
    ]);
    expect(raced.map((r) => (r.ok ? 'ok' : r.code)).sort()).toEqual(['STATE_CONFLICT', 'ok']);
  });
});
