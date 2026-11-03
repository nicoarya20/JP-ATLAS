/**
 * `POST /app/projects/templates/from-project` ("Simpan sebagai template"): copies a project's phases
 * and tasks as offsets, leaves people and progress out, and refuses what the viewer may not save.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq, ilike } from 'drizzle-orm';
import { addDays } from '../../server/ai/task-draft.dates';
import { db } from '../../server/db';
import { project, projectPhase, projectTemplate, task } from '../../server/db/schema';
import { call, expectApiError, type Json } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tplfp' });
beforeEach(() => auth.as(null));
afterEach(async () => {
  await cleaner.flushTest();
  await db.delete(projectTemplate).where(ilike(projectTemplate.name, `${f.tag}%`));
});
afterAll(() => cleaner.flushAll());

const URL = '/app/projects/templates/from-project';
const save = (body: Json) => call('POST', URL, body);

/** A project starting 2030-03-01 with two phases, a loose task, and people/progress that must not be copied. */
async function sampleProject() {
  const pm = await f.user({ role: 'project_manager' });
  const worker = await f.user();
  const p = await f.project({
    lead: pm,
    members: [[worker, 'member']],
    name: 'tplfp Renovasi',
    description: 'Renovasi rumah',
    startDate: '2030-03-01',
  });
  const [a, b] = await db
    .insert(projectPhase)
    .values([
      {
        projectId: p.id,
        name: 'Persiapan',
        position: 0,
        startDate: '2030-03-01',
        endDate: '2030-03-08',
      },
      { projectId: p.id, name: 'Pelaksanaan', position: 1, startDate: '2030-03-09' },
    ])
    .returning({ id: projectPhase.id });
  const t1 = await f.task({
    project: p,
    title: 'Beli material',
    due: '2030-03-04',
    assignee: worker,
    status: 'done',
    priority: 'high',
  });
  const t2 = await f.task({ project: p, title: 'Pasang keramik', due: '2030-03-20' });
  const loose = await f.task({ project: p, title: 'Rapat kickoff', due: '2030-03-02' });
  const canceled = await f.task({ project: p, title: 'Dibatalkan', status: 'canceled' });
  const trashed = await f.task({ project: p, title: 'Di sampah', deletedAt: new Date() });
  if (!a || !b) throw new Error('phase insert returned no rows');
  await db.update(task).set({ phaseId: a.id }).where(eq(task.id, t1.id));
  await db.update(task).set({ phaseId: b.id }).where(eq(task.id, t2.id));
  return { pm, worker, p, loose, canceled, trashed };
}

