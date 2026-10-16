/** Project read API (S1-02): sign-in gate, list/detail/members shapes, IDOR-safe 404, uniform validation errors. */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project } from '../../server/db/schema';
import { PAGE_LIMIT_DEFAULT, PAGE_LIMIT_MAX } from '../../server/pm/limits';
import { call, expectApiError, type Json } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'prjapi' });
beforeEach(() => auth.as(null));
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const BASE = '/app/projects';

/** Whether two error bodies match once the per-request fields (the id and the echoed path) are set aside. */
function expectSameButForRequest(a: Json, b: Json): void {
  const strip = ({ requestId: _id, path: _path, ...rest }: Json) => rest;
  expect(strip(a)).toEqual(strip(b));
}

async function graph() {
  const lead = await f.user({ role: 'project_manager' });
  const me = await f.user();
  const mine = await f.project({
    lead,
    members: [[me, 'member']],
    name: 'Proyek saya',
    dueDate: '2030-01-01',
  });
  const other = await f.project({ lead, name: 'Proyek orang lain' });
  await f.task({ project: mine, status: 'done' });
  await f.task({ project: mine, status: 'todo' });
  return { lead, me, mine, other };
}

describe('sign-in gate', () => {
  it.each([BASE, `${BASE}/p1`, `${BASE}/p1/members`])(
    'GET %s without a session is 401',
    async (path) => {
      expectApiError(await call('GET', path), 401, 'UNAUTHORIZED');
    },
  );

  it('answers 401, not 422, to an anonymous caller with a bad query', async () => {
    expectApiError(await call('GET', `${BASE}?limit=abc&status=nope`), 401, 'UNAUTHORIZED');
  });
});

describe('GET /app/projects', () => {
  it('returns the caller’s projects with the explicit list shape', async () => {
    const { me, mine } = await graph();
    auth.as(me);
    const res = await call('GET', BASE);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1, page: 1, limit: PAGE_LIMIT_DEFAULT });
    expect(res.body.items).toHaveLength(1);
    const item = res.body.items[0];
    expect(Object.keys(item).sort()).toEqual(
      [
        'condition',
        'dueDate',
        'id',
        'lead',
        'myRole',
        'name',
        'priority',
        'progress',
        'status',
      ].sort(),
    );
    expect(item).toMatchObject({
      id: mine.id,
      myRole: 'member',
      progress: { done: 1, total: 2, percent: 50 },
    });
    expect(Object.keys(item.lead).sort()).toEqual(['id', 'name']);
  });

  it('narrows scope=all from a Member to their own projects', async () => {
    const { me } = await graph();
    auth.as(me);
    const res = await call('GET', `${BASE}?scope=all`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it('lets a Project Manager who is not a member read all with scope=all', async () => {
    const { mine } = await graph();
    const pmX = await f.user({ role: 'project_manager' });
    auth.as(pmX);
    const res = await call('GET', `${BASE}?scope=all&q=Proyek saya`);
    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { id: string }) => i.id)).toContain(mine.id);
  });

  it.each([
    ['above the maximum', `limit=${PAGE_LIMIT_MAX + 1}`],
    ['zero', 'limit=0'],
    ['not a number', 'limit=abc'],
    ['page zero', 'page=0'],
    ['an unknown status', 'status=nope'],
    ['an unknown sort', 'sort=nope'],
    ['an unknown scope', 'scope=everything'],
    ['an overlong search', `q=${'x'.repeat(101)}`],
  ])('rejects %s with the uniform 422', async (_label, query) => {
    auth.as(await f.user());
    expectApiError(await call('GET', `${BASE}?${query}`), 422, 'VALIDATION');
  });

  it('honours a small limit and keeps an absurd or fractional page a valid page', async () => {
    const { lead } = await graph();
    for (const n of [1, 2]) await f.project({ lead, name: `Tambahan ${n}` }); // test-only
    auth.as(lead);
    const one = await call('GET', `${BASE}?limit=1`);
    expect(one.body.items).toHaveLength(1);
    expect(one.body.total).toBe(4); // the graph's two projects plus the two added here
    const far = await call('GET', `${BASE}?page=1e300`);
    expect(far.status).toBe(200);
    expect(far.body.items).toEqual([]);
    expect((await call('GET', `${BASE}?page=1.5`)).body.page).toBe(1);
  });
});

describe('GET /app/projects/:id', () => {
  it('returns the detail with can{} and task counts to a member', async () => {
    const { me, mine } = await graph();
    auth.as(me);
    const res = await call('GET', `${BASE}/${mine.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: mine.id,
      taskCounts: { active: 1, overdue: 0 },
      myRole: 'member',
    });
    expect(res.body.can).toBeObject();
    expect(res.body.can.update).not.toBe(true);
  });

  it('answers a non-member and a random id with the same 404 body', async () => {
    const { me, other } = await graph();
    auth.as(me);
    const hidden = await call('GET', `${BASE}/${other.id}`);
    const unknown = await call('GET', `${BASE}/${f.tag}-does-not-exist`);
    expectApiError(hidden, 404, 'NOT_FOUND');
    expectApiError(unknown, 404, 'NOT_FOUND');
    expectSameButForRequest(hidden.body, unknown.body);
  });

  it('answers 404 for a trashed project', async () => {
    const { me, mine } = await graph();
    await db.update(project).set({ deletedAt: new Date() }).where(eq(project.id, mine.id));
    auth.as(me);
    expectApiError(await call('GET', `${BASE}/${mine.id}`), 404, 'NOT_FOUND');
  });
});

describe('GET /app/projects/:id/members', () => {
  it('lists members without email or phone', async () => {
    const { me, mine, lead } = await graph();
    auth.as(me);
    const res = await call('GET', `${BASE}/${mine.id}/members`);
    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { userId: string }) => i.userId)).toEqual([lead.id, me.id]);
    expect(res.body.items[0]).toMatchObject({ role: 'manager', isLead: true });
    expect(JSON.stringify(res.body)).not.toContain('example.test');
  });

  it('answers a non-member and a random id with the same 404 body', async () => {
    const { me, other } = await graph();
    auth.as(me);
    const hidden = await call('GET', `${BASE}/${other.id}/members`);
    const unknown = await call('GET', `${BASE}/${f.tag}-nope/members`);
    expectApiError(hidden, 404, 'NOT_FOUND');
    expectSameButForRequest(hidden.body, unknown.body);
  });
});
