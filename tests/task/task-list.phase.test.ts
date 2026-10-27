/**
 * Phase of a task in the list (rest of H-B5, shown by H-C12): `listTasks` carries `phase` in the
 * same page query it already runs, in the one shape the detail returns, and null when the task
 * belongs to no phase.
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { projectPhase, task } from '../../server/db/schema';
import type { ListTasksResult } from '../../server/task/task.dto';
import { listTasks } from '../../server/task/task.query';
import { getTaskDetail } from '../../server/task/task-detail.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tphase' });
afterAll(() => cleaner.flushAll());

const principal = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });
const clock = { now: ATLAS_NOW, today: '2026-10-07' }; // test-only

function good(res: ListTasksResult) {
  if (!res.ok) throw new Error(`list refused with ${res.code}`);
  return res;
}

// Enough rows that a per-row phase lookup would show up in the query count.
const PAGE_ROWS = 12;

let lead: TestUser;
let projectId: string;
let design: { id: string; name: string };
let build: { id: string; name: string };
/** Task ids by what phase they sit in. */
let inDesign: string;
let inBuild: string;
let noPhase: string;

beforeAll(async () => {
  await cleaner.shared(async () => {
    lead = await f.user({ role: 'project_manager' });
    const project = await f.project({ lead });
    projectId = project.id;
    const phases = await db
      .insert(projectPhase)
      .values([
        { projectId, name: 'Desain', position: 0 },
        { projectId, name: 'Bangun', position: 1 },
      ]) // test-only
      .returning({ id: projectPhase.id, name: projectPhase.name });
    const [first, second] = phases;
    if (!first || !second) throw new Error('phase insert returned no rows');
    design = first;
    build = second;

    const rows = await f.tasks(project, 3, () => ({ creator: lead, assignee: lead }));
    const [a, b, c] = rows.map((r) => r.id);
    if (!a || !b || !c) throw new Error('task insert returned no rows');
    [inDesign, inBuild, noPhase] = [a, b, c];
    await db.update(task).set({ phaseId: design.id }).where(eq(task.id, inDesign));
    await db.update(task).set({ phaseId: build.id }).where(eq(task.id, inBuild));
  });
});

describe('phase in the task list', () => {
  it('names the phase of each task and sends null for a task without one', async () => {
    const res = good(await listTasks(principal(lead), { scope: 'project', projectId }, clock));
    const phaseOf = new Map(res.items.map((i) => [i.id, i.phase]));
    expect(phaseOf.get(inDesign)).toEqual({ id: design.id, name: 'Desain' });
    expect(phaseOf.get(inBuild)).toEqual({ id: build.id, name: 'Bangun' });
    // No phase is null, never a placeholder the UI would have to recognise.
    expect(phaseOf.get(noPhase)).toBeNull();
  });

  it('sends the same shape as the detail of the same task', async () => {
    const res = good(await listTasks(principal(lead), { scope: 'project', projectId }, clock));
    const item = res.items.find((i) => i.id === inDesign);
    const detail = await getTaskDetail(principal(lead), inDesign, clock);
    if (!detail.ok) throw new Error('detail refused with NOT_FOUND');
    expect(item?.phase).toEqual(detail.task.phase);
  });

  it('still hides a task of a project the caller may not see', async () => {
    const outsider = await f.user();
    const res = good(await listTasks(principal(outsider), { scope: 'all' }, clock));
    expect(res.items.map((i) => i.id)).not.toContain(inDesign);
  });

  it('reads the phases of a whole page without one query per row', async () => {
    const project = await f.project({ lead });
    const phased = await db
      .insert(projectPhase)
      .values({ projectId: project.id, name: 'Persiapan', position: 0 }) // test-only
      .returning({ id: projectPhase.id });
    const phaseId = phased[0]?.id;
    if (!phaseId) throw new Error('phase insert returned no row');
    const rows = await f.tasks(project, PAGE_ROWS, () => ({ creator: lead, assignee: lead }));
    await db.update(task).set({ phaseId }).where(eq(task.projectId, project.id));

    const count = async (limit: number) => {
      const { exec, queries } = countQueries();
      const res = good(
        await listTasks(
          principal(lead),
          { scope: 'project', projectId: project.id, limit },
          clock,
          exec,
        ),
      );
      expect(res.items.every((i) => i.phase?.name === 'Persiapan')).toBe(true);
      return { rows: res.items.length, queries: queries.length };
    };
    const one = await count(1);
    const page = await count(PAGE_ROWS);
    expect(one.rows).toBe(1);
    expect(page.rows).toBe(rows.length);
    // Same number of statements for 1 row and for a full page: the phase comes from the page query.
    expect(page.queries).toBe(one.queries);
  });
});
