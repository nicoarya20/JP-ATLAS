/** Task form options (S2-11): only projects the caller may add a task to, each with its active kinds. */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { project, projectPhase, taskKind } from '../../server/db/schema';
import { DEFAULT_TASK_KINDS } from '../../server/pm/limits';
import {
  listTaskFormProjects,
  loadTaskKinds,
  loadTaskPhases,
} from '../../server/task/task-form.query';
import { createCleaner } from '../support/cleanup';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tform' });
afterAll(() => cleaner.flushAll());

const principal = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

let lead: TestUser;
let worker: TestUser;
let watcher: TestUser;
let outsiderPm: TestUser;
let admin: TestUser;
let open: TestProject;
let closed: TestProject;
let trashed: TestProject;
beforeAll(async () => {
  [lead, worker, watcher, outsiderPm, admin] = await Promise.all([
    f.user({ role: 'project_manager' }),
    f.user(),
    f.user(),
    f.user({ role: 'project_manager' }),
    f.user({ role: 'admin' }),
  ]);
  const members = [
    [worker, 'member'],
    [watcher, 'viewer'],
  ] as const;
  [open, closed, trashed] = await Promise.all([
    f.project({ lead, members, name: 'tform Berjalan' }),
    f.project({ lead, members, name: 'tform Selesai', status: 'completed' }),
    f.project({ lead, members, name: 'tform Sampah' }),
  ]);
  await db.update(project).set({ deletedAt: new Date() }).where(eq(project.id, trashed.id));
});

describe('listTaskFormProjects', () => {
  it('offers a Pengelola and an Anggota their live projects, closed ones included (Q12)', async () => {
    for (const u of [lead, worker]) {
      expect(ids(await listTaskFormProjects(principal(u))).sort()).toEqual(
        [open.id, closed.id].sort(),
      );
    }
  });

  it('offers a Pemantau and a Project Manager outside the project nothing', async () => {
    expect(await listTaskFormProjects(principal(watcher))).toEqual([]);
    expect(await listTaskFormProjects(principal(outsiderPm))).toEqual([]);
  });

  it('offers an Admin every live project without membership, never a trashed one', async () => {
    const got = ids(await listTaskFormProjects(principal(admin)));
    expect(got).toContain(open.id);
    expect(got).toContain(closed.id);
    expect(got).not.toContain(trashed.id);
  });

  it('carries the project kinds, archived kinds left out', async () => {
    const [row] = (await listTaskFormProjects(principal(worker))).filter((p) => p.id === open.id);
    expect(row?.name).toBe('tform Berjalan');
    expect(row?.kinds.map((k) => k.name)).toEqual(DEFAULT_TASK_KINDS.map((k) => k.name));
    await db
      .update(taskKind)
      .set({ archivedAt: new Date() })
      .where(eq(taskKind.id, open.kinds.idea));
    const kinds = (await loadTaskKinds([open.id])).get(open.id) ?? [];
    expect(kinds.map((k) => k.id)).not.toContain(open.kinds.idea);
    expect(kinds.map((k) => k.baseKind)).toEqual(['task', 'issue']);
  });

  it('carries the phases of each project in display order, none for a project without any', async () => {
    await db.insert(projectPhase).values([
      { projectId: open.id, name: 'Bangun', position: 1 },
      { projectId: open.id, name: 'Desain', position: 0 },
    ]); // test-only
    const rows = await listTaskFormProjects(principal(worker));
    expect(rows.find((p) => p.id === open.id)?.phases.map((p) => p.name)).toEqual([
      'Desain',
      'Bangun',
    ]);
    expect(rows.find((p) => p.id === closed.id)?.phases).toEqual([]);
  });

  it('answers an empty map for no projects without a query', async () => {
    expect((await loadTaskKinds([])).size).toBe(0);
    expect((await loadTaskPhases([])).size).toBe(0);
  });
});
