/** Real milestones and overrides in the project condition (L5-02): list, detail, expiry in SQL, constant query count. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { db } from '../../server/db';
import { projectConditionOverride, projectMilestone } from '../../server/db/schema';
import { toPrincipal } from '../../server/project/membership.query';
import { getProjectDetail, listProjects } from '../../server/project/project.query';
import { loadConditionInputs } from '../../server/project/project-condition.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'prjc' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const NOW = ATLAS_NOW; // Wednesday 2026-10-07 in the team zone
const PAST = '2026-10-05';
const FUTURE = '2026-10-20';
const principal = (u: TestUser) => toPrincipal({ user: u, role: u.role });

async function setup() {
  const lead = await f.user({ role: 'project_manager' });
  const p = await f.project({ lead, dueDate: '2026-10-31' });
  const detail = () => getProjectDetail(principal(lead), p.id, NOW);
  return { lead, p, detail };
}

const addMilestone = (projectId: string, dueDate: string, reachedAt: Date | null = null) =>
  db.insert(projectMilestone).values({ projectId, title: 'Tonggak uji', dueDate, reachedAt }); // test-only
const addOverride = (
  projectId: string,
  o: Partial<typeof projectConditionOverride.$inferInsert> = {},
) =>
  db
    .insert(projectConditionOverride)
    .values({ projectId, condition: 'on_track', reason: 'Menunggu klien', ...o }); // test-only

describe('project condition from stored milestones', () => {
  it('a missed milestone makes the project "Perlu perhatian" with its one-sentence reason', async () => {
    const { p, detail } = await setup();
    await addMilestone(p.id, PAST);
    expect((await detail())?.condition).toEqual({
      level: 'at_risk',
      reason: '1 milestone terlewat',
    });
  });

  it('a milestone that is due today or already reached does not flag', async () => {
    const { p, detail } = await setup();
    await addMilestone(p.id, '2026-10-07');
    await addMilestone(p.id, PAST, new Date('2026-10-06T00:00:00Z'));
    expect((await detail())?.condition).toEqual({ level: 'on_track', reason: null });
  });
});

describe('project condition from stored overrides', () => {
  it('an active override replaces the level and shows the manager reason', async () => {
    const { p, detail } = await setup();
    await addMilestone(p.id, PAST);
    await addOverride(p.id, { condition: 'on_track', reason: 'Disetujui klien' }); // test-only
    expect((await detail())?.condition).toEqual({ level: 'on_track', reason: 'Disetujui klien' }); // test-only
  });

  it('cleared overrides and ones expired at or before now are ignored', async () => {
    const { p, detail } = await setup();
    await addMilestone(p.id, PAST);
    await addOverride(p.id, {
      condition: 'off_track',
      clearedAt: new Date('2026-10-06T00:00:00Z'),
    });
    await addOverride(p.id, { condition: 'off_track', expiresAt: NOW });
    expect((await detail())?.condition?.level).toBe('at_risk');
  });

  it('with two active overrides the newest wins', async () => {
    const { p, detail } = await setup();
    await addOverride(p.id, {
      condition: 'off_track',
      createdAt: new Date('2026-10-05T00:00:00Z'),
    });
    await addOverride(p.id, {
      condition: 'at_risk',
      reason: 'Terbaru', // test-only
      createdAt: new Date('2026-10-06T00:00:00Z'),
    });
    expect((await detail())?.condition).toEqual({ level: 'at_risk', reason: 'Terbaru' }); // test-only
  });

  it('a project that is not active has no condition, override or not', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const p = await f.project({ lead, status: 'on_hold' });
    await addOverride(p.id, { condition: 'off_track' });
    expect((await getProjectDetail(principal(lead), p.id, NOW))?.condition).toBeNull();
  });
});

describe('loadConditionInputs', () => {
  it('returns an empty map for no ids without touching the database', async () => {
    const { exec, queries } = countQueries();
    expect((await loadConditionInputs([], NOW, exec)).size).toBe(0);
    expect(queries).toHaveLength(0);
  });

  it('keeps milestones and overrides apart per project and drops expired rows in SQL', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const a = await f.project({ lead });
    const b = await f.project({ lead });
    await addMilestone(a.id, PAST);
    await addMilestone(b.id, FUTURE);
    await addOverride(a.id, { condition: 'at_risk' });
    await addOverride(a.id, { expiresAt: new Date('2026-10-01T00:00:00Z') });
    const map = await loadConditionInputs([a.id, b.id], NOW);
    expect(map.get(a.id)?.milestones.map((m) => m.dueDate)).toEqual([PAST]);
    expect(map.get(a.id)?.overrides.map((o) => o.condition)).toEqual(['at_risk']);
    expect(map.get(b.id)?.milestones.map((m) => m.dueDate)).toEqual([FUTURE]);
    expect(map.get(b.id)?.overrides).toEqual([]);
  });

  it('uses the same number of statements for 2 and 12 projects (no N+1)', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const make = async (n: number) => {
      const ids: string[] = [];
      for (let i = 0; i < n; i++) {
        const p = await f.project({ lead, name: `Banyak ${i}` }); // test-only
        await addMilestone(p.id, PAST);
        ids.push(p.id);
      }
      const counter = countQueries();
      await loadConditionInputs(ids, NOW, counter.exec);
      return counter.queries.length;
    };
    const small = await make(2);
    expect(small).toBeGreaterThan(0);
    expect(await make(12)).toBe(small);
  });

  it('listProjects feeds the stored milestones into every item', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const q = `q${crypto.randomUUID().slice(0, 8)}`;
    const late = await f.project({ lead, name: `${q} A` });
    await f.project({ lead, name: `${q} B` });
    await addMilestone(late.id, PAST);
    const r = await listProjects(principal(lead), {
      scope: 'all',
      q,
      sort: 'name',
      limit: 10,
      offset: 0,
      now: NOW,
    });
    expect(r.items.map((i) => i.condition?.level)).toEqual(['at_risk', 'on_track']);
  });
});
