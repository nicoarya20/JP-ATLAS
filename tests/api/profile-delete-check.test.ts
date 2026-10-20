/** GET /api/app/profile/delete-check: which projects block the caller from deleting their account. */
import { afterAll, afterEach, describe, expect, test } from 'bun:test';
import { call, expectApiError } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'delcheck' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const PATH = '/app/profile/delete-check';

describe('GET /profile/delete-check', () => {
  test('a person who manages nothing alone may delete', async () => {
    const me = await f.user();
    auth.as(me);
    const res = await call('GET', PATH);
    expect<number>(res.status).toBe(200);
    expect(res.body).toEqual({ canDelete: true, projects: [], total: 0 });
  });

  test('names the active projects only this person manages, and nobody elses', async () => {
    const me = await f.user({ role: 'project_manager' });
    const other = await f.user({ role: 'project_manager' });
    const mine = await f.project({ lead: me, name: 'Pameran Oktober' });
    await f.project({ lead: other, name: 'Rahasia Orang Lain' });
    auth.as(me);
    const res = await call('GET', PATH);
    expect(res.body).toEqual({
      canDelete: false,
      projects: [{ id: mine.id, name: 'Pameran Oktober' }],
      total: 1,
    });
    expect(JSON.stringify(res.body)).not.toContain('Rahasia Orang Lain');
  });

  test('a shared project does not block', async () => {
    const me = await f.user({ role: 'project_manager' });
    const partner = await f.user({ role: 'project_manager' });
    await f.project({ lead: me, members: [[partner, 'manager']] });
    auth.as(me);
    expect((await call('GET', PATH)).body.canDelete).toBe(true);
  });

  test('while impersonating → 403 IMPERSONATING', async () => {
    const me = await f.user();
    auth.as(me, { impersonatedBy: 'someone-else' });
    expectApiError(await call('GET', PATH), 403, 'IMPERSONATING');
  });

  test('anonymous → 401', async () => {
    auth.as(null);
    expectApiError(await call('GET', PATH), 401, 'UNAUTHORIZED');
  });
});
