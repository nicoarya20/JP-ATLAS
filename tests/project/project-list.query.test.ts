/** Project list extras (S5a-04): the attention filter and the optional plan keep a constant number of statements. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { db } from '../../server/db';
import { projectMilestone, projectPhase } from '../../server/db/schema';
import { toPrincipal } from '../../server/project/membership.query';
import { type ListProjectsInput, listProjects } from '../../server/project/project.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'prjlst' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const principal = (u: TestUser) => toPrincipal({ user: u, role: u.role });
const PAGE = { limit: 100, offset: 0, now: ATLAS_NOW } as const;
const LONG_AGO = '2020-01-01'; // test-only
// Same budget as the plain list (6 with the total) plus the two plan statements; the attention path needs no total.
const LIST_MAX = 6;
const PLAN_STATEMENTS = 2;

/** `n` late (off track) projects of `me`, each with a milestone; every other project gets two phases. */
async function seedLate(n: number) {
  const lead = await f.user({ role: 'project_manager' });
  const me = await f.user();
  const marker = `lst${crypto.randomUUID().slice(0, 8)}`;
  const projects = await Promise.all(
    Array.from({ length: n }, (_, i) =>
      f.project({
        lead,
        members: [[me, 'member']],
        name: `${marker} ${i}`, // test-only
        dueDate: LONG_AGO,
      }),
    ),
  );
  await db.insert(projectMilestone).values(
    projects.map((p) => ({ projectId: p.id, title: 'Awal', dueDate: LONG_AGO })), // test-only
  );
  const phased = projects.filter((_, i) => i % 2 === 0);
  await db.insert(projectPhase).values(
    phased.flatMap((p) => [
      { projectId: p.id, name: 'Kedua', position: 1 },
      { projectId: p.id, name: 'Pertama', position: 0 },
    ]), // test-only
  );
  return { me, marker, projects, phased };
}

async function counted(me: TestUser, marker: string, over: Partial<ListProjectsInput>) {
  const { exec, queries } = countQueries();
  const r = await listProjects(
    principal(me),
    { scope: 'mine', q: marker, sort: 'name', ...PAGE, ...over },
    exec,
  );
  return { r, count: queries.length };
}

describe('attention filter: statements stay constant', () => {
  it('reads 3 and 30 candidate projects with the same number of statements', async () => {
    const small = await seedLate(3);
    const big = await seedLate(30);
    const a = await counted(small.me, small.marker, { attention: true });
    const b = await counted(big.me, big.marker, { attention: true });
    expect(a.r.total).toBe(3);
    expect(b.r.total).toBe(30);
    expect(a.count).toBeGreaterThan(0); // a counter that saw nothing would pass the checks below for free
    expect(a.count).toBeLessThanOrEqual(LIST_MAX);
    expect(b.count).toBe(a.count);
  });

  it('pages after filtering without an extra statement', async () => {
    const { me, marker } = await seedLate(12);
    const whole = await counted(me, marker, { attention: true });
    const page = await counted(me, marker, { attention: true, limit: 5, offset: 10 });
    expect(page.r.items).toHaveLength(2);
    expect(page.r.total).toBe(12);
    expect(page.count).toBe(whole.count);
  });

  it('does not touch the database for attention in a status that has no condition', async () => {
    const { me, marker } = await seedLate(2);
    const r = await counted(me, marker, { attention: true, status: 'draft' });
    expect(r.r).toEqual({ items: [], total: 0 });
    expect(r.count).toBe(0);
  });
});

describe('plan on the list (rencana)', () => {
  it('adds exactly two statements for 3 and for 30 projects', async () => {
    const small = await seedLate(3);
    const big = await seedLate(30);
    const plain = await counted(small.me, small.marker, {});
    const a = await counted(small.me, small.marker, { withPlan: true });
    const b = await counted(big.me, big.marker, { withPlan: true });
    expect(a.count).toBe(plain.count + PLAN_STATEMENTS);
    expect(b.count).toBe(a.count);
  });

  it('carries only the short columns, phases by position and milestones by due date', async () => {
    const { me, marker, phased } = await seedLate(4);
    const first = phased[0];
    if (!first) throw new Error('no phased project');
    const { r } = await counted(me, marker, { withPlan: true });
    const item = r.items.find((i) => i.id === first.id);
    expect(item?.plan?.phases.map((p) => p.name)).toEqual(['Pertama', 'Kedua']);
    expect(Object.keys(item?.plan?.phases[0] ?? {}).sort()).toEqual(
      ['endDate', 'id', 'name', 'startDate', 'status'].sort(),
    );
    expect(item?.plan?.milestones).toEqual([
      { id: expect.any(String), title: 'Awal', dueDate: LONG_AGO, reachedAt: null, phaseId: null },
    ]);
  });

  it('gives a project without phases empty arrays, and no plan at all without the flag', async () => {
    const { me, marker, projects, phased } = await seedLate(4);
    const bare = projects.find((p) => !phased.includes(p));
    const withPlan = await counted(me, marker, { withPlan: true });
    expect(withPlan.r.items.find((i) => i.id === bare?.id)?.plan?.phases).toEqual([]);
    const without = await counted(me, marker, {});
    for (const item of without.r.items) expect('plan' in item).toBe(false);
  });

  it('works together with the attention filter', async () => {
    const { me, marker } = await seedLate(3);
    const { r } = await counted(me, marker, { attention: true, withPlan: true });
    expect(r.items).toHaveLength(3);
    for (const item of r.items) expect(item.plan?.milestones).toHaveLength(1);
  });
});
