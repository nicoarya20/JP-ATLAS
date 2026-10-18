/**
 * Team reads (S6 M02) against a real database: who is listed, which projects are shown, and the
 * D10 load privacy — a caller who may not count someone's work must get no key at all, not a zero.
 * Also the golden Atlas numbers, the query budget, and parity with the pure `isOverdue`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project, task } from '../../server/db/schema';
import { isOverdue } from '../../server/metrics/task.metrics';
import { toPrincipal } from '../../server/project/membership.query';
import { ATLAS_REFERENCE_DATE } from '../../server/seed/atlas.data';
import type { ListTeamOk, ListTeamResult, Refused } from '../../server/team/team.dto';
import { isRefused } from '../../server/team/team.dto';
import { listTeam } from '../../server/team/team.query';
import { type AtlasScenario, seedAtlas } from '../support/atlas';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'teamq' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const NOW = ATLAS_NOW; // Wednesday 2026-10-07 in the team zone
const TODAY = ATLAS_REFERENCE_DATE;
const principal = (u: TestUser) => toPrincipal({ user: u, role: u.role });
const marker = () => `m${crypto.randomUUID().slice(0, 8)}`;

/** Lists with `q` set to a per-test marker, so rows other files leave behind never reach an assertion. */
const list = (u: TestUser, q: string, o: Record<string, unknown> = {}) =>
  listTeam(principal(u), { q, limit: 100, ...o }, NOW);

/** The success branch has no `ok` key (it is the response body), so a refusal is the narrow case. */
function ok<T extends ListTeamResult>(r: T): Exclude<T, Refused> {
  if (isRefused(r)) throw new Error(`refused with ${r.code}`);
  return r as Exclude<T, Refused>;
}
const refusal = (r: ListTeamResult) => (isRefused(r) ? r.code : 'allowed');
const names = (r: ListTeamOk) => r.people.map((x) => x.name);
const person = (r: ListTeamOk, u: TestUser) => r.people.find((x) => x.id === u.id);

describe('listTeam visibility', () => {
  /** Two projects: `a` holds the manager, a member, an observer; `b` only the manager and an outsider. */
  async function graph() {
    const mk = marker();
    const boss = await f.user({ role: 'project_manager', name: `${mk} Boss` });
    const mate = await f.user({ name: `${mk} Mate` });
    const watcher = await f.user({ name: `${mk} Watcher` });
    const far = await f.user({ name: `${mk} Far` });
    const a = await f.project({
      lead: boss,
      members: [
        [mate, 'member'],
        [watcher, 'viewer'],
      ],
      name: `${mk} A`,
    });
    const b = await f.project({ lead: boss, members: [[far, 'member']], name: `${mk} B` });
    return { mk, boss, mate, watcher, far, a, b };
  }

  it('shows a Member only the people of the projects they follow', async () => {
    const { mk, mate } = await graph();
    const r = ok(await list(mate, mk));
    expect(names(r).sort()).toEqual([`${mk} Boss`, `${mk} Mate`, `${mk} Watcher`]);
    expect(r.total).toBe(3);
  });

  it('puts the caller first and the rest A-Z', async () => {
    const { mk, watcher } = await graph();
    expect(names(ok(await list(watcher, mk)))).toEqual([
      `${mk} Watcher`,
      `${mk} Boss`,
      `${mk} Mate`,
    ]);
  });

  it('marks the caller with isSelf and nobody else', async () => {
    const { mk, mate } = await graph();
    const r = ok(await list(mate, mk));
    expect(r.people.filter((x) => x.isSelf).map((x) => x.id)).toEqual([mate.id]);
  });

  it('lets an Admin list people from projects they never joined', async () => {
    const { mk } = await graph();
    const admin = await f.user({ role: 'admin', name: `${mk} Zadmin` });
    const r = ok(await list(admin, mk));
    expect(names(r)).toContain(`${mk} Far`);
    expect(r.total).toBe(5);
  });

  it('shows a non-member Project Manager an empty team, their own row included', async () => {
    const { mk } = await graph();
    const pmX = await f.user({ role: 'project_manager', name: `${mk} Lone` });
    // The account role reads every project (P-A1) but Team follows project roles (D10), and
    // somebody who joined nothing has no team yet: the page shows the empty state (P7 §4).
    const r = ok(await list(pmX, mk));
    expect(names(r)).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.summary).toEqual({ people: 0, projects: 0 });
  });

  it('leaves out accounts that are banned or still pending', async () => {
    const { mk, boss, mate } = await graph();
    const held = await f.user({ status: 'pending', name: `${mk} Held` });
    const banned = await f.user({ banned: true, name: `${mk} Banned` });
    await f.project({
      lead: boss,
      members: [
        [held, 'member'],
        [banned, 'member'],
      ],
      name: `${mk} C`,
    });
    const r = ok(await list(mate, mk));
    expect(names(r)).not.toContain(`${mk} Held`);
    expect(names(r)).not.toContain(`${mk} Banned`);
  });

  it('never names a project the caller does not share', async () => {
    const { mk, mate, boss, a } = await graph();
    const r = ok(await list(mate, mk));
    const bossRow = person(r, boss);
    expect(bossRow?.projects.map((x) => x.id)).toEqual([a.id]); // B is the Member's blind spot
    expect(bossRow?.projects[0]?.role).toBe('manager');
  });

  it('reports each person their own role in the shared project', async () => {
    const { mk, boss, mate, watcher } = await graph();
    const r = ok(await list(boss, mk));
    expect(person(r, mate)?.projects[0]?.role).toBe('member');
    expect(person(r, watcher)?.projects[0]?.role).toBe('viewer');
  });
});

