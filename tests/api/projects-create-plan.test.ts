/**
 * POST /app/projects with `phases`/`looseTasks` (plan §4.9): story-mode and template-mode both build
 * a project this way, in the same transaction as the plain form. Plain creation (no phases/tasks) is
 * covered by `tests/api/projects.test.ts`; this file is only the new, additive shape.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { asc, eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project, projectPhase, task, taskKind } from '../../server/db/schema';
import { call, expectApiError, type Json } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'prjplan' });
beforeEach(() => auth.as(null));
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const BASE = '/app/projects';

/** Posts as the signed-in user and tracks a created row so the cleaner removes it. */
async function create(body: Json) {
  const res = await call('POST', BASE, body);
  if (res.status === 201) cleaner.track('project', res.body.id);
  return res;
}

const phasesOf = (projectId: string) =>
  db
    .select()
    .from(projectPhase)
    .where(eq(projectPhase.projectId, projectId))
    .orderBy(asc(projectPhase.position));

const tasksOf = (projectId: string) =>
  db.select().from(task).where(eq(task.projectId, projectId)).orderBy(asc(task.createdAt));

const kindsOf = (projectId: string) =>
  db.select().from(taskKind).where(eq(taskKind.projectId, projectId));

describe('POST /app/projects with phases and loose tasks', () => {
  it('creates the project, its phases (in order) and their tasks in one call', async () => {
    const pm = await f.user({ role: 'project_manager' });
    auth.as(pm);
    const res = await create({
      name: 'Renovasi Dapur',
      phases: [
        {
          name: 'Beli material',
          startDate: '2030-01-01',
          endDate: '2030-01-07',
          tasks: [{ title: 'Beli cat', kindName: 'Bug', dueDate: '2030-01-03' }],
        },
        { name: 'Pasang', startDate: '2030-01-08', endDate: '2030-01-20', tasks: [] },
      ],
      looseTasks: [{ title: 'Rapat kickoff' }],
    });
    expect(res.status).toBe(201);

    const phases = await phasesOf(res.body.id);
    expect(phases.map((p) => p.name)).toEqual(['Beli material', 'Pasang']);
    expect(phases.map((p) => p.position)).toEqual([0, 1]);
    expect(phases[0]).toMatchObject({ startDate: '2030-01-01', endDate: '2030-01-07' });

    const tasks = await tasksOf(res.body.id);
    expect(tasks).toHaveLength(2);
    const byTitle = new Map(tasks.map((t) => [t.title, t]));
    const kinds = await kindsOf(res.body.id);
    const bugKindId = kinds.find((k) => k.name === 'Bug')?.id;
    expect(byTitle.get('Beli cat')).toMatchObject({
      phaseId: phases[0]?.id,
      kindId: bugKindId,
      dueDate: '2030-01-03',
      createdBy: pm.id,
    });
    expect(byTitle.get('Rapat kickoff')).toMatchObject({ phaseId: null });
  });

  it('matches a kind name case-insensitively and falls back to "Tugas" when it matches none', async () => {
    const pm = await f.user({ role: 'project_manager' });
    auth.as(pm);
    const res = await create({
      name: 'Proyek kind',
      looseTasks: [
        { title: 'A', kindName: 'bug' },
        { title: 'B', kindName: 'Epic lama' },
      ],
    });
    expect(res.status).toBe(201);
    const kinds = await kindsOf(res.body.id);
    const tasks = await tasksOf(res.body.id);
    const byTitle = new Map(tasks.map((t) => [t.title, t]));
    expect(byTitle.get('A')?.kindId).toBe(kinds.find((k) => k.name === 'Bug')?.id);
    // Unmatched kind name never fails the creation: it falls back to "Tugas" (plan §4.9 step 5).
    expect(byTitle.get('B')?.kindId).toBe(kinds.find((k) => k.name === 'Tugas')?.id);
  });

  it.each([
    [
      'a phase whose end is before its start',
      { phases: [{ name: 'P', startDate: '2030-02-10', endDate: '2030-02-01' }] },
    ],
    ['a blank phase name', { phases: [{ name: '   ' }] }],
    ['a blank task title', { looseTasks: [{ title: '   ' }] }],
    [
      'more total tasks than the shared cap, across phases and loose tasks together',
      {
        phases: [{ name: 'P', tasks: Array.from({ length: 15 }, (_, i) => ({ title: `T${i}` })) }],
        looseTasks: Array.from({ length: 10 }, (_, i) => ({ title: `L${i}` })),
      },
    ],
  ])('rejects %s with 422 and creates nothing', async (_label, extra) => {
    const pm = await f.user({ role: 'project_manager' });
    auth.as(pm);
    const name = `prjplan-${crypto.randomUUID()}`; // test-only
    expectApiError(await create({ name, ...extra }), 422, 'VALIDATION');
    expect(await db.select().from(project).where(eq(project.name, name))).toEqual([]);
  });

  it('accepts exactly the shared cap but rejects one task over it', async () => {
    const pm = await f.user({ role: 'project_manager' });
    auth.as(pm);
    const atCap = await create({
      name: 'Proyek pas batas',
      looseTasks: Array.from({ length: 20 }, (_, i) => ({ title: `T${i}` })),
    });
    expect(atCap.status).toBe(201);
    const overCap = await create({
      name: 'Proyek lewat batas',
      looseTasks: Array.from({ length: 21 }, (_, i) => ({ title: `T${i}` })),
    });
    expectApiError(overCap, 422, 'VALIDATION');
  });
});
