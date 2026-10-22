/** Merged Trash list (S6 D1): projects and tasks in one page, `kind` filter, counts, visibility per role and constant query count. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { task } from '../../server/db/schema';
import { trashProject } from '../../server/project/project-trash.service';
import { restoreTask, trashTask } from '../../server/task/task-trash.service';
import { listTrash, type TrashKindFilter } from '../../server/trash/trash.list.query';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'trashlist' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const MIN_MS = 60_000;
const T0 = new Date('2026-10-10T03:00:00Z'); // test-only: 10.00 WIB
const at = (minutes: number) => new Date(T0.getTime() + minutes * MIN_MS);
const principal = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });

async function list(u: TestUser, kind: TrashKindFilter = 'all', limit = 50, offset = 0) {
  return listTrash(principal(u), { kind, limit, offset, now: at(60) });
}
const ids = (r: Awaited<ReturnType<typeof list>>) => r.items.map((i) => i.id);

async function world() {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const other = await f.user();
  const admin = await f.user({ role: 'admin' });
  const prj = await f.project({ lead, members: [[member, 'member']] });
  const mine = await f.task({ project: prj, creator: member, assignee: member });
  const theirs = await f.task({ project: prj, creator: lead, assignee: lead });
  return { lead, member, other, admin, prj, mine, theirs };
}

describe('listTrash', () => {
  it('merges a trashed project and a trashed task, newest delete first, with counts for both', async () => {
    const w = await world();
    const lonely = await f.project({ lead: w.lead });
    expect((await trashTask(principal(w.lead), String(w.mine.number), at(1))).ok).toBe(true);
    expect((await trashProject(principal(w.lead), lonely.id, at(2))).ok).toBe(true);
    const r = await list(w.lead);
    expect(r.items.map((i) => [i.kind, i.id])).toEqual([
      ['project', lonely.id],
      ['task', w.mine.id],
    ]);
    expect(r.total).toBe(2);
    expect(r.counts).toEqual({ project: 1, task: 1, event: 0 });
    expect((await list(w.lead, 'task')).items.map((i) => i.kind)).toEqual(['task']);
    const onlyProjects = await list(w.lead, 'project');
    expect(onlyProjects.items.map((i) => i.kind)).toEqual(['project']);
    expect(onlyProjects.total).toBe(1);
    expect(onlyProjects.counts).toEqual({ project: 1, task: 1, event: 0 });
  });

  it('describes a task row: number, title, project, deleter, restore limit and can.restore', async () => {
    const w = await world();
    await trashTask(principal(w.member), String(w.mine.number), at(1));
    const [item] = (await list(w.member)).items;
    expect(item).toMatchObject({
      kind: 'task',
      id: w.mine.id,
      number: w.mine.number,
      title: w.mine.title,
      project: { id: w.prj.id, name: w.prj.name },
      blockedBy: null,
      deletedBy: { id: w.member.id, name: w.member.name },
      can: { restore: true },
    });
    expect(item?.kind === 'task' && item.restorableUntil).toBe('2026-11-08');
  });

  it('does not list a task that went with its project as a row of its own', async () => {
    const w = await world();
    await trashProject(principal(w.lead), w.prj.id, at(1));
    const r = await list(w.lead);
    expect(r.items.map((i) => i.kind)).toEqual(['project']);
    expect(r.counts).toEqual({ project: 1, task: 0, event: 0 });
  });

  it('keeps a task trashed before its project as its own row, blocked until the project is back', async () => {
    const w = await world();
    await trashTask(principal(w.lead), String(w.theirs.number), at(1));
    await trashProject(principal(w.lead), w.prj.id, at(2));
    const taskRow = (await list(w.lead)).items.find((i) => i.kind === 'task');
    expect(taskRow).toMatchObject({
      id: w.theirs.id,
      blockedBy: { projectId: w.prj.id, name: w.prj.name },
      can: { restore: 'PROJECT_IN_TRASH' },
    });
    // Restoring the project must leave that task in the Trash (it was deleted on its own first).
    const rows = await db
      .select({ id: task.id, deletedAt: task.deletedAt })
      .from(task)
      .where(eq(task.projectId, w.prj.id));
    expect(rows.filter((r) => r.deletedAt === null).map((r) => r.id)).toEqual([]);
  });

  it('shows each role only what it may restore: the deleter, the managers and Admin', async () => {
    const w = await world();
    await trashTask(principal(w.member), String(w.mine.number), at(1));
    await trashTask(principal(w.lead), String(w.theirs.number), at(2));
    expect(ids(await list(w.member))).toEqual([w.mine.id]);
    expect(ids(await list(w.lead))).toEqual([w.theirs.id, w.mine.id]);
    expect(ids(await list(w.admin))).toEqual(expect.arrayContaining([w.theirs.id, w.mine.id]));
    expect(await list(w.other)).toMatchObject({
      items: [],
      total: 0,
      counts: { project: 0, task: 0, event: 0 },
    });
  });

  it('pages across both kinds without repeating or skipping a row', async () => {
    const w = await world();
    const extra = await f.tasks(w.prj, 3);
    for (const [i, t] of extra.entries())
      await trashTask(principal(w.lead), String(t.number), at(i));
    const p2 = await f.project({ lead: w.lead });
    await trashProject(principal(w.lead), p2.id, at(10));
    const seen: string[] = [];
    for (let offset = 0; offset < 4; offset += 2)
      seen.push(...ids(await list(w.lead, 'all', 2, offset)));
    expect(seen).toHaveLength(4);
    expect(new Set(seen).size).toBe(4);
    expect(seen[0]).toBe(p2.id);
  });

  it('forgets a task once it is restored', async () => {
    const w = await world();
    await trashTask(principal(w.lead), String(w.mine.number), at(1));
    expect((await list(w.lead)).total).toBe(1);
    expect((await restoreTask(principal(w.lead), w.mine.id, at(5))).ok).toBe(true);
    expect((await list(w.lead)).total).toBe(0);
  });

  it('sends the same number of statements for one row of each kind and for twelve', async () => {
    const w = await world();
    const run = async () => {
      const counter = countQueries();
      await listTrash(
        principal(w.lead),
        { kind: 'all', limit: 50, offset: 0, now: at(60) },
        counter.exec,
      );
      return counter.queries.length;
    };
    const t1 = await f.task({ project: w.prj });
    await trashTask(principal(w.lead), String(t1.number), at(1));
    await trashProject(principal(w.lead), (await f.project({ lead: w.lead })).id, at(1));
    const few = await run();
    for (const t of await f.tasks(w.prj, 8))
      await trashTask(principal(w.lead), String(t.number), at(2));
    for (let i = 0; i < 3; i++)
      await trashProject(principal(w.lead), (await f.project({ lead: w.lead })).id, at(3));
    expect(await run()).toBe(few);
  });
});