describe('listTeam filters and paging', () => {
  it('narrows to one project and refuses a project the caller may not see', async () => {
    const mk = marker();
    const boss = await f.user({ role: 'project_manager', name: `${mk} Boss` });
    const mate = await f.user({ name: `${mk} Mate` });
    const outsider = await f.user({ name: `${mk} Out` });
    const a = await f.project({ lead: boss, members: [[mate, 'member']], name: `${mk} A` });
    const b = await f.project({ lead: boss, members: [[outsider, 'member']], name: `${mk} B` });
    expect(names(ok(await list(boss, mk, { projectId: a.id }))).sort()).toEqual([
      `${mk} Boss`,
      `${mk} Mate`,
    ]);
    expect(refusal(await list(mate, mk, { projectId: b.id }))).toBe('NOT_FOUND');
    expect(refusal(await list(mate, mk, { projectId: 'tidak-ada' }))).toBe('NOT_FOUND');
  });

  it('hides a trashed project from the filter, the roles and the project count', async () => {
    const mk = marker();
    const boss = await f.user({ role: 'project_manager', name: `${mk} Boss` });
    const mate = await f.user({ name: `${mk} Mate` });
    const kept = await f.project({ lead: boss, name: `${mk} Kept` });
    const gone = await f.project({ lead: boss, members: [[mate, 'member']], name: `${mk} Gone` });
    // No factory helper trashes a project, and `trashProject` lives in a service this task may not
    // touch, so the column is set directly: the queries only ever read `deleted_at`.
    await db
      .update(project)
      .set({ deletedAt: NOW, deletedBy: boss.id })
      .where(eq(project.id, gone.id));
    expect(refusal(await list(boss, mk, { projectId: gone.id }))).toBe('NOT_FOUND');
    const r = ok(await list(boss, mk));
    expect(names(r)).toEqual([`${mk} Boss`]); // Mate shared only the trashed project
    expect(person(r, boss)?.projects.map((x) => x.id)).toEqual([kept.id]);
    expect(r.summary.projects).toBe(1);
  });

  it('pages with limit and offset while total counts the whole team', async () => {
    const mk = marker();
    const boss = await f.user({ role: 'project_manager', name: `${mk} Boss` });
    const mates: TestUser[] = [];
    for (const n of ['A', 'B', 'C']) mates.push(await f.user({ name: `${mk} ${n}` }));
    await f.project({
      lead: boss,
      members: mates.map((m) => [m, 'member'] as const),
      name: `${mk} P`,
    });
    const first = ok(await list(boss, mk, { limit: 2, offset: 0 }));
    const second = ok(await list(boss, mk, { limit: 2, offset: 2 }));
    expect(names(first)).toEqual([`${mk} Boss`, `${mk} A`]);
    expect(names(second)).toEqual([`${mk} B`, `${mk} C`]);
    expect(first.total).toBe(4);
    expect(second.total).toBe(4);
  });

  it('treats a search text as literal, so % matches nobody', async () => {
    const mk = marker();
    const boss = await f.user({ role: 'project_manager', name: `${mk} Boss` });
    await f.project({ lead: boss, name: `${mk} P` });
    expect(ok(await list(boss, `${mk}%`)).people).toHaveLength(0);
  });
});

