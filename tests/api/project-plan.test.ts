/** Plan API (S5a-02): the plan read, phase writes, access by role, limits, reorder and what a delete leaves behind. */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { writeLimiter } from '../../server/api/app-context';
import { db } from '../../server/db';
import { project, projectActivity, projectPhase, task } from '../../server/db/schema';
import { PHASE_NAME_MAX, PHASES_PER_PROJECT } from '../../server/project/project.limits';
import { expectApiError, type Json } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { seedPhases, send } from '../support/plan-api';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'plnapi' });
beforeEach(() => {
  auth.as(null);
  writeLimiter.reset();
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const base = (id: string) => `/projects/${id}`;
// Response bodies are typed as a loose record; a list answer is read as an array here.
const names = (phases: unknown) => (phases as Json[]).map((p) => p.name);

async function team() {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const viewer = await f.user();
  const stranger = await f.user();
  const prj = await f.project({
    lead,
    members: [
      [member, 'member'],
      [viewer, 'viewer'],
    ],
  });
  return { lead, member, viewer, stranger, prj };
}

describe('sign-in gate and read access', () => {
  it.each([
    ['GET', '/projects/p1/plan'],
    ['POST', '/projects/p1/phases'],
    ['POST', '/projects/p1/phases/reorder'],
    ['PATCH', '/projects/p1/phases/x'],
    ['DELETE', '/projects/p1/phases/x'],
    ['POST', '/projects/p1/milestones'],
    ['POST', '/projects/p1/milestones/x/reach'],
  ])('%s %s without a session is 401', async (method, path) => {
    expectApiError(
      await send(method, path, method === 'GET' ? undefined : {}),
      401,
      'UNAUTHORIZED',
    );
  });

  it('answers an empty plan for a new project to every member, viewers included', async () => {
    const { member, viewer, prj } = await team();
    for (const u of [member, viewer]) {
      auth.as(u);
      const res = await send('GET', `${base(prj.id)}/plan`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        phases: [],
        milestones: [],
        nextMilestone: null,
        currentPhase: null,
      });
    }
  });

  it('hides the plan of a project the caller cannot see (404, same as a missing id)', async () => {
    const { stranger, prj } = await team();
    auth.as(stranger);
    const hidden = await send('GET', `${base(prj.id)}/plan`);
    const missing = await send('GET', `${base('no-such-project')}/plan`);
    expectApiError(hidden, 404, 'NOT_FOUND');
    expect(hidden.body.error).toBe(missing.body.error);
  });

  it('answers 404 for a project in the Trash', async () => {
    const { lead, prj } = await team();
    await db
      .update(project)
      .set({ deletedAt: new Date(), deletedBy: lead.id })
      .where(eq(project.id, prj.id));
    auth.as(lead);
    expectApiError(await send('GET', `${base(prj.id)}/plan`), 404, 'NOT_FOUND');
    const write = await send('POST', `${base(prj.id)}/phases`, { name: 'Persiapan' });
    expectApiError(write, 404, 'NOT_FOUND');
  });
});

describe('who may write', () => {
  it('lets the manager and an Admin create phases', async () => {
    const { lead, prj } = await team();
    const admin = await f.user({ role: 'admin' });
    for (const u of [lead, admin]) {
      auth.as(u);
      const res = await send('POST', `${base(prj.id)}/phases`, { name: `Dibuat ${u.role}` });
      expect(res.status).toBe(201);
    }
  });

  it('refuses a Member, a Viewer and a non-member Project Manager with 403 NOT_MANAGER', async () => {
    const { member, viewer, prj } = await team();
    const pmX = await f.user({ role: 'project_manager' });
    for (const u of [member, viewer, pmX]) {
      auth.as(u);
      expectApiError(
        await send('POST', `${base(prj.id)}/phases`, { name: 'Terlarang' }),
        403,
        'NOT_MANAGER',
      );
    }
    expect(
      await db.select().from(projectPhase).where(eq(projectPhase.projectId, prj.id)),
    ).toHaveLength(0);
  });

  it('answers 404 (not 403) to someone who cannot see the project', async () => {
    const { stranger, prj } = await team();
    auth.as(stranger);
    expectApiError(await send('POST', `${base(prj.id)}/phases`, { name: 'X' }), 404, 'NOT_FOUND');
  });
});

describe('create and edit a phase', () => {
  it('creates phases in order with the frozen DTO shape and records the activity', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    const first = await send('POST', `${base(prj.id)}/phases`, {
      name: '  Persiapan  ',
      description: 'Siapkan bahan',
      startDate: '2030-01-01',
      endDate: '2030-01-31',
    });
    const second = await send('POST', `${base(prj.id)}/phases`, { name: 'Pelaksanaan' });
    expect(first.status).toBe(201);
    expect(Object.keys(first.body).sort()).toEqual(
      [
        'description',
        'doneCount',
        'endDate',
        'finishedAt',
        'id',
        'name',
        'position',
        'projectId',
        'startDate',
        'startedAt',
        'status',
        'taskCount',
      ].sort(),
    );
    expect(first.body).toMatchObject({
      name: 'Persiapan',
      position: 0,
      status: 'not_started',
      taskCount: 0,
    });
    expect(second.body.position).toBe(1);
    const acts = await db
      .select()
      .from(projectActivity)
      .where(eq(projectActivity.projectId, prj.id));
    expect(acts.filter((a) => a.action === 'phase.created')).toHaveLength(2);
    expect(JSON.stringify(acts)).not.toContain(lead.email);
  });

  it.each([
    ['a blank name', { name: '   ' }],
    ['a name over the limit', { name: 'x'.repeat(PHASE_NAME_MAX + 1) }],
    ['an end before the start', { name: 'A', startDate: '2030-02-01', endDate: '2030-01-01' }],
    ['an impossible date', { name: 'A', startDate: '2030-02-30' }],
  ])('rejects %s with 422 VALIDATION', async (_label, body) => {
    const { lead, prj } = await team();
    auth.as(lead);
    expectApiError(await send('POST', `${base(prj.id)}/phases`, body), 422, 'VALIDATION');
  });

  it('ignores keys outside the list (position, projectId) and rejects an unknown status on edit', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    const made = await send('POST', `${base(prj.id)}/phases`, {
      name: 'A',
      position: 9,
      projectId: 'x',
      id: 'mine',
    });
    expect(made.status).toBe(201);
    expect(made.body).toMatchObject({ position: 0, projectId: prj.id });
    expect(made.body.id).not.toBe('mine');
    const bad = await send('PATCH', `${base(prj.id)}/phases/${made.body.id}`, {
      status: 'started',
    });
    expectApiError(bad, 422, 'VALIDATION');
  });

  it('refuses the 21st phase with 422 PHASE_LIMIT and an actionable message', async () => {
    const { lead, prj } = await team();
    await seedPhases(prj.id, PHASES_PER_PROJECT);
    auth.as(lead);
    const res = await send('POST', `${base(prj.id)}/phases`, { name: 'Kelebihan' });
    expectApiError(res, 422, 'PHASE_LIMIT');
    expect(res.body.error).toContain(String(PHASES_PER_PROJECT));
  });

  it('edits fields, validates the new range against the stored dates, and clears with null', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    const made = await send('POST', `${base(prj.id)}/phases`, {
      name: 'A',
      startDate: '2030-03-10',
    });
    const url = `${base(prj.id)}/phases/${made.body.id}`;
    const renamed = await send('PATCH', url, {
      name: 'Baru',
      description: 'Isi',
      endDate: '2030-03-20',
    });
    expect(renamed.body).toMatchObject({ name: 'Baru', description: 'Isi', endDate: '2030-03-20' });
    expectApiError(await send('PATCH', url, { endDate: '2030-03-01' }), 422, 'VALIDATION');
    const cleared = await send('PATCH', url, { description: null, endDate: null });
    expect(cleared.body).toMatchObject({
      description: null,
      endDate: null,
      startDate: '2030-03-10',
    });
  });

  it('stamps startedAt and finishedAt as the status moves, and clears them when it moves back', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    const made = await send('POST', `${base(prj.id)}/phases`, { name: 'A' });
    const url = `${base(prj.id)}/phases/${made.body.id}`;
    const running = await send('PATCH', url, { status: 'in_progress' });
    expect(running.body.startedAt).not.toBeNull();
    expect(running.body.finishedAt).toBeNull();
    const done = await send('PATCH', url, { status: 'done' });
    expect(done.body.startedAt).toBe(running.body.startedAt);
    expect(done.body.finishedAt).not.toBeNull();
    const reopened = await send('PATCH', url, { status: 'in_progress' });
    expect(reopened.body.finishedAt).toBeNull();
    const reset = await send('PATCH', url, { status: 'not_started' });
    expect(reset.body).toMatchObject({ startedAt: null, finishedAt: null });
  });
});

