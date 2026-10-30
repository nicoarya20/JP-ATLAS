/**
 * Project template CRUD (`/app/projects/templates`, plan §5.2, §6): role gate, ownership (404 not
 * 403 for someone else's template, D8-style), replace-all PATCH, and the shared size cap.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { ilike } from 'drizzle-orm';
import {
  PROJECT_DRAFT_PHASES_MAX,
  PROJECT_DRAFT_TASKS_MAX,
} from '../../server/ai/project-draft.limits';
import { db } from '../../server/db';
import { projectTemplate } from '../../server/db/schema';
import { call, expectApiError, type Json } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createUserFactory } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createUserFactory(cleaner, { tag: 'tplapi' });
beforeEach(() => auth.as(null));
afterEach(async () => {
  await cleaner.flushTest();
  // `project_template` is not covered by any CLEANUP_ORDER kind (S0B-21 predates this feature), so
  // this file sweeps the rows it created by their name prefix instead of tracking each one by id.
  await db.delete(projectTemplate).where(ilike(projectTemplate.name, `${f.tag}%`));
});
afterAll(() => cleaner.flushAll());

const BASE = '/app/projects/templates';

async function createTemplate(body: Json) {
  return call('POST', BASE, body);
}

const manualBody = (name: string, over: Json = {}) => ({
  name,
  source: 'manual',
  ...over,
});

describe('role gate', () => {
  it('refuses a Member creating a template with 403', async () => {
    auth.as(await f.user());
    expectApiError(await createTemplate(manualBody('tplapi-x')), 403, 'NOT_APP_ROLE');
  });

  it('answers 401 to an anonymous caller on every route', async () => {
    expectApiError(await call('GET', BASE), 401, 'UNAUTHORIZED');
    expectApiError(await call('GET', `${BASE}/t1`), 401, 'UNAUTHORIZED');
    expectApiError(await call('POST', BASE, manualBody('x')), 401, 'UNAUTHORIZED');
    expectApiError(await call('PATCH', `${BASE}/t1`, manualBody('x')), 401, 'UNAUTHORIZED');
    expectApiError(await call('DELETE', `${BASE}/t1`), 401, 'UNAUTHORIZED');
    expectApiError(
      await call('POST', `${BASE}/t1/use`, { startDate: '2030-01-01' }),
      401,
      'UNAUTHORIZED',
    );
  });
});

describe('create, list and ownership', () => {
  it('creates a template with phases and tasks, and reads it back', async () => {
    const pm = await f.user({ role: 'project_manager' });
    auth.as(pm);
    const res = await createTemplate(
      manualBody('tplapi-renovasi berulang', {
        description: 'Dipakai setiap proyek renovasi',
        phases: [
          {
            name: 'Persiapan',
            startOffsetDays: 0,
            endOffsetDays: 7,
            tasks: [{ title: 'Beli material', kindName: 'Bug', dueOffsetDays: 3 }],
          },
        ],
        looseTasks: [{ title: 'Rapat kickoff' }],
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'tplapi-renovasi berulang', source: 'manual' });
    expect(res.body.phases).toHaveLength(1);
    expect(res.body.phases[0]).toMatchObject({
      name: 'Persiapan',
      startOffsetDays: 0,
      endOffsetDays: 7,
    });
    expect(res.body.phases[0].tasks[0]).toMatchObject({
      title: 'Beli material',
      kindName: 'Bug',
      dueOffsetDays: 3,
    });
    expect(res.body.looseTasks[0]).toMatchObject({ title: 'Rapat kickoff' });

    const get = await call('GET', `${BASE}/${res.body.id}`);
    expect(get.status).toBe(200);
    expect(get.body.id).toBe(res.body.id);
  });

  it("a template only shows up in its creator's own list, never another user's", async () => {
    const pmA = await f.user({ role: 'project_manager' });
    const pmB = await f.user({ role: 'project_manager' });
    auth.as(pmA);
    const made = await createTemplate(manualBody('tplapi-only-a'));
    expect(made.status).toBe(201);

    const listA = await call('GET', `${BASE}?q=tplapi-only-a`);
    expect(listA.body.items.map((i: Json) => i.id)).toContain(made.body.id);

    auth.as(pmB);
    const listB = await call('GET', `${BASE}?q=tplapi-only-a`);
    expect(listB.body.items).toEqual([]);
    // Same id, different owner: 404, never 403 (D8-style).
    expectApiError(await call('GET', `${BASE}/${made.body.id}`), 404, 'NOT_FOUND');
    expectApiError(
      await call('PATCH', `${BASE}/${made.body.id}`, manualBody('x')),
      404,
      'NOT_FOUND',
    );
    expectApiError(await call('DELETE', `${BASE}/${made.body.id}`), 404, 'NOT_FOUND');
  });

  it('answers 404 (not a template at all) for a random id, the same body shape as a foreign one', async () => {
    auth.as(await f.user({ role: 'project_manager' }));
    expectApiError(await call('GET', `${BASE}/does-not-exist`), 404, 'NOT_FOUND');
  });
});

describe('replace-all PATCH and DELETE', () => {
  it('PATCH replaces the whole phase/task list, not merging with what was there before', async () => {
    const pm = await f.user({ role: 'project_manager' });
    auth.as(pm);
    const made = await createTemplate(
      manualBody('tplapi-patch', { phases: [{ name: 'Lama', tasks: [{ title: 'T lama' }] }] }),
    );
    const patched = await call(
      'PATCH',
      `${BASE}/${made.body.id}`,
      manualBody('tplapi-patch v2', { phases: [{ name: 'Baru' }] }),
    );
    expect(patched.status).toBe(200);
    expect(patched.body.name).toBe('tplapi-patch v2');
    expect(patched.body.phases).toHaveLength(1);
    expect(patched.body.phases[0].name).toBe('Baru');
    expect(patched.body.phases[0].tasks).toEqual([]);
  });

  it('DELETE removes the template and its phases/tasks (cascade)', async () => {
    const pm = await f.user({ role: 'project_manager' });
    auth.as(pm);
    const made = await createTemplate(manualBody('tplapi-del', { phases: [{ name: 'P' }] }));
    const del = await call('DELETE', `${BASE}/${made.body.id}`);
    expect(del.status).toBe(204);
    expectApiError(await call('GET', `${BASE}/${made.body.id}`), 404, 'NOT_FOUND');
  });
});

describe('size limits, shared with the AI draft', () => {
  it('rejects more phases than the shared cap', async () => {
    auth.as(await f.user({ role: 'project_manager' }));
    const res = await createTemplate(
      manualBody('tplapi-overphases', {
        phases: Array.from({ length: PROJECT_DRAFT_PHASES_MAX + 1 }, (_, i) => ({ name: `P${i}` })),
      }),
    );
    expectApiError(res, 422, 'VALIDATION');
  });

  it('rejects more total tasks than the shared cap, across phases and loose tasks', async () => {
    auth.as(await f.user({ role: 'project_manager' }));
    const res = await createTemplate(
      manualBody('tplapi-overtasks', {
        phases: [
          {
            name: 'P',
            tasks: Array.from({ length: PROJECT_DRAFT_TASKS_MAX }, (_, i) => ({ title: `T${i}` })),
          },
        ],
        looseTasks: [{ title: 'one over' }],
      }),
    );
    expectApiError(res, 422, 'VALIDATION');
  });
});
