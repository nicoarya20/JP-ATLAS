/**
 * Admin project console API (P11 AD-11): `GET /api/admin/projects` lists every live project in the
 * organization, not only the caller's, and carries the Pengelola (lead) name in each row from the
 * shared `listProjects` query (so the Admin list can never diverge from the product list). The gate
 * keeps Members and Project Managers out; the list pages and filters.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { call, expectApiError } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'admprj' });
beforeEach(() => auth.as(null));
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const BASE = '/admin/projects';

describe('gate', () => {
  it('answers 401 to an anonymous caller', async () => {
    expectApiError(await call('GET', BASE), 401, 'UNAUTHORIZED');
  });

  it('answers 401, not 422, to an anonymous caller with a bad query', async () => {
    expectApiError(await call('GET', `${BASE}?limit=abc&status=nope`), 401, 'UNAUTHORIZED');
  });

  it('refuses a Member and a Project Manager with 403 NOT_ADMIN', async () => {
    for (const role of ['member', 'project_manager'] as const) {
      const u = await f.user({ role });
      auth.as(u);
      expectApiError(await call('GET', BASE), 403, 'NOT_ADMIN');
    }
  });
});

describe('GET /admin/projects', () => {
  it('lists projects the Admin does not belong to, with the Pengelola name and the list shape', async () => {
    const token = `tok${crypto.randomUUID().slice(0, 8)}`; // unique so a shared DB cannot inflate the total
    const admin = await f.user({ role: 'admin' });
    const lead = await f.user({ role: 'project_manager', name: 'Bu Lead' });
    const project = await f.project({ lead, name: `${token} Alpha` });

    auth.as(admin);
    const res = await call('GET', `${BASE}?q=${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1, page: 1 });
    expect(res.body.items).toHaveLength(1);
    const item = res.body.items[0];
    expect(item.id).toBe(project.id);
    // The Admin is not a member, yet the project is listed: cross-org scope, not "mine".
    expect(item.myRole).toBeNull();
    // The manager name rides along on the row (no per-project request, R6).
    expect(item.lead).toEqual({ id: lead.id, name: 'Bu Lead' });
  });

  it('returns a clear empty result when a status filter matches nothing', async () => {
    const token = `tok${crypto.randomUUID().slice(0, 8)}`;
    const admin = await f.user({ role: 'admin' });
    const lead = await f.user({ role: 'project_manager' });
    await f.project({ lead, name: `${token} Active`, status: 'active' });

    auth.as(admin);
    const res = await call('GET', `${BASE}?q=${token}&status=canceled`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 0 });
    expect(res.body.items).toEqual([]);
  });

  it('pages the list: limit caps the page and total counts every match', async () => {
    const token = `tok${crypto.randomUUID().slice(0, 8)}`;
    const admin = await f.user({ role: 'admin' });
    const lead = await f.user({ role: 'project_manager' });
    for (const n of [1, 2, 3]) await f.project({ lead, name: `${token} P${n}` });

    auth.as(admin);
    const first = await call('GET', `${BASE}?q=${token}&limit=2&page=1`);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect(first.body.items).toHaveLength(2);

    const second = await call('GET', `${BASE}?q=${token}&limit=2&page=2`);
    expect(second.body).toMatchObject({ total: 3, page: 2, limit: 2 });
    expect(second.body.items).toHaveLength(1);
  });
});
