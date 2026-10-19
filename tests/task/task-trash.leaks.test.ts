/**
 * A task in the Trash must vanish from every read that counts or lists tasks (S6 D1) and come back
 * whole on restore: the task list and "Tugas saya" counts, the detail, the project's progress, the
 * team load, the Inbox cards that point at it and the project list. One world, one table of readers.
 */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { notification } from '../../server/db/schema';
import {
  inboxActionCount,
  inboxCounts,
  listInbox,
} from '../../server/notification/notification.query';
import { getProjectDetail } from '../../server/project/project.query';
import { listProjects } from '../../server/project/project-list.query';
import { countTasks, listTasks } from '../../server/task/task.query';
import { getTaskDetail } from '../../server/task/task-detail.query';
import { restoreTask, trashTask } from '../../server/task/task-trash.service';
import { loadForPeople, loadPersonWork } from '../../server/team/team.load.query';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'trashleak' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const NOW = new Date('2026-10-10T03:00:00Z'); // test-only: 10.00 WIB
const clock = { now: NOW, today: '2026-10-10' };
const principal = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });

async function world() {
  const lead = await f.user({ role: 'project_manager' });
  const worker = await f.user();
  const prj = await f.project({ lead, members: [[worker, 'member']] });
  const doomed = await f.task({ project: prj, creator: lead, assignee: worker, due: '2026-10-09' });
  const stays = await f.task({ project: prj, creator: lead, assignee: worker });
  const done = await f.task({ project: prj, creator: lead, assignee: worker, status: 'done' });
  return { lead, worker, prj, doomed, stays, done };
}
type World = Awaited<ReturnType<typeof world>>;

async function card(w: World, taskId: string, lane: 'action' | 'info') {
  await db.insert(notification).values({
    recipientId: w.worker.id,
    actorId: w.lead.id,
    projectId: w.prj.id,
    lane,
    kind: lane === 'action' ? 'task_assigned' : 'task_commented',
    refType: 'task',
    refId: taskId,
    dedupeKey: `trashleak:${crypto.randomUUID()}`,
    payload: { title: 'Rapikan gudang', number: 1 }, // test-only
    createdAt: NOW,
    updatedAt: NOW,
  });
}

/** Everything a reader could still show about the project's three tasks, as plain numbers and ids. */
async function snapshot(w: World) {
  const p = principal(w.worker);
  const list = await listTasks(p, { scope: 'project', projectId: w.prj.id }, clock);
  const mineList = await listTasks(p, { scope: 'mine' }, clock);
  const counts = await countTasks(p, clock);
  const detail = await getTaskDetail(p, String(w.doomed.number), clock);
  const byId = await getTaskDetail(p, w.doomed.id, clock);
  const project = await getProjectDetail(principal(w.lead), w.prj.id, NOW);
  const projects = await listProjects(principal(w.lead), {
    scope: 'all',
    limit: 20,
    offset: 0,
    now: NOW,
  });
  const load = (
    await loadForPeople([{ userId: w.worker.id, scope: { all: true } }], clock.today)
  ).get(w.worker.id);
  const work = await loadPersonWork(w.worker.id, { all: true }, clock.today);
  const inbox = await listInbox(p, { lane: 'action' }, NOW);
  const news = await listInbox(p, { lane: 'info' }, NOW);
  return {
    listIds: list.ok ? list.items.map((i) => i.id).sort() : 'bad cursor',
    mineIds: mineList.ok ? mineList.items.map((i) => i.id).sort() : 'bad cursor',
    countsByStatus: counts.byStatus,
    detail: detail.ok,
    byId: byId.ok,
    progress: project?.progress,
    listedProgress: projects.items.find((i) => i.id === w.prj.id)?.progress,
    load,
    work: work.tasks.map((t) => t.number).sort(),
    inbox: inbox.ok ? inbox.items.length : 'bad cursor',
    news: news.ok ? news.items.length : 'bad cursor',
    bell: await inboxCounts(p),
    actionCount: await inboxActionCount(p),
  };
}

describe('a task in the Trash', () => {
  it('disappears from every list, count, detail, progress, load and Inbox read', async () => {
    const w = await world();
    await card(w, w.doomed.id, 'action');
    await card(w, w.doomed.id, 'info');
    await card(w, w.stays.id, 'action');
    const before = await snapshot(w);
    expect(before).toMatchObject({ detail: true, byId: true, inbox: 2, news: 1 });
    expect(before.listIds).toContain(w.doomed.id);
    expect(before.progress).toMatchObject({ total: 3, done: 1 });

    expect((await trashTask(principal(w.lead), String(w.doomed.number), NOW)).ok).toBe(true);
    const after = await snapshot(w);
    expect(after.listIds).toEqual([w.stays.id, w.done.id].sort());
    expect(after.mineIds).not.toContain(w.doomed.id);
    expect(after).toMatchObject({ detail: false, byId: false, inbox: 1, news: 0 });
    expect(after.progress).toMatchObject({ total: 2, done: 1 });
    expect(after.listedProgress).toMatchObject({ total: 2, done: 1 });
    expect(after.load).toEqual({ active: 1, overdue: 0 });
    expect(after.work).toEqual([w.stays.number]);
    expect(after.bell).toEqual({ action: 1, infoUnread: 0 });
    expect(after.actionCount).toBe(1);
    expect(after.countsByStatus.todo).toBe(before.countsByStatus.todo - 1);
  });

  it('returns to every read after the restore, open cards included, with the same number', async () => {
    const w = await world();
    await card(w, w.doomed.id, 'action');
    await card(w, w.doomed.id, 'info');
    const before = await snapshot(w);
    await trashTask(principal(w.lead), String(w.doomed.number), NOW);
    expect((await restoreTask(principal(w.lead), w.doomed.id, NOW)).ok).toBe(true);
    expect(await snapshot(w)).toEqual(before);
    const detail = await getTaskDetail(principal(w.worker), String(w.doomed.number), clock);
    expect(detail.ok && detail.task.id).toBe(w.doomed.id);
  });

  it('leaves the cards of other tasks and of non-task refs alone', async () => {
    const w = await world();
    await card(w, w.stays.id, 'action');
    await db.insert(notification).values({
      recipientId: w.worker.id,
      actorId: w.lead.id,
      projectId: w.prj.id,
      lane: 'info',
      kind: 'project_member_added',
      refType: 'project',
      refId: w.prj.id,
      dedupeKey: `trashleak:${crypto.randomUUID()}`,
      payload: { projectName: w.prj.name },
      createdAt: NOW,
      updatedAt: NOW,
    });
    await trashTask(principal(w.lead), String(w.doomed.number), NOW);
    const after = await snapshot(w);
    expect(after).toMatchObject({ inbox: 1, news: 1 });
  });
});