describe('listTeam load privacy (D10)', () => {
  /** `mate` has 2 open tasks in A (1 overdue) and 1 open task in B, which only B's manager may count. */
  async function workload() {
    const mk = marker();
    const bossA = await f.user({ role: 'project_manager', name: `${mk} BossA` });
    const bossB = await f.user({ role: 'project_manager', name: `${mk} BossB` });
    const mate = await f.user({ name: `${mk} Mate` });
    const watcher = await f.user({ name: `${mk} Watcher` });
    const a = await f.project({
      lead: bossA,
      members: [
        [mate, 'member'],
        [watcher, 'viewer'],
      ],
      name: `${mk} A`,
    });
    const b = await f.project({ lead: bossB, members: [[mate, 'member']], name: `${mk} B` });
    await f.task({ project: a, assignee: mate, status: 'todo', due: '2026-10-01' }); // overdue
    await f.task({ project: a, assignee: mate, status: 'in_progress', due: TODAY }); // due today
    await f.task({ project: b, assignee: mate, status: 'todo', due: '2026-10-01' });
    return { mk, bossA, bossB, mate, watcher, a, b };
  }

  it('gives a manager only the numbers of the project they manage, plus alsoElsewhere', async () => {
    const { mk, bossA, mate } = await workload();
    const row = person(ok(await list(bossA, mk)), mate);
    expect(row?.load).toEqual({ active: 2, overdue: 1, alsoElsewhere: true });
  });

  it('gives an Admin every project and therefore no alsoElsewhere', async () => {
    const { mk, mate } = await workload();
    const admin = await f.user({ role: 'admin', name: `${mk} Zadmin` });
    expect(person(ok(await list(admin, mk)), mate)?.load).toEqual({ active: 3, overdue: 2 });
  });

  it('sends no load key at all to a Member, an Observer or a non-managing PM', async () => {
    const { mk, mate, watcher, bossB } = await workload();
    const colleague = await f.user({ name: `${mk} Peer` });
    for (const viewer of [mate, watcher, colleague]) {
      const r = ok(await list(viewer, mk));
      for (const row of r.people.filter((x) => x.id !== viewer.id)) {
        expect(row.load).toBeUndefined();
        expect(JSON.stringify(row)).not.toContain('load');
      }
    }
    // B's manager may count B, but is told nothing about anybody in A.
    const fromB = ok(await list(bossB, mk));
    expect(person(fromB, mate)?.load).toEqual({ active: 1, overdue: 1, alsoElsewhere: true });
  });

  it('always shows a person their own numbers, across every project they work in', async () => {
    const { mk, mate } = await workload();
    expect(person(ok(await list(mate, mk)), mate)?.load).toEqual({ active: 3, overdue: 2 });
  });

  it('counts a person with no task as zero rather than dropping the key', async () => {
    const { mk, bossA, watcher } = await workload();
    expect(person(ok(await list(bossA, mk)), watcher)?.load).toEqual({ active: 0, overdue: 0 });
  });

  it('leaves summary.active and summary.overdue out when nobody else may be counted', async () => {
    const { mk, mate, bossA } = await workload();
    const asMember = ok(await list(mate, mk));
    expect(asMember.summary.active).toBe(3); // their own numbers still count
    const peer = await f.user({ name: `${mk} Peer` });
    const asPeer = ok(await list(peer, mk));
    expect(asPeer.summary.active).toBeUndefined();
    expect(asPeer.summary.overdue).toBeUndefined();
    expect(ok(await list(bossA, mk)).summary.projects).toBe(1);
  });

  it('does not count a task in the Trash, or one whose project is', async () => {
    const { mk, bossA, mate, a, b } = await workload();
    const live = await f.task({ project: a, assignee: mate, status: 'todo', due: '2026-10-01' });
    expect(person(ok(await list(bossA, mk)), mate)?.load).toEqual({
      active: 3,
      overdue: 2,
      alsoElsewhere: true,
    });
    await db.update(task).set({ deletedAt: NOW, deletedBy: bossA.id }).where(eq(task.id, live.id));
    expect(person(ok(await list(bossA, mk)), mate)?.load).toEqual({
      active: 2,
      overdue: 1,
      alsoElsewhere: true,
    });
    // The task in B stays live, but trashing B takes it out of every count, alsoElsewhere included.
    await db
      .update(project)
      .set({ deletedAt: NOW, deletedBy: bossA.id })
      .where(eq(project.id, b.id));
    expect(person(ok(await list(bossA, mk)), mate)?.load).toEqual({ active: 2, overdue: 1 });
  });

  it('still counts tasks of a completed project (R03 Q10)', async () => {
    const mk = marker();
    const boss = await f.user({ role: 'project_manager', name: `${mk} Boss` });
    const mate = await f.user({ name: `${mk} Mate` });
    const done = await f.project({
      lead: boss,
      members: [[mate, 'member']],
      status: 'completed',
      name: `${mk} Done`,
    });
    await f.task({ project: done, assignee: mate, status: 'todo', due: '2026-10-01' });
    expect(person(ok(await list(boss, mk)), mate)?.load).toEqual({ active: 1, overdue: 1 });
  });

  it('sorts by overdue first when the caller may, and agrees with the pure isOverdue', async () => {
    const mk = marker();
    const boss = await f.user({ role: 'project_manager', name: `${mk} Boss` });
    const few = await f.user({ name: `${mk} AFew` });
    const many = await f.user({ name: `${mk} BMany` });
    const p = await f.project({
      lead: boss,
      members: [
        [few, 'member'],
        [many, 'member'],
      ],
      name: `${mk} P`,
    });
    const rows = [
      await f.task({ project: p, assignee: few, status: 'todo', due: '2026-10-01' }),
      await f.task({ project: p, assignee: many, status: 'todo', due: '2026-10-02' }),
      await f.task({ project: p, assignee: many, status: 'todo', due: '2026-10-03' }),
      await f.task({ project: p, assignee: many, status: 'todo', due: TODAY }),
    ];
    const r = ok(await list(boss, mk, { sort: 'overdue' }));
    expect(names(r)).toEqual([`${mk} BMany`, `${mk} AFew`, `${mk} Boss`]);
    expect(person(r, many)?.load?.overdue).toBe(2);
    // Layer-4 parity: the SQL count equals counting the same rows with the pure predicate.
    expect(rows.filter((t) => t.assigneeId === many.id && isOverdue(t, TODAY))).toHaveLength(2);
  });
});

