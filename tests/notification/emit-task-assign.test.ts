/**
 * The assignment hooks (S3 I05, P5 §5.5 rows 1-2): creating a task and changing who works on it,
 * seen from the Inbox. Driven through `createTask`/`updateTask`, because the hook belongs to the
 * service — a card must appear and disappear for every caller, not just for the UI route.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { notification, taskActivity } from '../../server/db/schema';
import { logger } from '../../server/logger';
import * as recipientsMod from '../../server/notification/notification.recipients';
import { createTask, type TaskAuthor, updateTask } from '../../server/task/task.service';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'emitassign' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const NOW = new Date('2026-10-18T09:00:00Z'); // test-only
const clock = { now: NOW, today: '2026-10-18' };
const principal = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });
const author = (u: TestUser): TaskAuthor => ({ principal: principal(u), name: u.name });

/** The cards one person holds for one task, oldest first, then by kind. */
const cardsOf = (recipient: TestUser, taskId: string) =>
  db
    .select()
    .from(notification)
    .where(and(eq(notification.recipientId, recipient.id), eq(notification.refId, taskId)))
    // Cards written in one request share `at`, so the kind breaks the tie deterministically.
    .orderBy(notification.createdAt, notification.kind);

/** A project where `lead` manages and two members may do the work. */
async function graph() {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const mate = await f.user();
  const proj = await f.project({
    lead,
    members: [
      [member, 'member'],
      [mate, 'member'],
    ],
  });
  return { lead, member, mate, proj };
}

/** Creates a task through the service and returns its id; a refusal fails the test loudly. */
async function create(
  by: TestUser,
  projectId: string,
  assignee: TestUser | null,
): Promise<{ id: string; number: number }> {
  const r = await createTask(
    author(by),
    { projectId, title: 'Pasang rak dapur', assigneeId: assignee?.id ?? null }, // test-only
    clock,
  );
  if (!r.ok) throw new Error(`createTask refused with ${r.code}`);
  // Activity rows are not tracked by the factory: the service wrote them, so register them here.
  for (const row of await db
    .select({ id: taskActivity.id })
    .from(taskActivity)
    .where(eq(taskActivity.taskId, r.task.id))) {
    cleaner.track('taskPart', row.id);
  }
  cleaner.track('task', r.task.id);
  return { id: r.task.id, number: r.task.number };
}

describe('createTask', () => {
  it('gives the person meant to do the work one open card, and nobody else', async () => {
    const { lead, member, mate, proj } = await graph();
    const created = await create(lead, proj.id, member);

    const cards = await cardsOf(member, created.id);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      kind: 'task_assigned',
      lane: 'action',
      refType: 'task',
      actorId: lead.id,
      projectId: proj.id,
      bundleCount: 1,
      readAt: null,
      resolvedAt: null,
    });
    expect(cards[0]?.payload).toMatchObject({
      title: 'Pasang rak dapur',
      number: created.number,
      projectName: proj.name,
    });
    expect(await cardsOf(lead, created.id)).toHaveLength(0);
    expect(await cardsOf(mate, created.id)).toHaveLength(0);
  });

  it('tells nobody when the creator takes the work themselves', async () => {
    const { member, proj } = await graph();
    const created = await create(member, proj.id, member);
    expect(await cardsOf(member, created.id)).toHaveLength(0);
  });

  it('writes no card for a task nobody is meant to do yet', async () => {
    const { lead, member, proj } = await graph();
    const created = await create(lead, proj.id, null);
    expect(await cardsOf(lead, created.id)).toHaveLength(0);
    expect(await cardsOf(member, created.id)).toHaveLength(0);
  });

  it('keys the card on the activity row, so a later assignment is a new card', async () => {
    const { lead, member, proj } = await graph();
    const created = await create(lead, proj.id, member);
    const [first] = await cardsOf(member, created.id);
    const [activity] = await db
      .select({ id: taskActivity.id })
      .from(taskActivity)
      .where(and(eq(taskActivity.taskId, created.id), eq(taskActivity.action, 'created')));
    expect(first?.dedupeKey).toBe(`task_assigned:task:${created.id}:${activity?.id}`);
  });
});

describe('updateTask', () => {
  it('moves the card: the previous worker loses theirs and is told, the new one receives it', async () => {
    const { lead, member, mate, proj } = await graph();
    const created = await create(lead, proj.id, member);

    const r = await updateTask(author(lead), created.id, { assigneeId: mate.id }, clock);
    expect(r.ok).toBe(true);

    const old = await cardsOf(member, created.id);
    expect(old).toHaveLength(2);
    expect(old[0]).toMatchObject({ kind: 'task_assigned', resolvedReason: 'superseded' });
    expect(old[0]?.resolvedAt).not.toBeNull();
    expect(old[1]).toMatchObject({ kind: 'task_unassigned', lane: 'info', resolvedAt: null });

    const next = await cardsOf(mate, created.id);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ kind: 'task_assigned', lane: 'action', resolvedAt: null });
  });

  it('closes the card and tells the person when the work is taken off them entirely', async () => {
    const { lead, member, proj } = await graph();
    const created = await create(lead, proj.id, member);

    expect((await updateTask(author(lead), created.id, { assigneeId: null }, clock)).ok).toBe(true);

    const cards = await cardsOf(member, created.id);
    expect(cards.map((c) => c.kind)).toEqual(['task_assigned', 'task_unassigned']);
    expect(cards[0]?.resolvedReason).toBe('superseded');
  });

  it('leaves the card alone when the edit did not touch who does the work', async () => {
    const { lead, member, proj } = await graph();
    const created = await create(lead, proj.id, member);

    expect((await updateTask(author(lead), created.id, { priority: 'high' }, clock)).ok).toBe(true);

    const cards = await cardsOf(member, created.id);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ kind: 'task_assigned', resolvedAt: null });
  });

  it('gives the new worker a card even after an earlier card of theirs was superseded', async () => {
    const { lead, member, mate, proj } = await graph();
    const created = await create(lead, proj.id, member);
    await updateTask(author(lead), created.id, { assigneeId: mate.id }, clock);
    await updateTask(author(lead), created.id, { assigneeId: member.id }, clock);

    const cards = await cardsOf(member, created.id);
    const open = cards.filter((c) => c.kind === 'task_assigned' && c.resolvedAt === null);
    expect(open).toHaveLength(1);
  });
});

describe('a card that cannot be written', () => {
  const failing = () => spyOn(recipientsMod, 'filterRecipients');
  beforeEach(() => failing().mockRestore());
  afterEach(() => failing().mockRestore());

  it('still leaves the task saved, and logs neither the title nor the person', async () => {
    const { lead, member, proj } = await graph();
    const warn = spyOn(logger, 'warn');
    failing().mockRejectedValue(new Error('recipient lookup is down'));

    const created = await create(lead, proj.id, member);

    expect(created.id).toBeTruthy();
    expect(await cardsOf(member, created.id)).toHaveLength(0);
    const logged = warn.mock.calls.map(([payload]) => JSON.stringify(payload ?? {})).join(' ');
    expect(logged).toContain('task_assigned');
    expect(logged).not.toContain('Pasang rak dapur');
    expect(logged).not.toContain(member.email);
    warn.mockRestore();
  });
});