describe('plan read: counts, current phase', () => {
  it('counts live, non-canceled tasks per phase in a handful of queries and picks the running phase', async () => {
    const { lead, prj } = await team();
    const [a, b] = await seedPhases(prj.id, 2);
    if (!a || !b) throw new Error('seed failed');
    await db.update(projectPhase).set({ status: 'in_progress' }).where(eq(projectPhase.id, b.id));
    const rows = await f.tasks(prj, 5, (i) => ({
      status: (['done', 'todo', 'canceled', 'done', 'todo'] as const)[i],
      deletedAt: i === 4 ? new Date() : null,
    }));
    await db
      .update(task)
      .set({ phaseId: a.id })
      .where(eq(task.id, rows[0]?.id ?? ''));
    for (const r of rows.slice(1))
      await db.update(task).set({ phaseId: b.id }).where(eq(task.id, r.id));
    auth.as(lead);
    const res = await send('GET', `${base(prj.id)}/plan`);
    const [pa, pb] = res.body.phases;
    expect(pa).toMatchObject({ id: a.id, taskCount: 1, doneCount: 1 });
    // b holds todo, canceled (not counted), done and a trashed todo (not counted).
    expect(pb).toMatchObject({ id: b.id, taskCount: 2, doneCount: 1 });
    expect(res.body.currentPhase.id).toBe(b.id);
  });
});

