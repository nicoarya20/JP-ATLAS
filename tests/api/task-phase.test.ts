/** Task ↔ phase (S5a-02): PATCH /app/tasks/:ref accepts `phaseId` of the task's own project; create still refuses it. */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { task } from '../../server/db/schema';
import { call, expectApiError, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { seedPhases } from '../support/plan-api';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tskphs' });
beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const BASE = '/app/tasks';
const phaseOf = async (id: string) =>
  (await db.select({ phaseId: task.phaseId }).from(task).where(eq(task.id, id)))[0]?.phaseId;

async function graph() {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const viewer = await f.user();
  const prj = await f.project({
    lead,
    members: [
      [member, 'member'],
      [viewer, 'viewer'],
    ],
  });
  const other = await f.project({ lead: await f.user({ role: 'project_manager' }) });
  const [mine, alien] = [await seedPhases(prj.id, 2), await seedPhases(other.id, 1)];
  const t = await f.task({ project: prj, creator: lead, assignee: member });
  return { lead, member, viewer, prj, t, mine, alien: alien[0] };
}

describe('PATCH /app/tasks/:ref with phaseId', () => {
  it('puts the task in a phase of its project, moves it, and takes it out with null', async () => {
    const { lead, t, mine } = await graph();
    auth.as(lead);
    const [a, b] = mine;
    expect((await call('PATCH', `${BASE}/${t.id}`, { phaseId: a?.id })).status).toBe(200);
    expect(await phaseOf(t.id)).toBe(a?.id);
    await call('PATCH', `${BASE}/${t.id}`, { phaseId: b?.id });
    expect(await phaseOf(t.id)).toBe(b?.id);
    expect((await call('PATCH', `${BASE}/${t.id}`, { phaseId: null })).status).toBe(200);
    expect(await phaseOf(t.id)).toBeNull();
  });

  it('keeps the phase when the field is left out of a later edit', async () => {
    const { lead, t, mine } = await graph();
    auth.as(lead);
    await call('PATCH', `${BASE}/${t.id}`, { phaseId: mine[0]?.id });
    await call('PATCH', `${BASE}/${t.id}`, { title: 'Judul baru' });
    expect(await phaseOf(t.id)).toBe(mine[0]?.id);
  });

  it('refuses a phase of another project and a missing one with the same 422', async () => {
    const { lead, t, alien } = await graph();
    auth.as(lead);
    const foreign = await call('PATCH', `${BASE}/${t.id}`, { phaseId: alien?.id });
    const missing = await call('PATCH', `${BASE}/${t.id}`, { phaseId: 'no-such-phase' });
    expectApiError(foreign, 422, 'VALIDATION');
    expect(foreign.body.error).toBe(missing.body.error);
    expect(await phaseOf(t.id)).toBeNull();
  });

  it('lets the assignee (a Member) set it, and refuses a Viewer with 403', async () => {
    const { member, viewer, t, mine } = await graph();
    auth.as(viewer);
    expectApiError(
      await call('PATCH', `${BASE}/${t.id}`, { phaseId: mine[0]?.id }),
      403,
      'NOT_MEMBER',
    );
    auth.as(member);
    expect((await call('PATCH', `${BASE}/${t.id}`, { phaseId: mine[0]?.id })).status).toBe(200);
  });

  it('still refuses phaseId when a task is created (the form sets it right after)', async () => {
    const { lead, prj, mine } = await graph();
    auth.as(lead);
    const res = await call('POST', BASE, {
      projectId: prj.id,
      title: 'Baru',
      phaseId: mine[0]?.id,
    });
    expectApiError(res, 422, 'VALIDATION');
  });
});
