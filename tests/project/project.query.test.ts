/** Project reads (S1-02): visibility, list filters and paging, progress and condition, golden Atlas numbers, query counts. */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project } from '../../server/db/schema';
import { toPrincipal } from '../../server/project/membership.query';
import {
  getProjectDetail,
  type ListProjectsInput,
  listProjectMembers,
  listProjects,
} from '../../server/project/project.query';
import { type AtlasScenario, seedAtlas } from '../support/atlas';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'prjq' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const NOW = ATLAS_NOW; // Wednesday 2026-10-07 in the team zone
const principal = (u: TestUser) => toPrincipal({ user: u, role: u.role });
const ALL_PAGES = { limit: 100, offset: 0, now: NOW } as const;

/** Lists with `q` set to a per-test marker so rows left by other files never leak into the assertions. */
const list = (u: TestUser, marker: string, o: Partial<ListProjectsInput> = {}) =>
  listProjects(principal(u), { scope: 'all', q: marker, sort: 'name', ...ALL_PAGES, ...o });
const names = (r: { items: { name: string }[] }) => r.items.map((i) => i.name);
const marker = () => `m${crypto.randomUUID().slice(0, 8)}`;

describe('listProjects visibility', () => {
  async function graph() {
    const mk = marker();
    const lead = await f.user({ role: 'project_manager' });
    const me = await f.user();
    const p1 = await f.project({ lead, members: [[me, 'member']], name: `${mk} A` });
    const p2 = await f.project({ lead, members: [[me, 'viewer']], name: `${mk} B` });
    const p3 = await f.project({ lead, name: `${mk} C` }); // `me` is not a member
    return { mk, lead, me, p1, p2, p3 };
  }

  it('shows a Member only the projects they follow', async () => {
    const { mk, me } = await graph();
    const r = await list(me, mk, { scope: 'mine' });
    expect(names(r)).toEqual([`${mk} A`, `${mk} B`]);
    expect(r.total).toBe(2);
    expect(r.items.map((i) => i.myRole)).toEqual(['member', 'viewer']);
  });

  it('narrows scope=all from a Member to mine without an error (M11)', async () => {
    const { mk, me } = await graph();
    const r = await list(me, mk, { scope: 'all' });
    expect(names(r)).toEqual([`${mk} A`, `${mk} B`]);
    expect(r.total).toBe(2);
  });

  it('lets a Project Manager who is not a member read every project (P_A1) with myRole null', async () => {
    const { mk } = await graph();
    const pmX = await f.user({ role: 'project_manager' });
    const all = await list(pmX, mk, { scope: 'all' });
    expect(names(all)).toEqual([`${mk} A`, `${mk} B`, `${mk} C`]);
    expect(all.items.every((i) => i.myRole === null)).toBe(true);
    expect((await list(pmX, mk, { scope: 'mine' })).total).toBe(0);
  });

  it('lets an Admin read every project', async () => {
    const { mk } = await graph();
    const admin = await f.user({ role: 'admin' });
    expect((await list(admin, mk)).total).toBe(3);
  });

  it('leaves trashed projects out of the list, the total and the detail', async () => {
    const { mk, lead, me } = await graph();
    const gone = await f.project({ lead, members: [[me, 'member']], name: `${mk} D` });
    await db
      .update(project)
      .set({ deletedAt: NOW, deletedBy: lead.id })
      .where(eq(project.id, gone.id));
    expect((await list(me, mk, { scope: 'mine' })).total).toBe(2);
    expect(await getProjectDetail(principal(lead), gone.id, NOW)).toBeNull();
  });
});