describe('reorder', () => {
  it('saves the order, renumbers 0..n-1 and records one activity', async () => {
    const { lead, prj } = await team();
    const [a, b, c] = await seedPhases(prj.id, 3);
    auth.as(lead);
    const res = await send('POST', `${base(prj.id)}/phases/reorder`, {
      ids: [c?.id, a?.id, b?.id],
    });
    expect(res.status).toBe(200);
    expect(names(res.body)).toEqual(['Tahap 3', 'Tahap 1', 'Tahap 2']);
    const plan = await send('GET', `${base(prj.id)}/plan`);
    expect(plan.body.phases.map((p: Json) => p.position)).toEqual([0, 1, 2]);
    expect(names(plan.body.phases)).toEqual(['Tahap 3', 'Tahap 1', 'Tahap 2']);
    const acts = await db
      .select()
      .from(projectActivity)
      .where(eq(projectActivity.projectId, prj.id));
    expect(acts.filter((x) => x.action === 'phase.reordered')).toHaveLength(1);
  });

  it('refuses an incomplete, duplicated or foreign list with 422 and keeps the old order', async () => {
    const { lead, prj } = await team();
    const other = await f.project({ lead });
    const [a, b] = await seedPhases(prj.id, 2);
    const [alien] = await seedPhases(other.id, 1);
    auth.as(lead);
    for (const ids of [
      [a?.id],
      [a?.id, a?.id],
      [a?.id, b?.id, alien?.id],
      [a?.id, alien?.id],
      [],
    ]) {
      expectApiError(
        await send('POST', `${base(prj.id)}/phases/reorder`, { ids }),
        422,
        'VALIDATION',
      );
    }
    const plan = await send('GET', `${base(prj.id)}/plan`);
    expect(names(plan.body.phases)).toEqual(['Tahap 1', 'Tahap 2']);
  });
});

describe('phases of another project (IDOR)', () => {
  it('answers 404 identical to a missing id for edit and delete', async () => {
    const { lead, prj } = await team();
    const otherLead = await f.user({ role: 'project_manager' });
    const other = await f.project({ lead: otherLead });
    const [alien] = await seedPhases(other.id, 1);
    auth.as(lead);
    const viaAlien = await send('PATCH', `${base(prj.id)}/phases/${alien?.id}`, { name: 'Curian' });
    const viaMissing = await send('PATCH', `${base(prj.id)}/phases/nope`, { name: 'Curian' });
    expectApiError(viaAlien, 404, 'NOT_FOUND');
    expect(viaAlien.body.error).toBe(viaMissing.body.error);
    expectApiError(await send('DELETE', `${base(prj.id)}/phases/${alien?.id}`), 404, 'NOT_FOUND');
    const [still] = await db
      .select()
      .from(projectPhase)
      .where(eq(projectPhase.id, alien?.id ?? ''));
    expect(still?.name).toBe('Tahap 1');
  });
});

describe('delete a phase', () => {
  it('keeps its tasks and milestones (phase_id NULL), reports how many tasks it touched, renumbers the rest', async () => {
    const { lead, prj } = await team();
    const [a, b, c] = await seedPhases(prj.id, 3);
    const tasks = await f.tasks(prj, 3);
    for (const t of tasks)
      await db
        .update(task)
        .set({ phaseId: b?.id ?? null })
        .where(eq(task.id, t.id));
    auth.as(lead);
    const ms = await send('POST', `${base(prj.id)}/milestones`, {
      title: 'Uji',
      dueDate: '2030-05-05',
      phaseId: b?.id,
    });
    expect(ms.status).toBe(201);

    const res = await send('DELETE', `${base(prj.id)}/phases/${b?.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: b?.id, affectedTasks: 3 });

    const left = await db
      .select({ id: task.id, phaseId: task.phaseId })
      .from(task)
      .where(eq(task.projectId, prj.id));
    expect(left).toHaveLength(3);
    expect(left.every((r) => r.phaseId === null)).toBe(true);
    const plan = await send('GET', `${base(prj.id)}/plan`);
    expect(plan.body.milestones[0]).toMatchObject({ title: 'Uji', phaseId: null });
    expect(plan.body.phases.map((p: Json) => [p.id, p.position])).toEqual([
      [a?.id, 0],
      [c?.id, 1],
    ]);
    const acts = await db
      .select()
      .from(projectActivity)
      .where(eq(projectActivity.projectId, prj.id));
    expect(acts.find((x) => x.action === 'phase.deleted')?.payload).toMatchObject({
      affectedTasks: 3,
    });
  });
});
