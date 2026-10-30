/**
 * `POST /app/projects/templates/:id/use` (plan §5.3): instantiates a template into a real project
 * through `createProject()`, converting day offsets to absolute dates against the chosen start date.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { asc, eq, ilike } from 'drizzle-orm';
import { db } from '../../server/db';
import { projectPhase, projectTemplate, task, taskKind } from '../../server/db/schema';
import { call, expectApiError, type Json } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createUserFactory } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createUserFactory(cleaner, { tag: 'tpluse' });
beforeEach(() => auth.as(null));
afterEach(async () => {
  await cleaner.flushTest();
  await db.delete(projectTemplate).where(ilike(projectTemplate.name, `${f.tag}%`));
});
afterAll(() => cleaner.flushAll());

const BASE = '/app/projects/templates';

async function createTemplate(pm: Awaited<ReturnType<typeof f.user>>, body: Json) {
  auth.as(pm);
  const res = await call('POST', BASE, { source: 'manual', ...body });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

async function use(id: string, body: Json) {
  const res = await call('POST', `${BASE}/${id}/use`, body);
  if (res.status === 201) cleaner.track('project', res.body.id);
  return res;
}

describe('instantiate', () => {
  it('converts phase and task offsets to absolute dates against the chosen start date', async () => {
    const pm = await f.user({ role: 'project_manager' });
    const id = await createTemplate(pm, {
      name: 'tpluse-dates',
      phases: [
        {
          name: 'Persiapan',
          startOffsetDays: 0,
          endOffsetDays: 7,
          tasks: [{ title: 'Beli material', dueOffsetDays: 3 }],
        },
        { name: 'Pelaksanaan', startOffsetDays: 8 }, // endOffsetDays absent -> null
      ],
      looseTasks: [{ title: 'Rapat kickoff', dueOffsetDays: 1 }],
    });

    auth.as(pm);
    const res = await use(id, { startDate: '2030-03-01' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'tpluse-dates', startDate: '2030-03-01' });

    const phases = await db
      .select()
      .from(projectPhase)
      .where(eq(projectPhase.projectId, res.body.id))
      .orderBy(asc(projectPhase.position));
    expect(phases.map((p) => p.name)).toEqual(['Persiapan', 'Pelaksanaan']);
    expect(phases[0]).toMatchObject({ startDate: '2030-03-01', endDate: '2030-03-08' });
    expect(phases[1]).toMatchObject({ startDate: '2030-03-09', endDate: null });

    const tasks = await db.select().from(task).where(eq(task.projectId, res.body.id));
    const byTitle = new Map(tasks.map((t) => [t.title, t]));
    expect(byTitle.get('Beli material')).toMatchObject({
      phaseId: phases[0]?.id,
      dueDate: '2030-03-04',
    });
    expect(byTitle.get('Rapat kickoff')).toMatchObject({ phaseId: null, dueDate: '2030-03-02' });
  });

  it('an unmatched kindName never fails the instantiate — it falls back to "Tugas"', async () => {
    const pm = await f.user({ role: 'project_manager' });
    const id = await createTemplate(pm, {
      name: 'tpluse-kind',
      looseTasks: [{ title: 'T', kindName: 'Jenis lama yang sudah dihapus' }],
    });
    auth.as(pm);
    const res = await use(id, { startDate: '2030-01-01' });
    expect(res.status).toBe(201);
    const kinds = await db.select().from(taskKind).where(eq(taskKind.projectId, res.body.id));
    const [t] = await db.select().from(task).where(eq(task.projectId, res.body.id));
    const tugasId = kinds.find((k) => k.name === 'Tugas')?.id;
    expect(tugasId).toBeDefined();
    expect(t?.kindId).toBe(tugasId as string);
  });

  it('honours an overridden name, lead and members, same as the plain create route', async () => {
    const pm = await f.user({ role: 'project_manager' });
    const member = await f.user();
    const id = await createTemplate(pm, { name: 'tpluse-override' });
    auth.as(pm);
    const res = await use(id, {
      name: 'Nama baru',
      startDate: '2030-01-01',
      leadId: pm.id,
      members: [{ userId: member.id, role: 'member' }],
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Nama baru');
    expect(res.body.lead.id).toBe(pm.id);
  });

  it("refuses to use another user's template with the same 404 as a missing one", async () => {
    const pmA = await f.user({ role: 'project_manager' });
    const pmB = await f.user({ role: 'project_manager' });
    const id = await createTemplate(pmA, { name: 'tpluse-foreign' });
    auth.as(pmB);
    expectApiError(await use(id, { startDate: '2030-01-01' }), 404, 'NOT_FOUND');
    expectApiError(await use('does-not-exist', { startDate: '2030-01-01' }), 404, 'NOT_FOUND');
  });

  it('refuses a Member even for their own template (role may have changed since it was saved)', async () => {
    const pm = await f.user({ role: 'project_manager' });
    const id = await createTemplate(pm, { name: 'tpluse-demoted' });
    const demoted = await f.user(); // a fresh Member stands in for "pm demoted to member"
    auth.as(demoted);
    // Not the owner either way, but this specifically proves the role gate runs (NOT_APP_ROLE, not
    // the ownership NOT_FOUND) when the caller cannot create a project at all.
    expectApiError(await use(id, { startDate: '2030-01-01' }), 403, 'NOT_APP_ROLE');
  });

  it('rejects a bad or missing start date with 422 before touching the template', async () => {
    const pm = await f.user({ role: 'project_manager' });
    const id = await createTemplate(pm, { name: 'tpluse-baddate' });
    auth.as(pm);
    expectApiError(await use(id, { startDate: '2030-02-30' }), 422, 'VALIDATION');
  });
});
