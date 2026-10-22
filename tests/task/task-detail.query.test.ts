/** Task detail and `:ref` resolution (S2-02): number or id, checklist order, labels, `can{}`, and identical 404s for hidden tasks. */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { project, task, taskChecklistItem } from '../../server/db/schema';
import { getTaskDetail, resolveTaskRef } from '../../server/task/task-detail.query';
import { type AtlasScenario, seedAtlas } from '../support/atlas';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tdet' });
afterAll(() => cleaner.flushAll());

const principal = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });
let atlas: AtlasScenario;
let clock: { now: Date; today: string };
beforeAll(async () => {
  atlas = await cleaner.shared(() => seedAtlas(f));
  clock = { now: ATLAS_NOW, today: atlas.today };
});

const detail = async (u: TestUser, ref: string) => getTaskDetail(principal(u), ref, clock);
const NOT_FOUND = { ok: false, code: 'NOT_FOUND' } as const;

describe('resolveTaskRef', () => {
  it('reads digits as the global number and anything else as an id', async () => {
    const t = atlas.tasks.specApi;
    expect(await resolveTaskRef(String(t.number))).toEqual({
      id: t.id,
      projectId: t.projectId,
      number: t.number,
    });
    expect(await resolveTaskRef(t.id)).toEqual({
      id: t.id,
      projectId: t.projectId,
      number: t.number,
    });
  });

  it.each([
    ['an unknown number', '999999999'],
    ['a number too long to be exact', '1'.repeat(16)],
    ['an unknown id', 'tidak-ada'],
    ['an empty ref', ''],
  ])('finds nothing for %s', async (_name, ref) => {
    expect(await resolveTaskRef(ref)).toBeNull();
  });

  it('does not resolve a task in the Trash or in a trashed project', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const p = await f.project({ lead });
    const trashed = await f.task({ project: p, deletedAt: new Date() });
    const live = await f.task({ project: p });
    expect(await resolveTaskRef(trashed.id)).toBeNull();
    expect(await resolveTaskRef(live.id)).not.toBeNull();
    await db.update(project).set({ deletedAt: new Date() }).where(eq(project.id, p.id));
    expect(await resolveTaskRef(live.id)).toBeNull();
    expect(await resolveTaskRef(String(live.number))).toBeNull();
  });
});

describe('getTaskDetail', () => {
  it('loads the task for a manager by number and by id, with kind, people and project', async () => {
    const t = atlas.tasks.fixSso;
    const byNumber = await detail(atlas.users.nico, String(t.number));
    const byId = await detail(atlas.users.nico, t.id);
    expect(byNumber).toEqual(byId);
    if (!byNumber.ok) throw new Error('expected the task');
    const d = byNumber.task;
    expect(d).toMatchObject({
      id: t.id,
      title: t.title,
      status: 'in_progress',
      priority: 'high',
      needsReview: true,
      labels: ['overdue'],
      kind: { baseKind: 'issue' },
      project: { id: atlas.projects.atlas.id, name: atlas.projects.atlas.name, status: 'active' },
      assignee: { id: atlas.users.nico.id, name: atlas.users.nico.name },
      creator: { id: atlas.users.rina.id },
      reviewer: { id: atlas.users.admin.id },
      cancel: null,
      checklist: { done: 0, total: 0, items: [] },
    });
    expect(d.createdAt).toBe(t.createdAt.toISOString());
    expect(d.can.update).toBe(true);
  });

  it('sends an assignee only the controls they may use, a viewer none that write', async () => {
    const t = atlas.tasks.specApi;
    const asViewer = await detail(atlas.users.sri, t.id);
    if (!asViewer.ok) throw new Error('a viewer can read the task');
    expect(asViewer.task.can.update).toBeUndefined();
    expect(asViewer.task.can.start).toBeUndefined();
    expect(asViewer.task.primary).toBeNull();
    const asOwner = await detail(atlas.users.nico, t.id);
    if (!asOwner.ok) throw new Error('the assignee can read the task');
    expect(asOwner.task.primary).toBe('start');
    expect(asOwner.task.can.comment).toBe(true);
  });

  it('lets a Project Manager who is not a member read, but not write', async () => {
    const pm = await f.user({ role: 'project_manager' });
    const res = await detail(pm, atlas.tasks.specApi.id);
    if (!res.ok) throw new Error('P-A1: a non-member PM reads');
    expect(res.task.can.update).toBeUndefined();
    expect(res.task.can.comment).toBeUndefined();
  });

  it('lists the checklist in position order with its progress', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const p = await f.project({ lead });
    const t = await f.task({ project: p, creator: lead });
    const rows = [2, 0, 1].map((position) => ({
      id: cleaner.track('taskPart', `tdet-chk-${position}-${crypto.randomUUID().slice(0, 8)}`),
      taskId: t.id,
      text: `Langkah ${position}`, // test-only
      isDone: position !== 1,
      position,
    }));
    await db.insert(taskChecklistItem).values(rows);
    const res = await detail(lead, t.id);
    if (!res.ok) throw new Error('expected the task');
    expect(res.task.checklist.items.map((i) => i.position)).toEqual([0, 1, 2]);
    expect(res.task.checklist).toMatchObject({ done: 2, total: 3 });
  });

  it('shows the cancel reason of a canceled task', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const p = await f.project({ lead });
    const t = await f.task({ project: p, status: 'canceled' });
    await db.update(task).set({ cancelNote: 'dobel' }).where(eq(task.id, t.id)); // test-only
    const res = await detail(lead, t.id);
    if (!res.ok) throw new Error('expected the task');
    expect(res.task.cancel).toEqual({ category: 'not_needed', note: 'dobel' });
    expect(res.task.primary).toBe('uncancel');
  });

  it('answers a hidden, a trashed and a missing task with the very same body', async () => {
    const outsider = await f.user();
    const lead = await f.user({ role: 'project_manager' });
    const p = await f.project({ lead });
    const trashedTask = await f.task({ project: p, deletedAt: new Date() });
    const inTrashedProject = await f.project({ lead });
    const hiddenByProject = await f.task({ project: inTrashedProject });
    await db
      .update(project)
      .set({ deletedAt: new Date() })
      .where(eq(project.id, inTrashedProject.id));
    const refs = [
      String(atlas.tasks.specApi.number), // a real task the outsider may not see
      atlas.tasks.specApi.id,
      '987654321',
      'bukan-id',
      '9'.repeat(20),
    ];
    for (const ref of refs) expect(await detail(outsider, ref)).toEqual(NOT_FOUND);
    expect(await detail(lead, trashedTask.id)).toEqual(NOT_FOUND);
    expect(await detail(lead, hiddenByProject.id)).toEqual(NOT_FOUND);
  });
});