describe('listTeam query budget', () => {
  async function listWith(people: number) {
    const mk = marker();
    const boss = await f.user({ role: 'project_manager', name: `${mk} Boss` });
    const mates: TestUser[] = [];
    for (let i = 0; i < people; i++) mates.push(await f.user({ name: `${mk} P${i}` }));
    const p = await f.project({
      lead: boss,
      members: mates.map((m) => [m, 'member'] as const),
      name: `${mk} P`,
    });
    for (const m of mates) await f.task({ project: p, assignee: m, status: 'todo', due: TODAY });
    const { exec, queries } = countQueries();
    const r = ok(await listTeam(principal(boss), { q: mk, limit: 100 }, NOW, exec));
    return { r, count: queries.length };
  }

  it('lists 3 and 40 people with at most four statements, and the same number for both', async () => {
    const small = await listWith(3);
    const big = await listWith(40);
    expect(small.r.people).toHaveLength(4);
    expect(big.r.people).toHaveLength(41);
    expect(small.count).toBeLessThanOrEqual(4);
    expect(big.count).toBe(small.count);
  });
});

describe('golden Atlas numbers', () => {
  const shared = createCleaner();
  const af = createFactory(shared, { tag: 'teamgold' });
  let atlas: AtlasScenario;
  beforeAll(async () => {
    atlas = await seedAtlas(af);
  });
  afterAll(() => shared.flushAll());

  it('matches the scenario: Nico carries 3 open tasks with 1 overdue in Atlas', async () => {
    const r = ok(
      await listTeam(principal(atlas.users.nico), { projectId: atlas.projects.atlas.id }, NOW),
    );
    const nico = r.people.find((x) => x.id === atlas.users.nico.id);
    // specApi (due today), reviewDesign and fixSso (the one overdue task); architecture is done.
    expect(nico?.load).toEqual({ active: 3, overdue: 1, alsoElsewhere: true });
    const dodi = r.people.find((x) => x.id === atlas.users.dodi.id);
    expect(dodi?.load).toEqual({ active: 2, overdue: 0 });
    expect(r.summary.projects).toBe(1);
  });

  it('counts Nico across both projects for an Admin, Sinar included', async () => {
    const r = ok(await listTeam(principal(atlas.users.admin), { limit: 100 }, NOW));
    const nico = r.people.find((x) => x.id === atlas.users.nico.id);
    expect(nico?.load).toEqual({ active: 4, overdue: 1 });
    expect(nico?.projects.map((x) => x.role).sort()).toEqual(['manager', 'member']);
  });

  it('tells the Observer nothing about anyone else, herself included as zero', async () => {
    const r = ok(
      await listTeam(principal(atlas.users.sri), { projectId: atlas.projects.atlas.id }, NOW),
    );
    expect(r.people.find((x) => x.id === atlas.users.nico.id)?.load).toBeUndefined();
    expect(r.people.find((x) => x.id === atlas.users.sri.id)?.load).toEqual({
      active: 0,
      overdue: 0,
    });
  });
});