describe('listProjects search, filter, order and paging', () => {
  it('searches names case-insensitively and treats % and _ as plain text', async () => {
    const mk = marker();
    const lead = await f.user({ role: 'project_manager' });
    await f.project({ lead, name: `${mk} Selesai 100% Hari` });
    await f.project({ lead, name: `${mk} Selesai 1000 Hari` });
    await f.project({ lead, name: `${mk} a_b` });
    await f.project({ lead, name: `${mk} axb` });
    expect((await list(lead, `${mk} SELESAI`)).total).toBe(2);
    expect(names(await list(lead, `${mk} Selesai 100%`))).toEqual([`${mk} Selesai 100% Hari`]);
    expect(names(await list(lead, `${mk} a_b`))).toEqual([`${mk} a_b`]);
  });

  it('filters by status', async () => {
    const mk = marker();
    const lead = await f.user({ role: 'project_manager' });
    await f.project({ lead, name: `${mk} aktif`, status: 'active' });
    await f.project({ lead, name: `${mk} draf`, status: 'draft' });
    expect(names(await list(lead, mk, { status: 'draft' }))).toEqual([`${mk} draf`]);
  });

  it('orders by due date with no-deadline projects last, then by name', async () => {
    const mk = marker();
    const lead = await f.user({ role: 'project_manager' });
    await f.project({ lead, name: `${mk} tanpa tenggat` });
    await f.project({ lead, name: `${mk} desember`, dueDate: '2026-12-01' });
    await f.project({ lead, name: `${mk} november`, dueDate: '2026-11-01' });
    await f.project({ lead, name: `${mk} aaa tanpa tenggat` });
    expect(names(await list(lead, mk, { sort: 'due' }))).toEqual([
      `${mk} november`,
      `${mk} desember`,
      `${mk} aaa tanpa tenggat`,
      `${mk} tanpa tenggat`,
    ]);
  });

  it('carries startDate and dueDate on every list item (null when unset), for the Gantt view', async () => {
    const mk = marker();
    const lead = await f.user({ role: 'project_manager' });
    await f.project({ lead, name: `${mk} a`, startDate: '2026-10-01', dueDate: '2026-11-15' });
    await f.project({ lead, name: `${mk} b`, dueDate: '2026-12-01' });
    await f.project({ lead, name: `${mk} c` });
    const r = await list(lead, mk);
    expect(r.items.map((i) => [i.name.slice(-1), i.startDate, i.dueDate])).toEqual([
      ['a', '2026-10-01', '2026-11-15'],
      ['b', null, '2026-12-01'],
      ['c', null, null],
    ]);
  });

  it('pages with offset and reports the full total, even past the end', async () => {
    const mk = marker();
    const lead = await f.user({ role: 'project_manager' });
    for (const n of ['1', '2', '3']) await f.project({ lead, name: `${mk} ${n}` });
    const page = await list(lead, mk, { limit: 2, offset: 2 });
    expect(names(page)).toEqual([`${mk} 3`]);
    expect(page.total).toBe(3);
    const past = await list(lead, mk, { limit: 2, offset: 40 });
    expect(past).toEqual({ items: [], total: 3 });
  });
});

describe('progress and condition', () => {
  async function one(status: 'active' | 'draft' = 'active', dueDate: string | null = null) {
    const lead = await f.user({ role: 'project_manager' });
    const project = await f.project({ lead, status, dueDate, name: `${marker()} proyek` });
    const item = async () => {
      const r = await listProjects(principal(lead), { scope: 'mine', ...ALL_PAGES });
      const found = r.items.find((i) => i.id === project.id);
      if (!found) throw new Error('project missing from its own list');
      return found;
    };
    return { lead, project, item };
  }

  it('reports null percent, not 0, for a project without tasks', async () => {
    const { item } = await one();
    expect((await item()).progress).toEqual({ done: 0, total: 0, percent: null });
  });

  it('counts neither canceled nor trashed tasks, and in_review is not done', async () => {
    const { project, item } = await one();
    await f.task({ project, status: 'done' });
    await f.task({ project, status: 'in_review' });
    await f.task({ project, status: 'canceled' });
    await f.task({ project, status: 'done', deletedAt: NOW });
    expect((await item()).progress).toEqual({ done: 1, total: 2, percent: 50 });
  });

  it('says on_track with no reason when nothing is late', async () => {
    const { project, item } = await one();
    await f.task({ project, status: 'todo', due: '2026-10-07' }); // due today is not overdue
    expect((await item()).condition).toEqual({ level: 'on_track', reason: null });
  });

  it('flags an important overdue task in words', async () => {
    const { project, item } = await one();
    await f.task({ project, status: 'todo', priority: 'high', due: '2026-10-01' });
    await f.tasks(project, 4, () => ({ status: 'todo', due: '2026-10-20' })); // keep the late share at 20%, not above it
    expect((await item()).condition).toEqual({
      level: 'at_risk',
      reason: '1 tugas penting terlambat',
    });
  });

  it('says off_track once the project itself is past due', async () => {
    const { item } = await one('active', '2026-10-02');
    expect((await item()).condition).toEqual({
      level: 'off_track',
      reason: 'tenggat lewat 5 hari',
    });
  });

  it('gives a project that is not active no condition at all', async () => {
    const { project, item } = await one('draft');
    await f.task({ project, status: 'todo', priority: 'critical', due: '2026-10-01' });
    expect((await item()).condition).toBeNull();
  });
});

describe('Atlas golden numbers', () => {
  let s: AtlasScenario;
  beforeAll(async () => {
    s = await cleaner.shared(() => seedAtlas(f, { now: NOW }));
  });

  it('lists Atlas at 17% and "1 tugas penting terlambat", with only the lead id and name', async () => {
    const r = await listProjects(principal(s.users.nico), { scope: 'mine', ...ALL_PAGES });
    const atlas = r.items.find((i) => i.id === s.projects.atlas.id);
    expect(atlas).toMatchObject({
      name: 'Proyek Atlas',
      status: 'active',
      dueDate: s.projects.atlas.dueDate,
      progress: { done: 1, total: 6, percent: 17 },
      condition: { level: 'at_risk', reason: '1 tugas penting terlambat' },
      myRole: 'manager',
    });
    expect(Object.keys(atlas?.lead ?? {}).sort()).toEqual(['id', 'name']);
    expect(atlas?.lead?.id).toBe(s.users.nico.id);
    expect(JSON.stringify(r)).not.toContain('example.test'); // no email anywhere (Q8)
  });

  it('adds task counts and can{} to the detail', async () => {
    const asNico = await getProjectDetail(principal(s.users.nico), s.projects.atlas.id, NOW);
    expect(asNico?.taskCounts).toEqual({ active: 5, overdue: 1, live: 6 });
    expect(asNico?.originalDueDate).not.toBeNull();
    expect(asNico?.can.update).toBe(true);
    expect(asNico?.can.trash).toBe(true);
    const asSri = await getProjectDetail(principal(s.users.sri), s.projects.atlas.id, NOW);
    expect(asSri?.myRole).toBe('viewer');
    expect(asSri?.can.update).not.toBe(true);
    expect(asSri?.can.createTask).not.toBe(true);
  });
});

