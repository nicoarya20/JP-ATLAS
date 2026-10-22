/** Task ↔ phase (S5a-02, H-B5): create and PATCH accept `phaseId` of the task's own project and the detail shows it. */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { task, taskActivity } from '../../server/db/schema';
import { TASK_WRITE_MESSAGES } from '../../server/task/task.limits';
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

  it('writes a phase_changed activity with the phase names, and none when the phase stays', async () => {
    const { lead, t, mine } = await graph();
    auth.as(lead);
    await call('PATCH', `${BASE}/${t.id}`, { phaseId: mine[0]?.id });
    await call('PATCH', `${BASE}/${t.id}`, { phaseId: mine[0]?.id });
    await call('PATCH', `${BASE}/${t.id}`, { phaseId: mine[1]?.id });
    await call('PATCH', `${BASE}/${t.id}`, { phaseId: null });
    const rows = await db
      .select({ payload: taskActivity.payload })
      .from(taskActivity)
      .where(and(eq(taskActivity.taskId, t.id), eq(taskActivity.action, 'phase_changed')))
      .orderBy(asc(taskActivity.createdAt), asc(taskActivity.id));
    expect(rows.map((r) => r.payload)).toEqual([
      { from: null, to: 'Tahap 1' },
      { from: 'Tahap 1', to: 'Tahap 2' },
      { from: 'Tahap 2', to: null },
    ]);
  });

  it('shows the phase in the detail, or null when there is none', async () => {
    const { lead, t, mine } = await graph();
    auth.as(lead);
    expect((await call('GET', `${BASE}/${t.id}`)).body.phase).toBeNull();
    await call('PATCH', `${BASE}/${t.id}`, { phaseId: mine[0]?.id });
    expect((await call('GET', `${BASE}/${t.id}`)).body.phase).toEqual({
      id: mine[0]?.id,
      name: 'Tahap 1',
    });
  });
});

describe('POST /app/tasks with phaseId', () => {
  const countIn = async (projectId: string) =>
    (await db.select({ id: task.id }).from(task).where(eq(task.projectId, projectId))).length;

  it('creates the task in a phase of its project and answers the phase', async () => {
    const { lead, prj, mine } = await graph();
    auth.as(lead);
    const res = await call('POST', BASE, {
      projectId: prj.id,
      title: 'Baru',
      phaseId: mine[1]?.id,
    });
    expect(res.status).toBe(201);
    expect(res.body.phase).toEqual({ id: mine[1]?.id, name: 'Tahap 2' });
    expect(await phaseOf(String(res.body.id))).toBe(mine[1]?.id);
  });

  it('creates it without a phase when the field is left out or null', async () => {
    const { lead, prj } = await graph();
    auth.as(lead);
    const bare = await call('POST', BASE, { projectId: prj.id, title: 'Tanpa' });
    const nulled = await call('POST', BASE, { projectId: prj.id, title: 'Null', phaseId: null });
    expect([bare.status, nulled.status]).toEqual([201, 201]);
    expect([bare.body.phase, nulled.body.phase]).toEqual([null, null]);
  });

  it('refuses a phase of another project or a missing one, and creates nothing', async () => {
    const { lead, prj, alien } = await graph();
    auth.as(lead);
    const before = await countIn(prj.id);
    const foreign = await call('POST', BASE, { projectId: prj.id, title: 'A', phaseId: alien?.id });
    const missing = await call('POST', BASE, { projectId: prj.id, title: 'B', phaseId: 'nope' });
    expectApiError(foreign, 422, 'VALIDATION');
    expect(foreign.body.error).toBe(TASK_WRITE_MESSAGES.phaseNotInProject);
    expect(missing.body.error).toBe(foreign.body.error);
    expect(await countIn(prj.id)).toBe(before);
  });

  it('lets a Member create with a phase and refuses a Viewer with 403', async () => {
    const { member, viewer, prj, mine } = await graph();
    const body = { projectId: prj.id, title: 'Anggota', phaseId: mine[0]?.id };
    auth.as(viewer);
    expectApiError(await call('POST', BASE, body), 403, 'NOT_MEMBER');
    auth.as(member);
    expect((await call('POST', BASE, body)).status).toBe(201);
  });
});
