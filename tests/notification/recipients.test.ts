/**
 * Who may receive an Inbox card (S3 I02, P5 §5.2/§5.3 butir 3): implicit followers of a task, the
 * Admin queue, and the gate `notify()` puts every candidate through. Each read must cost one query.
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { notificationPref, taskComment, user } from '../../server/db/schema';
import {
  admins,
  filterRecipients,
  followersOf,
} from '../../server/notification/notification.recipients';
import { createCleaner } from '../support/cleanup';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'notifrcp' });
afterAll(() => cleaner.flushAll());

const ids = (list: string[]) => [...list].sort();

let lead: TestUser;
let worker: TestUser;
let watcher: TestUser;
let outsider: TestUser;
let project: TestProject;

beforeAll(async () => {
  await cleaner.shared(async () => {
    lead = await f.user();
    worker = await f.user();
    watcher = await f.user();
    outsider = await f.user();
    project = await f.project({
      lead,
      members: [
        [worker, 'member'],
        [watcher, 'viewer'],
      ],
    });
  });
});

describe('followersOf', () => {
  it('collects the creator, who works on it, the reviewer and every comment author, once each', async () => {
    const commenter = await f.user();
    const task = await f.task({ project, creator: lead, assignee: worker, reviewer: watcher });
    // Two comments from the same person must not yield two followers.
    for (const body of ['Halo', 'Lanjut'] as const) {
      const id = cleaner.track('taskPart', `notifrcp-c-${crypto.randomUUID()}`);
      await db.insert(taskComment).values({ id, taskId: task.id, authorId: commenter.id, body });
    }

    expect(ids(await followersOf(db, task.id))).toEqual(
      ids([lead.id, worker.id, watcher.id, commenter.id]),
    );
  });

  it('ignores a deleted comment and a task with nobody on it', async () => {
    const ghost = await f.user();
    const task = await f.task({ project, creator: lead, assignee: null, reviewer: null });
    const deletedId = cleaner.track('taskPart', `notifrcp-c-${crypto.randomUUID()}`);
    await db.insert(taskComment).values({
      id: deletedId,
      taskId: task.id,
      authorId: ghost.id,
      body: 'Salah kirim',
      deletedAt: new Date(),
    });

    expect(await followersOf(db, task.id)).toEqual([lead.id]);

    const orphan = await f.task({ project, creator: null, assignee: null, reviewer: null });
    expect(await followersOf(db, orphan.id)).toEqual([]);
  });

  it('costs one query however many comments the task has', async () => {
    const task = await f.task({ project, creator: lead, assignee: worker });
    for (let i = 0; i < 5; i++) {
      const id = cleaner.track('taskPart', `notifrcp-c-${crypto.randomUUID()}`);
      await db.insert(taskComment).values({ id, taskId: task.id, authorId: worker.id, body: 'ok' });
    }
    const counter = countQueries();

    const followers = await followersOf(counter.exec, task.id);

    expect(ids(followers)).toEqual(ids([lead.id, worker.id]));
    expect(counter.queries).toHaveLength(1);
  });
});

describe('admins', () => {
  it('returns approved, unbanned Admins and Super-admins only', async () => {
    const admin = await f.user({ role: 'admin' });
    const superAdmin = await f.user({ role: 'super-admin' });
    const bannedAdmin = await f.user({ role: 'admin', banned: true });
    const pendingAdmin = await f.user({ role: 'admin', status: 'pending' });
    const plainMember = await f.user();

    const found = new Set(await admins(db));

    expect(found.has(admin.id)).toBe(true);
    expect(found.has(superAdmin.id)).toBe(true);
    expect(found.has(bannedAdmin.id)).toBe(false);
    expect(found.has(pendingAdmin.id)).toBe(false);
    expect(found.has(plainMember.id)).toBe(false);
  });

  it('costs one query', async () => {
    const counter = countQueries();
    await admins(counter.exec);
    expect(counter.queries).toHaveLength(1);
  });
});

describe('filterRecipients', () => {
  const action = (ids: string[], over: Partial<Parameters<typeof filterRecipients>[1]> = {}) =>
    filterRecipients(db, { ids, projectId: project.id, lane: 'action', ...over });

  it('never tells the actor about their own action', async () => {
    expect(await action([lead.id, worker.id], { actorId: lead.id })).toEqual([worker.id]);
  });

  it('collapses duplicate candidates and keeps the input order', async () => {
    expect(await action([worker.id, lead.id, worker.id])).toEqual([worker.id, lead.id]);
  });

  it('drops accounts that cannot sign in: pending, rejected and actively banned', async () => {
    const pending = await f.user({ status: 'pending' });
    const rejected = await f.user({ status: 'rejected' });
    const banned = await f.user({ banned: true });
    const expired = await f.user({ banned: true });
    // A ban that has run out does not hold, exactly as `isBanActive` reads it.
    await db
      .update(user)
      .set({ banExpires: new Date(Date.now() - 86_400_000) })
      .where(eq(user.id, expired.id));
    for (const member of [pending, rejected, banned, expired]) {
      await f.project({ lead, members: [[member, 'member']] });
    }

    const allowed = await filterRecipients(db, {
      ids: [pending.id, rejected.id, banned.id, expired.id, worker.id],
      projectId: null,
      lane: 'action',
    });

    expect(allowed).toEqual([expired.id, worker.id]);
  });

  it('drops someone who is not a member of the project, and an unknown id', async () => {
    expect(await action([worker.id, outsider.id, 'notifrcp-ghost'])).toEqual([worker.id]);
  });

  it('lets an Admin through without a membership row, because Admin outranks the project role', async () => {
    const admin = await f.user({ role: 'admin' });
    const superAdmin = await f.user({ role: 'super-admin' });
    const pm = await f.user({ role: 'project_manager' });

    // A Project Manager is not an Admin: without a membership row they get no card.
    expect(await action([admin.id, superAdmin.id, pm.id])).toEqual([admin.id, superAdmin.id]);
  });

  it('skips the project gate for an account card that belongs to no project', async () => {
    const admin = await f.user({ role: 'admin' });
    expect(
      await filterRecipients(db, {
        ids: [outsider.id, admin.id],
        projectId: null,
        lane: 'action',
      }),
    ).toEqual([outsider.id, admin.id]);
  });

  it('honours "Kabar terbaru" off for info cards but never for action cards', async () => {
    const quiet = await f.user();
    await f.project({ lead, members: [[quiet, 'member']] });
    await db.insert(notificationPref).values({ userId: quiet.id, category: 'news', inApp: false });

    expect(
      await filterRecipients(db, { ids: [quiet.id, worker.id], projectId: null, lane: 'info' }),
    ).toEqual([worker.id]);
    // The work queue cannot be switched off.
    expect(
      await filterRecipients(db, { ids: [quiet.id, worker.id], projectId: null, lane: 'action' }),
    ).toEqual([quiet.id, worker.id]);
  });

  it('keeps a recipient whose preference row says the category is on', async () => {
    const loud = await f.user();
    await db.insert(notificationPref).values({ userId: loud.id, category: 'news', inApp: true });
    // An unrelated category being off must not silence the news lane.
    await db
      .insert(notificationPref)
      .values({ userId: loud.id, category: 'event_reminder', inApp: false });

    expect(await filterRecipients(db, { ids: [loud.id], projectId: null, lane: 'info' })).toEqual([
      loud.id,
    ]);
  });

  it('costs one query for account status, project access and the preference together', async () => {
    const counter = countQueries();

    const allowed = await filterRecipients(counter.exec, {
      ids: [lead.id, worker.id, watcher.id, outsider.id],
      actorId: lead.id,
      projectId: project.id,
      lane: 'info',
    });

    expect(allowed).toEqual([worker.id, watcher.id]);
    expect(counter.queries).toHaveLength(1);
  });

  it('asks the database nothing when every candidate is the actor', async () => {
    const counter = countQueries();
    expect(
      await filterRecipients(counter.exec, { ids: [lead.id], actorId: lead.id, lane: 'info' }),
    ).toEqual([]);
    expect(counter.queries).toHaveLength(0);
  });
});