describe('what is copied', () => {
  it('saves phases, tasks and day offsets, and leaves people and progress out', async () => {
    const { pm, p } = await sampleProject();
    auth.as(pm);
    const res = await save({ projectId: p.id });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'tplfp Renovasi',
      description: 'Renovasi rumah',
      source: 'project',
      omitted: { phases: 0, tasks: 0 },
    });
    expect(res.body.phases.map((ph: Json) => ph.name)).toEqual(['Persiapan', 'Pelaksanaan']);
    expect(res.body.phases[0]).toMatchObject({ startOffsetDays: 0, endOffsetDays: 7 });
    expect(res.body.phases[1]).toMatchObject({ startOffsetDays: 8, endOffsetDays: null });
    expect(res.body.phases[0].tasks[0]).toMatchObject({
      title: 'Beli material',
      dueOffsetDays: 3,
      priority: 'high',
    });
    expect(res.body.phases[1].tasks[0]).toMatchObject({
      title: 'Pasang keramik',
      dueOffsetDays: 19,
    });
    expect(res.body.looseTasks.map((t: Json) => t.title)).toEqual(['Rapat kickoff']);
    // A template has no assignee, status or member column at all, so none can leak into the body.
    expect(JSON.stringify(res.body)).not.toContain(p.leadId);
  });

  it('skips canceled and trashed tasks', async () => {
    const { pm, p } = await sampleProject();
    auth.as(pm);
    const res = await save({ projectId: p.id });
    const titles = [
      ...res.body.phases.flatMap((ph: Json) => ph.tasks.map((t: Json) => t.title)),
      ...res.body.looseTasks.map((t: Json) => t.title),
    ];
    expect(titles).not.toContain('Dibatalkan');
    expect(titles).not.toContain('Di sampah');
  });

  it('round-trips: using the template on the same start date gives back the dates', async () => {
    const { pm, p } = await sampleProject();
    auth.as(pm);
    const saved = await save({ projectId: p.id });
    const used = await call('POST', `/app/projects/templates/${saved.body.id}/use`, {
      startDate: '2030-03-01',
    });
    expect(used.status).toBe(201);
    cleaner.track('project', used.body.id);
    const phases = await db
      .select()
      .from(projectPhase)
      .where(eq(projectPhase.projectId, used.body.id));
    const first = phases.find((ph) => ph.name === 'Persiapan');
    expect(first).toMatchObject({ startDate: '2030-03-01', endDate: addDays('2030-03-01', 7) });
  });

  it('takes the name and description from the request when given', async () => {
    const { pm, p } = await sampleProject();
    auth.as(pm);
    const res = await save({ projectId: p.id, name: 'tplfp Nama lain', description: null });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'tplfp Nama lain', description: null });
  });

  it('does not change the source project', async () => {
    const { pm, p } = await sampleProject();
    auth.as(pm);
    await save({ projectId: p.id });
    const [row] = await db.select().from(project).where(eq(project.id, p.id));
    expect(row?.name).toBe('tplfp Renovasi');
    expect(await db.select().from(task).where(eq(task.projectId, p.id))).toHaveLength(5);
  });
});

describe('size cap', () => {
  it('saves up to the cap and says what was left out', async () => {
    const pm = await f.user({ role: 'project_manager' });
    const p = await f.project({ lead: pm, name: 'tplfp Besar' });
    await f.tasks(p, 23, (i) => ({ title: `Tugas ${i}` }));
    auth.as(pm);
    const res = await save({ projectId: p.id });
    expect(res.status).toBe(201);
    expect(res.body.looseTasks).toHaveLength(20);
    expect(res.body.omitted).toEqual({ phases: 0, tasks: 3 });
  });
});

describe('who may save', () => {
  it('refuses a Member on the project with 403', async () => {
    const { worker, p } = await sampleProject();
    auth.as(worker);
    expectApiError(await save({ projectId: p.id }), 403, 'NOT_APP_ROLE');
  });

  it('answers 404 for a Member who is not on the project, never 403', async () => {
    const { p } = await sampleProject();
    auth.as(await f.user());
    expectApiError(await save({ projectId: p.id }), 404, 'NOT_FOUND');
  });

  it('answers 404 for a missing project and for one in the Trash', async () => {
    const { pm, p } = await sampleProject();
    auth.as(pm);
    expectApiError(await save({ projectId: 'tplfp-nope' }), 404, 'NOT_FOUND');
    await db
      .update(project)
      .set({ deletedAt: new Date(), deletedBy: pm.id })
      .where(eq(project.id, p.id));
    expectApiError(await save({ projectId: p.id }), 404, 'NOT_FOUND');
  });

  it('answers 401 to an anonymous caller and 422 to a body without projectId', async () => {
    expectApiError(await save({ projectId: 'x' }), 401, 'UNAUTHORIZED');
    auth.as(await f.user({ role: 'project_manager' }));
    expect((await save({})).status).toBe(422);
  });

  it('keeps the saved template private to the person who saved it', async () => {
    const { pm, p } = await sampleProject();
    auth.as(pm);
    const res = await save({ projectId: p.id });
    auth.as(await f.user({ role: 'project_manager' }));
    expectApiError(await call('GET', `/app/projects/templates/${res.body.id}`), 404, 'NOT_FOUND');
  });
});
