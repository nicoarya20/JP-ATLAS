/**
 * `resolveNotifications()` and `dropForUserInProject()` (S3 I03, P5 §5.3 butir 4): a card closes
 * because the thing it asked for happened, exactly once, and a former member keeps nothing.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { notification, projectMember } from '../../server/db/schema';
import {
  dropForUserInProject,
  resolveNotifications,
} from '../../server/notification/notification.resolve';
import { createCleaner } from '../support/cleanup';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'notifres' });
afterAll(() => cleaner.flushAll());

const AT = new Date('2026-10-18T11:00:00Z');

let actor: TestUser;
let worker: TestUser;
let mate: TestUser;
let project: TestProject;
let otherProject: TestProject;
let taskId: string;

const cardsOf = (recipientId: string) =>
  db.select().from(notification).where(eq(notification.recipientId, recipientId));
const taskRef = { type: 'task', id: '' } as { type: 'task'; id: string };

/** Writes one card straight to the table: these tests are about closing cards, not about `notify()`. */
async function card(opts: {
  recipient: TestUser;
  kind: string;
  lane?: 'action' | 'info';
  refId?: string;
  projectId?: string | null;
}) {
  const [row] = await db
    .insert(notification)
    .values({
      recipientId: opts.recipient.id,
      actorId: actor.id,
      projectId: opts.projectId === undefined ? project.id : opts.projectId,
      lane: opts.lane ?? 'action',
      kind: opts.kind,
      refType: 'task',
      refId: opts.refId ?? taskId,
      dedupeKey: `${opts.kind}:task:${opts.refId ?? taskId}:${crypto.randomUUID()}`,
    })
    .returning();
  return row;
}

beforeAll(async () => {
  await cleaner.shared(async () => {
    actor = await f.user();
    worker = await f.user();
    mate = await f.user();
    project = await f.project({
      lead: actor,
      members: [
        [worker, 'member'],
        [mate, 'member'],
      ],
    });
    otherProject = await f.project({ lead: actor, members: [[worker, 'member']] });
    const task = await f.task({ project, creator: actor, assignee: worker });
    taskId = task.id;
    taskRef.id = taskId;
  });
});

// Each test starts from an empty Inbox for the three accounts, so counts are unambiguous.
beforeEach(async () => {
  for (const person of [actor, worker, mate]) {
    await db.delete(notification).where(eq(notification.recipientId, person.id));
  }
});

describe('resolveNotifications', () => {
  it('closes the open cards of a ref once, then has nothing left to do', async () => {
    await card({ recipient: worker, kind: 'task_assigned' });
    await card({ recipient: mate, kind: 'task_assigned' });

    expect(await resolveNotifications(db, { ref: taskRef, reason: 'acted', at: AT })).toBe(2);
    expect(await resolveNotifications(db, { ref: taskRef, reason: 'acted', at: AT })).toBe(0);

    const [closed] = await cardsOf(worker.id);
    expect(closed.resolvedAt).toEqual(AT);
    expect(closed.resolvedReason).toBe('acted');
    expect(closed.updatedAt).toEqual(AT);
  });

  it('records the reason it was given', async () => {
    await card({ recipient: worker, kind: 'task_assigned' });

    await resolveNotifications(db, { ref: taskRef, reason: 'target_closed', at: AT });

    expect((await cardsOf(worker.id))[0].resolvedReason).toBe('target_closed');
  });

  it('narrows to the given kinds and leaves the rest open', async () => {
    await card({ recipient: worker, kind: 'task_assigned' });
    await card({ recipient: worker, kind: 'task_done', lane: 'info' });

    expect(
      await resolveNotifications(db, {
        ref: taskRef,
        kinds: ['task_assigned'],
        reason: 'superseded',
        at: AT,
      }),
    ).toBe(1);

    const open = (await cardsOf(worker.id)).filter((c) => c.resolvedAt === null);
    expect(open.map((c) => c.kind)).toEqual(['task_done']);
  });

  it('narrows to one person when the card of only that person is obsolete', async () => {
    await card({ recipient: worker, kind: 'task_assigned' });
    await card({ recipient: mate, kind: 'task_assigned' });

    expect(
      await resolveNotifications(db, {
        ref: taskRef,
        recipientId: worker.id,
        reason: 'superseded',
        at: AT,
      }),
    ).toBe(1);

    expect((await cardsOf(worker.id))[0].resolvedAt).toEqual(AT);
    expect((await cardsOf(mate.id))[0].resolvedAt).toBeNull();
  });

  it('never touches a card of another ref, and does nothing for an empty kind list', async () => {
    await card({ recipient: worker, kind: 'task_assigned' });
    await card({ recipient: worker, kind: 'task_assigned', refId: 'notifres-other-task' });

    expect(await resolveNotifications(db, { ref: taskRef, reason: 'acted', at: AT })).toBe(1);
    expect(await resolveNotifications(db, { ref: taskRef, kinds: [], reason: 'acted' })).toBe(0);

    const open = (await cardsOf(worker.id)).filter((c) => c.resolvedAt === null);
    expect(open.map((c) => c.refId)).toEqual(['notifres-other-task']);
  });

  it('costs one query', async () => {
    await card({ recipient: worker, kind: 'task_assigned' });
    const counter = countQueries();

    await resolveNotifications(counter.exec, { ref: taskRef, reason: 'acted', at: AT });

    expect(counter.queries).toHaveLength(1);
  });
});

describe('dropForUserInProject', () => {
  it('removes every card that one person holds for one project only', async () => {
    await card({ recipient: worker, kind: 'task_assigned' });
    await card({ recipient: worker, kind: 'task_commented', lane: 'info' });
    await card({ recipient: worker, kind: 'task_assigned', projectId: otherProject.id });
    // An account card has no project and is not part of a project membership at all.
    await card({ recipient: worker, kind: 'task_done', lane: 'info', projectId: null });
    await card({ recipient: mate, kind: 'task_assigned' });

    expect(await dropForUserInProject(db, worker.id, project.id)).toBe(2);

    const left = await cardsOf(worker.id);
    expect(new Set(left.map((c) => c.projectId))).toEqual(new Set([null, otherProject.id]));
    // The other member keeps their card: removing one person is not a project-wide sweep.
    expect(await cardsOf(mate.id)).toHaveLength(1);
  });

  it('is safe to call when the person holds nothing for that project', async () => {
    expect(await dropForUserInProject(db, worker.id, project.id)).toBe(0);
  });

  it('leaves the membership rows alone: it only clears the Inbox', async () => {
    await card({ recipient: worker, kind: 'task_assigned' });

    await dropForUserInProject(db, worker.id, project.id);

    const rows = await db.select().from(projectMember).where(eq(projectMember.userId, worker.id));
    expect(rows).toHaveLength(2);
  });
});
