/** "Mine" (`mineOf`): an unassigned task belongs to its creator until someone is assigned, in Tugas saya, its counts and My Focus. */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { task } from '../../server/db/schema';
import { getFocus } from '../../server/home/home.focus.query';
import type { ListTasksResult } from '../../server/task/task.dto';
import { countTasks, listTasks } from '../../server/task/task.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tmine' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const principal = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });
const clock = { now: ATLAS_NOW, today: '2026-10-07' };

let creator: TestUser;
let mate: TestUser;
let project: TestProject;
beforeAll(async () => {
  creator = await cleaner.shared(() => f.user({ role: 'project_manager' }));
  mate = await cleaner.shared(() => f.user());
  project = await cleaner.shared(() => f.project({ lead: creator, members: [[mate, 'member']] }));
});

function good(res: ListTasksResult) {
  if (!res.ok) throw new Error(`list refused with ${res.code}`);
  return res;
}
const mine = async (u: TestUser) =>
  good(await listTasks(principal(u), { scope: 'mine' }, clock)).items.map((i) => i.title);

describe('unassigned tasks in Tugas saya', () => {
  it("are the creator's, not a teammate's", async () => {
    await f.task({ project, creator, title: 'Belum ada pengerja' });
    expect(await mine(creator)).toEqual(['Belum ada pengerja']);
    expect(await mine(mate)).toEqual([]);
  });

  it('move to the assignee once someone is assigned, and back to the creator when emptied again', async () => {
    const t = await f.task({ project, creator, title: 'Diserahkan' });
    await db.update(task).set({ assigneeId: mate.id }).where(eq(task.id, t.id));
    expect(await mine(creator)).toEqual([]);
    expect(await mine(mate)).toEqual(['Diserahkan']);

    await db.update(task).set({ assigneeId: null }).where(eq(task.id, t.id));
    expect(await mine(creator)).toEqual(['Diserahkan']);
    expect(await mine(mate)).toEqual([]);
  });

  it('stay out when created by someone else, or when the creator account is gone', async () => {
    await f.task({ project, creator: mate, title: 'Buatan rekan' });
    await f.task({ project, creator: null, title: 'Tanpa pembuat' });
    expect(await mine(creator)).toEqual([]);
    expect(await mine(mate)).toEqual(['Buatan rekan']);
  });

  it('are counted in the tab counts like the list shows them', async () => {
    await f.task({ project, creator, title: 'Tanpa tenggat' });
    await f.task({ project, creator, assignee: mate, title: 'Punya rekan' });
    const counts = await countTasks(principal(creator), clock);
    expect(counts.mine.none).toBe(1);
    expect(counts.byStatus.todo).toBe(1);
  });

  it("show in the creator's My Focus on Beranda", async () => {
    await f.task({ project, creator, title: 'Fokus tanpa pengerja' });
    const creatorFocus = await getFocus(principal(creator), clock);
    expect(creatorFocus.items.map((i) => i.title)).toEqual(['Fokus tanpa pengerja']);
    expect(creatorFocus.total).toBe(1);
    expect((await getFocus(principal(mate), clock)).items).toEqual([]);
  });
});
