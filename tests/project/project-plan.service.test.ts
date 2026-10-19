/** Plan services and query (S5a-02): the pure picks, constant query count, no-op writes and the Trash freeze. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project, projectActivity } from '../../server/db/schema';
import { toPrincipal } from '../../server/project/membership.query';
import { setMilestoneReached } from '../../server/project/project-milestone.service';
import {
  createPhase,
  reorderPhases,
  updatePhase,
} from '../../server/project/project-phase.service';
import type { MilestoneDto, PhaseDto } from '../../server/project/project-plan.dto';
import {
  loadPhases,
  pickCurrentPhase,
  pickNextMilestone,
} from '../../server/project/project-plan.query';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { seedMilestones, seedPhases } from '../support/plan-api';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'plnsvc' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const principal = (u: TestUser) => toPrincipal({ user: u, role: u.role });
const actions = async (projectId: string) =>
  (await db.select().from(projectActivity).where(eq(projectActivity.projectId, projectId))).map(
    (a) => a.action,
  );

const phase = (over: Partial<PhaseDto>): PhaseDto => ({
  id: 'p',
  projectId: 'x',
  name: 'n',
  description: null,
  position: 0,
  startDate: null,
  endDate: null,
  status: 'not_started',
  startedAt: null,
  finishedAt: null,
  taskCount: 0,
  doneCount: 0,
  ...over,
}); // test-only
const milestone = (over: Partial<MilestoneDto>): MilestoneDto => ({
  id: 'm',
  projectId: 'x',
  phaseId: null,
  title: 't',
  description: null,
  dueDate: '2030-01-01',
  reachedAt: null,
  ...over,
}); // test-only

describe('pickNextMilestone / pickCurrentPhase', () => {
  it('skips reached milestones and keeps a missed one as the next', () => {
    const list = [
      milestone({ id: 'a', reachedAt: '2030-01-02T00:00:00.000Z' }),
      milestone({ id: 'b', dueDate: '2020-01-01' }),
      milestone({ id: 'c', dueDate: '2031-01-01' }),
    ];
    expect(pickNextMilestone(list)?.id).toBe('b');
    expect(pickNextMilestone([])).toBeNull();
    expect(pickNextMilestone([milestone({ reachedAt: '2030-01-02T00:00:00.000Z' })])).toBeNull();
  });

  it('takes the first running phase in display order, and null when none is running', () => {
    const list = [
      phase({ id: 'a', status: 'done' }),
      phase({ id: 'b', status: 'in_progress' }),
      phase({ id: 'c', status: 'in_progress' }),
    ];
    expect(pickCurrentPhase(list)?.id).toBe('b');
    expect(
      pickCurrentPhase([phase({ status: 'not_started' }), phase({ status: 'done' })]),
    ).toBeNull();
  });
});

describe('loadPhases', () => {
  it('uses two statements however many phases there are', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const prj = await f.project({ lead });
    await seedPhases(prj.id, 12);
    const counter = countQueries();
    expect(await loadPhases(counter.exec, prj.id)).toHaveLength(12);
    expect(counter.queries).toHaveLength(2);
  });
});

describe('writes that change nothing', () => {
  it('leave no activity: same order, empty patch, reach twice', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const prj = await f.project({ lead });
    const [a, b] = await seedPhases(prj.id, 2);
    const [m] = await seedMilestones(prj.id, 1);
    const p = principal(lead);
    const same = await reorderPhases(p, prj.id, [a?.id ?? '', b?.id ?? '']);
    expect(same.ok).toBe(true);
    const noop = await updatePhase(p, prj.id, a?.id ?? '', {});
    expect(noop.ok && noop.value.name).toBe('Tahap 1');
    const sameStatus = await updatePhase(p, prj.id, a?.id ?? '', { status: 'not_started' });
    expect(sameStatus.ok).toBe(true);
    await setMilestoneReached(p, prj.id, m?.id ?? '', false);
    expect(await actions(prj.id)).toEqual([]);
  });
});

describe('a project in the Trash', () => {
  it('freezes the plan: every write answers NOT_FOUND', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const prj = await f.project({ lead });
    const [a] = await seedPhases(prj.id, 1);
    await db
      .update(project)
      .set({ deletedAt: new Date(), deletedBy: lead.id })
      .where(eq(project.id, prj.id));
    const p = principal(lead);
    expect(await createPhase(p, prj.id, { name: 'Baru' })).toMatchObject({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(await updatePhase(p, prj.id, a?.id ?? '', { name: 'Ubah' })).toMatchObject({
      ok: false,
      code: 'NOT_FOUND',
    });
  });
});