describe('getProjectDetail visibility', () => {
  it('answers null alike for a random id and for a project the Member does not follow', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const outsider = await f.user();
    const p = await f.project({ lead });
    expect(await getProjectDetail(principal(outsider), p.id, NOW)).toBeNull();
    expect(await getProjectDetail(principal(outsider), `${f.tag}-nope`, NOW)).toBeNull();
  });

  it('lets a non-member Project Manager and an Admin read, without manage rights for the PM', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const pmX = await f.user({ role: 'project_manager' });
    const admin = await f.user({ role: 'admin' });
    const p = await f.project({ lead });
    const asPm = await getProjectDetail(principal(pmX), p.id, NOW);
    expect(asPm?.id).toBe(p.id);
    expect(asPm?.myRole).toBeNull();
    expect(asPm?.can.update).not.toBe(true);
    expect((await getProjectDetail(principal(admin), p.id, NOW))?.can.update).toBe(true);
  });
});

describe('listProjectMembers', () => {
  it('lists managers first, then by name, flags the lead and carries no email', async () => {
    const lead = await f.user({ role: 'project_manager', name: 'Zed Lead' });
    const ann = await f.user({ name: 'Ann Member' });
    const bob = await f.user({ name: 'Bob Viewer' });
    const p = await f.project({
      lead,
      members: [
        [bob, 'viewer'],
        [ann, 'member'],
      ],
    });
    const items = await listProjectMembers(principal(ann), p.id);
    expect(items?.map((i) => [i.name, i.role, i.isLead])).toEqual([
      ['Zed Lead', 'manager', true],
      ['Ann Member', 'member', false],
      ['Bob Viewer', 'viewer', false],
    ]);
    expect(Object.keys(items?.[0] ?? {}).sort()).toEqual(
      ['image', 'isLead', 'joinedAt', 'jobTitle', 'name', 'role', 'userId'].sort(),
    );
    expect(new Date(items?.[0]?.joinedAt ?? '').getTime()).toBeGreaterThan(0);
  });

  it('answers null for a hidden or unknown project and lets a non-member PM read', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const outsider = await f.user();
    const pmX = await f.user({ role: 'project_manager' });
    const p = await f.project({ lead });
    expect(await listProjectMembers(principal(outsider), p.id)).toBeNull();
    expect(await listProjectMembers(principal(outsider), `${f.tag}-nope`)).toBeNull();
    expect((await listProjectMembers(principal(pmX), p.id))?.length).toBe(1);
  });
});

describe('query counts stay constant (R04 §3.7)', () => {
  const MAX_QUERIES = 4;

  async function listWith(n: number) {
    const lead = await f.user({ role: 'project_manager' });
    const me = await f.user();
    for (let i = 0; i < n; i++) {
      const project = await f.project({ lead, members: [[me, 'member']], name: `Hitung ${i}` }); // test-only
      await f.tasks(project, 3, (j) => ({ status: j === 0 ? 'done' : 'todo' }));
    }
    const { exec, queries } = countQueries();
    const r = await listProjects(principal(me), { scope: 'mine', ...ALL_PAGES }, exec);
    return { r, count: queries.length };
  }

  it('lists 3 and 30 projects with the same number of statements', async () => {
    const small = await listWith(3);
    const big = await listWith(30);
    expect(small.r.items).toHaveLength(3);
    expect(big.r.items).toHaveLength(30);
    expect(small.count).toBeGreaterThan(0); // a counter that saw nothing would pass the checks below for free
    expect(small.count).toBeLessThanOrEqual(MAX_QUERIES);
    expect(big.count).toBe(small.count);
  });

  it('reads a detail and a member list within the budget', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const p = await f.project({ lead });
    await f.tasks(p, 5);
    const detail = countQueries();
    await getProjectDetail(principal(lead), p.id, NOW, detail.exec);
    expect(detail.queries.length).toBeLessThanOrEqual(MAX_QUERIES);
    const members = countQueries();
    await listProjectMembers(principal(lead), p.id, members.exec);
    expect(members.queries.length).toBeLessThanOrEqual(MAX_QUERIES);
  });
});
