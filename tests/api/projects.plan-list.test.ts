/** `GET /app/projects?rencana=1` (S5a-04): phases and milestones on each list item, for the Gantt view. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { db } from '../../server/db';
import { projectMilestone, projectPhase } from '../../server/db/schema';
import { call, expectApiError, type Json, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'prjpl' });

const REACHED = new Date('2030-03-04T05:06:07.000Z'); // test-only
let marker: string;
let me: TestUser;
let stranger: TestUser;
let ids: { planned: string; bare: string; hidden: string };

beforeAll(async () => {
  marker = `pl${crypto.randomUUID().slice(0, 8)}`;
  await cleaner.shared(async () => {
    const lead = await f.user({ role: 'project_manager' });
    me = await f.user();
    stranger = await f.user();
    const planned = await f.project({ lead, members: [[me, 'member']], name: `${marker} A` });
    const bare = await f.project({ lead, members: [[me, 'member']], name: `${marker} B` });
    const hidden = await f.project({ lead, name: `${marker} C` });
    const [akhir, awal] = await db
      .insert(projectPhase)
      .values([
        {
          projectId: planned.id,
          name: 'Tahap akhir',
          position: 1,
          startDate: '2030-02-01',
          endDate: '2030-03-01',
        },
        {
          projectId: planned.id,
          name: 'Tahap awal',
          position: 0,
          startDate: '2030-01-01',
          endDate: '2030-01-31',
          status: 'done',
        },
      ]) // test-only
      .returning({ id: projectPhase.id });
    await db.insert(projectMilestone).values([
      { projectId: planned.id, title: 'Kedua', dueDate: '2030-03-01', phaseId: akhir?.id }, // test-only
      {
        projectId: planned.id,
        title: 'Pertama',
        dueDate: '2030-01-31',
        phaseId: awal?.id,
        reachedAt: REACHED,
      }, // test-only
      { projectId: hidden.id, title: 'Tidak boleh bocor', dueDate: '2030-01-31' }, // test-only
    ]);
    ids = { planned: planned.id, bare: bare.id, hidden: hidden.id };
  });
});
beforeEach(() => {
  auth.as(me);
  resetApiLimiters();
});
afterAll(() => cleaner.flushAll());

const url = (query = '') => `/app/projects?scope=all&sort=name&q=${marker}${query}`;
const item = (res: { body: Json }, id: string) =>
  (res.body.items as Json[]).find((i) => i.id === id);

describe('rencana=1', () => {
  it('adds plan{phases,milestones} with the short columns, in display order', async () => {
    const res = await call('GET', url('&rencana=1'));
    expect(res.status).toBe(200);
    const plan = item(res, ids.planned)?.plan;
    expect(plan.phases.map((p: Json) => p.name)).toEqual(['Tahap awal', 'Tahap akhir']);
    expect(plan.phases[0]).toEqual({
      id: expect.any(String),
      name: 'Tahap awal',
      startDate: '2030-01-01',
      endDate: '2030-01-31',
      status: 'done',
    });
    expect(plan.milestones.map((m: Json) => m.title)).toEqual(['Pertama', 'Kedua']);
    expect(plan.milestones[0]).toEqual({
      id: expect.any(String),
      title: 'Pertama',
      dueDate: '2030-01-31',
      reachedAt: REACHED.toISOString(),
      phaseId: plan.phases[0].id,
    });
    expect(plan.milestones[1].reachedAt).toBeNull();
  });

  it('gives a project with no phases or milestones empty arrays', async () => {
    const res = await call('GET', url('&rencana=1'));
    expect(item(res, ids.bare)?.plan).toEqual({ phases: [], milestones: [] });
  });

  it('leaves the old item shape untouched without the flag', async () => {
    const res = await call('GET', url());
    expect(res.body.items.length).toBe(2);
    for (const i of res.body.items) expect(Object.keys(i)).not.toContain('plan');
  });

  it('only carries the plans of projects the caller may see', async () => {
    const res = await call('GET', url('&rencana=1'));
    expect(item(res, ids.hidden)).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('Tidak boleh bocor');
  });

  it('is refused for any value but 1, and for an anonymous caller first', async () => {
    expect((await call('GET', url('&rencana=2'))).status).toBe(422);
    auth.as(null);
    expectApiError(await call('GET', url('&rencana=1')), 401, 'UNAUTHORIZED');
    auth.as(stranger);
    expect((await call('GET', url('&rencana=1'))).body.items).toEqual([]);
  });
});
