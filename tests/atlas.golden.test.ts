/**
 * Golden numbers of the Atlas scenario (S0B-30, X2 §2C): progress 17 (not the wireframe's 70), elapsed 60,
 * 5 active, 1 overdue, "at risk" because of an important overdue task. Part one reads the pure data
 * without a database; part two seeds the factories into the test DB and runs the real metrics on the rows.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../server/db';
import { task } from '../server/db/schema';
import { computeCondition } from '../server/metrics/condition';
import { METRICS } from '../server/metrics/config';
import { isoDateIn } from '../server/metrics/dates';
import { elapsed, progress } from '../server/metrics/project.metrics';
import { isActive, isOverdue, taskLabels } from '../server/metrics/task.metrics';
import {
  ATLAS_PEOPLE,
  ATLAS_PROJECTS,
  ATLAS_REFERENCE_DATE,
  ATLAS_TASKS,
  addDays,
  resolveAtlas,
} from '../server/seed/atlas.data';
import { type AtlasScenario, seedAtlas } from './support/atlas';
import { createCleaner } from './support/cleanup';
import { ATLAS_NOW, freezeAt } from './support/clock';
import { createFactory } from './support/factory.task';

const MS_PER_DAY = 86_400_000;

describe('atlas.data (pure, no database)', () => {
  const atlasTasks = ATLAS_TASKS.filter((t) => t.project === 'atlas');

  it('has 6 non-canceled Atlas tasks and exactly 1 done', () => {
    expect(atlasTasks.filter((t) => t.status !== 'canceled')).toHaveLength(6);
    expect(atlasTasks.filter((t) => t.status === 'done')).toHaveLength(1);
  });

  it('keeps the Sinar report out of Atlas', () => {
    const sinar = ATLAS_TASKS.filter((t) => t.project === 'sinar');
    expect(sinar.map((t) => t.key)).toEqual(['sinarReport']);
    expect(ATLAS_PROJECTS.map((p) => p.key)).toEqual(['atlas', 'sinar']);
  });

  it('resolves the reference instant to Wednesday 7 Oct 2026 in the team zone', () => {
    const data = resolveAtlas(ATLAS_NOW);
    expect(data.today).toBe(ATLAS_REFERENCE_DATE);
    expect(new Date(`${data.today}T00:00:00Z`).getUTCDay()).toBe(3);
    const atlas = data.projects.find((p) => p.key === 'atlas');
    expect([atlas?.startDate, atlas?.dueDate, atlas?.originalDueDate]).toEqual([
      '2026-09-01',
      '2026-10-31',
      '2026-10-15',
    ]);
  });

  it('shifts every date with "today" so a later seed still looks like that Wednesday', () => {
    const later = new Date(ATLAS_NOW.getTime() + 10 * MS_PER_DAY);
    const base = resolveAtlas(ATLAS_NOW);
    const moved = resolveAtlas(later);
    expect(moved.today).toBe(addDays(base.today, 10));
    base.tasks.forEach((t, i) => {
      expect(moved.tasks[i]?.dueDate).toBe(addDays(t.dueDate, 10));
      expect(moved.tasks[i]?.createdAt.getTime()).toBe(t.createdAt.getTime() + 10 * MS_PER_DAY);
    });
  });

  it('names every person as a labelled dummy and gives each a usable account role', () => {
    expect(ATLAS_PEOPLE).toHaveLength(5);
    for (const p of ATLAS_PEOPLE) {
      expect(p.name).toContain('(contoh)');
      expect(['member', 'project_manager', 'admin']).toContain(p.role);
    }
  });

  it('keeps every reviewer different from the assignee (DB CHECK)', () => {
    for (const t of ATLAS_TASKS) expect(t.reviewer).not.toBe(t.assignee);
  });
});

describe('Atlas golden numbers (test DB, clock frozen at ATLAS_NOW)', () => {
  const cleaner = createCleaner();
  const f = createFactory(cleaner);
  let s: AtlasScenario;

  beforeAll(async () => {
    s = await cleaner.shared(() => seedAtlas(f, { now: ATLAS_NOW }));
  });
  afterAll(() => cleaner.flushAll());
  // Per test: a freeze made in beforeAll would be lifted after the first test.
  beforeEach(() => freezeAt(ATLAS_NOW));

  const atlasRows = () => db.select().from(task).where(eq(task.projectId, s.projects.atlas.id));
  const today = () => isoDateIn(new Date(), METRICS.TIME_ZONE);

  it('stores 6 non-canceled tasks in Atlas and the Sinar report in the other project', async () => {
    const rows = await atlasRows();
    expect(rows.filter((r) => r.status !== 'canceled')).toHaveLength(6);
    const sinar = await db.select().from(task).where(eq(task.projectId, s.projects.sinar.id));
    expect(sinar.map((r) => r.id)).toEqual([s.tasks.sinarReport.id]);
  });

  it('progress is 17, not the wireframe 70', async () => {
    const p = progress(await atlasRows());
    expect({ done: p.done, total: p.total, percent: p.percent }).toEqual({
      done: 1,
      total: 6,
      percent: 17,
    });
  });

  it('elapsed time is 60 (36 of 60 days) and not overrun', () => {
    const atlas = s.projects.atlas;
    expect(elapsed(atlas.startDate, atlas.dueDate, today())).toEqual({
      percent: 60,
      overrun: false,
    });
  });

  it('has 5 active tasks and 1 overdue: #12 yes, #14 (due today) no', async () => {
    const rows = await atlasRows();
    expect(rows.filter(isActive)).toHaveLength(5);
    const late = rows.filter((r) => isOverdue(r, today()));
    expect(late.map((r) => r.id)).toEqual([s.tasks.fixSso.id]);
    const specApi = rows.find((r) => r.id === s.tasks.specApi.id);
    expect(specApi?.dueDate).toBe(today());
    expect(specApi && isOverdue(specApi, today())).toBe(false);
  });

  it('condition is at_risk because 1 important task is overdue (1/5 = 20% is not above the ratio)', async () => {
    const atlas = s.projects.atlas;
    const result = computeCondition({
      status: atlas.status,
      dueDate: atlas.dueDate,
      tasks: await atlasRows(),
      milestones: [],
      overrides: [],
      today: today(),
      now: new Date(),
    });
    expect(result?.computed.condition).toBe('at_risk');
    expect(result?.computed.reasons).toEqual([{ code: 'IMPORTANT_OVERDUE', count: 1 }]);
    expect(result?.effective).toBe('at_risk');
  });

  it('labels #17 awaiting_my_review for Nico and #12 overdue', async () => {
    const rows = await atlasRows();
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ctx = (awaitingMe: boolean) => ({
      today: today(),
      now: new Date(),
      blocked: false,
      awaitingMe,
    });
    const profile = byId.get(s.tasks.fixProfileSave.id);
    expect(profile?.reviewerId).toBe(s.users.nico.id);
    const mine = profile && taskLabels(profile, ctx(profile.reviewerId === s.users.nico.id));
    expect(mine?.primary).toBe('awaiting_my_review');
    const notMine = profile && taskLabels(profile, ctx(profile.reviewerId === s.users.rina.id));
    expect(notMine?.all).toEqual([]);

    const sso = byId.get(s.tasks.fixSso.id);
    expect(sso && taskLabels(sso, ctx(false)).primary).toBe('overdue');
  });

  it('seeds approved accounts with the roles the scenario needs', () => {
    expect(s.users.nico).toMatchObject({ role: 'project_manager', approvalStatus: 'approved' });
    expect(s.users.admin).toMatchObject({ role: 'admin', approvalStatus: 'approved' });
    expect(s.projects.atlas.leadId).toBe(s.users.nico.id);
    expect(s.projects.sinar.leadId).toBe(s.users.rina.id);
  });
});
