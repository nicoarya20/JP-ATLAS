/**
 * `GET /api/app/tasks/form-options` (A12): the kinds and phases a task form needs, which the web
 * reads from its SSR loader and a mobile client has no way to reach. Asserted here: the two shapes
 * (every writable project, or one asked for by id), that `/form-options` is not swallowed by the
 * `/:ref` detail route, and that a project the caller may not see answers the same 404 as a
 * missing one.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project as projectTable, projectPhase } from '../../server/db/schema';
import { DEFAULT_TASK_KINDS } from '../../server/pm/limits';
import { call, expectApiError, type Json, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tfopt' });

beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
});
afterAll(() => cleaner.flushAll());

const PATH = '/app/tasks/form-options';
const names = (rows: Json[]) => rows.map((r) => r.name);
const projectIds = (res: Json) => res.body.projects.map((p: Json) => p.id);

let lead: TestUser;
let worker: TestUser;
let watcher: TestUser;
let outsider: TestUser;
let admin: TestUser;
let open: TestProject;
let closed: TestProject;
let trashed: TestProject;

beforeAll(async () => {
  await cleaner.shared(async () => {
    [lead, worker, watcher, outsider, admin] = await Promise.all([
      f.user({ role: 'project_manager' }),
      f.user(),
      f.user(),
      f.user(),
      f.user({ role: 'admin' }),
    ]);
    const members = [
      [worker, 'member'],
      [watcher, 'viewer'],
    ] as const;
    [open, closed, trashed] = await Promise.all([
      f.project({ lead, members, name: 'tfopt Berjalan' }),
      f.project({ lead, members, name: 'tfopt Selesai', status: 'completed' }),
      f.project({ lead, members, name: 'tfopt Sampah' }),
    ]);
    await db.insert(projectPhase).values([
      { projectId: open.id, name: 'Bangun', position: 1 },
      { projectId: open.id, name: 'Desain', position: 0 },
    ]); // test-only
    await db
      .update(projectTable)
      .set({ deletedAt: new Date(), deletedBy: lead.id })
      .where(eq(projectTable.id, trashed.id));
  });
});

describe('sign-in gate and scope', () => {
  it('answers 401 without a session, before it looks at the query', async () => {
    expectApiError(await call('GET', PATH), 401, 'UNAUTHORIZED');
    expectApiError(await call('GET', `${PATH}?projectId=${'x'}`), 401, 'UNAUTHORIZED');
  });

  it('is not swallowed by GET /tasks/:ref', async () => {
    auth.as(worker);
    const res = await call('GET', PATH);
    expect(res.status).toBe(200);
    // The detail route would have answered 404 for the literal ref "form-options".
    expect(Object.keys(res.body)).toEqual(['projects']);
  });
});

describe('GET /app/tasks/form-options without a project', () => {
  it('offers every live project the caller may add a task to, with kinds and phases', async () => {
    auth.as(worker);
    const res = await call('GET', PATH);
    expect(res.status).toBe(200);
    expect(projectIds(res).sort()).toEqual([open.id, closed.id].sort());
    const row = res.body.projects.find((p: Json) => p.id === open.id);
    expect(Object.keys(row).sort()).toEqual(['id', 'kinds', 'name', 'phases']);
    expect(names(row.kinds)).toEqual(DEFAULT_TASK_KINDS.map((k) => k.name));
    expect(Object.keys(row.kinds[0]).sort()).toEqual(['baseKind', 'id', 'name']);
    // Display order, not insertion order: `Desain` has the lower position.
    expect(names(row.phases)).toEqual(['Desain', 'Bangun']);
    expect(Object.keys(row.phases[0]).sort()).toEqual(['id', 'name']);
  });

  it('offers a Pemantau and an outsider nothing at all, not an error', async () => {
    for (const u of [watcher, outsider]) {
      auth.as(u);
      const res = await call('GET', PATH);
      expect(res.status).toBe(200);
      expect(res.body.projects).toEqual([]);
    }
  });

  it('offers an Admin every live project and never one in the Trash', async () => {
    auth.as(admin);
    const got = projectIds(await call('GET', PATH));
    expect(got).toContain(open.id);
    expect(got).toContain(closed.id);
    expect(got).not.toContain(trashed.id);
  });
});

describe('GET /app/tasks/form-options?projectId=', () => {
  it('narrows the answer to that one project, same shape', async () => {
    auth.as(worker);
    const res = await call('GET', `${PATH}?projectId=${open.id}`);
    expect(res.status).toBe(200);
    expect(res.body.projects).toHaveLength(1);
    expect(res.body.projects[0]).toMatchObject({ id: open.id, name: 'tfopt Berjalan' });
    expect(names(res.body.projects[0].phases)).toEqual(['Desain', 'Bangun']);
  });

  it('serves a Pemantau too, because the Edit form of a task they can read needs the lists', async () => {
    auth.as(watcher);
    const res = await call('GET', `${PATH}?projectId=${open.id}`);
    expect(res.status).toBe(200);
    expect(projectIds(res)).toEqual([open.id]);
  });

  it.each([
    ['a project the caller is not in', () => outsider],
    ['a project in the Trash', () => worker],
  ])('answers 404 NOT_FOUND for %s', async (name, who) => {
    auth.as(who());
    const id = name === 'a project in the Trash' ? trashed.id : open.id;
    expectApiError(await call('GET', `${PATH}?projectId=${id}`), 404, 'NOT_FOUND');
  });

  it('answers the same 404 for an id that does not exist, so nothing leaks', async () => {
    auth.as(worker);
    const missing = await call('GET', `${PATH}?projectId=tidak-ada`);
    const hidden = await call('GET', `${PATH}?projectId=${trashed.id}`);
    expectApiError(missing, 404, 'NOT_FOUND');
    expect(missing.body.error).toBe(hidden.body.error);
    expect(missing.body.code).toBe(hidden.body.code);
  });

  it('refuses an empty projectId with 422 rather than falling back to every project', async () => {
    auth.as(worker);
    expectApiError(await call('GET', `${PATH}?projectId=`), 422, 'VALIDATION');
  });
});
