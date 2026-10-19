/** Project API: reads (S1-02: gate, shapes, IDOR-safe 404, uniform errors) and writes (S1-03: roles, mass assignment, keys). */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { API_KEY_PREFIX } from '../../server/auth';
import { db } from '../../server/db';
import { project, projectMember } from '../../server/db/schema';
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
const row = async (id: string) => (await db.select().from(project).where(eq(project.id, id)))[0];

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
        'startDate', // added for the Gantt view (S5a): the list now carries the start date
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

describe('project writes: sign-in and role gates', () => {
  it.each([
    ['POST', BASE],
    ['PATCH', `${BASE}/p1`],
    ['POST', `${BASE}/p1/status`],
    ['PUT', `${BASE}/p1/lead`],
  ])('%s %s without a session is 401, even with a bad body', async (method, path) => {
    expectApiError(await call(method, path, { bogus: true }), 401, 'UNAUTHORIZED');
  });

  it('refuses a Member creating a project with 403 and writes nothing', async () => {
    const me = await f.user();
    auth.as(me);
    const name = `prjapi-${crypto.randomUUID()}`; // test-only
    expectApiError(await call('POST', BASE, { name }), 403, 'NOT_APP_ROLE');
    expect(await db.select().from(project).where(eq(project.name, name))).toEqual([]);
  });
});

describe('POST /app/projects', () => {
  /** Posts as the signed-in user and tracks a created row so the cleaner removes it. */
  async function create(body: Json) {
    const res = await call('POST', BASE, body);
    if (res.status === 201) cleaner.track('project', res.body.id);
    return res;
  }

  it('creates a draft project with the caller as Lead and answers 201 with the detail', async () => {
    const pm = await f.user({ role: 'project_manager' });
    auth.as(pm);
    const res = await create({ name: 'Renovasi Dapur', dueDate: '2030-01-31' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Renovasi Dapur',
      status: 'draft',
      lead: { id: pm.id },
      myRole: 'manager',
      dueDate: '2030-01-31',
    });
    expect(res.body.can.update).toBe(true);
  });

  it('ignores smuggled id, createdBy, deletedAt, deletedBy and member addedBy', async () => {
    const pm = await f.user({ role: 'project_manager' });
    const other = await f.user();
    auth.as(pm);
    const res = await create({
      name: 'Proyek liar',
      id: `${f.tag}-chosen`,
      projectId: `${f.tag}-chosen`,
      createdBy: other.id,
      deletedAt: '2020-01-01T00:00:00Z',
      deletedBy: other.id,
      completedAt: '2020-01-01T00:00:00Z',
      members: [{ userId: other.id, role: 'member', addedBy: other.id }],
    });
    // Elysia strips keys outside the strict schema, so nothing beyond the listed fields is written.
    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe(`${f.tag}-chosen`);
    expect(await row(res.body.id)).toMatchObject({
      createdBy: pm.id,
      deletedAt: null,
      deletedBy: null,
      completedAt: null,
      leadId: pm.id,
    });
    const [m] = await db
      .select({ addedBy: projectMember.addedBy })
      .from(projectMember)
      .where(and(eq(projectMember.projectId, res.body.id), eq(projectMember.userId, other.id)));
    expect(m?.addedBy).toBe(pm.id);
  });

  it.each([
    ['tasksNeedReviewDefault: true', { tasksNeedReviewDefault: true }],
    ['a completed start', { status: 'completed' }],
    ['due before start', { startDate: '2030-02-10', dueDate: '2030-02-01' }],
    ['an impossible date', { dueDate: '2030-02-30' }],
    ['an empty name', { name: '' }],
  ])('rejects %s with 422', async (_label, extra) => {
    auth.as(await f.user({ role: 'project_manager' }));
    expectApiError(await create({ name: 'Proyek', ...extra }), 422, 'VALIDATION');
  });
});

describe('PATCH, status and Lead routes', () => {
  async function owned() {
    const lead = await f.user({ role: 'project_manager' });
    const other = await f.user();
    const p = await f.project({ lead, members: [[other, 'manager']], dueDate: '2030-01-01' });
    return { lead, other, p };
  }

  it('edits details; leadId, status and createdBy smuggled into PATCH change nothing', async () => {
    const { lead, other, p } = await owned();
    auth.as(lead);
    const ok = await call('PATCH', `${BASE}/${p.id}`, { name: 'Baru', dueDate: '2030-02-01' });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ name: 'Baru', dueDate: '2030-02-01' });
    const smuggled = {
      leadId: other.id,
      status: 'canceled',
      createdBy: other.id,
      deletedAt: '2020-01-01',
    };
    expect((await call('PATCH', `${BASE}/${p.id}`, { name: 'X', ...smuggled })).status).toBe(200);
    expect(await row(p.id)).toMatchObject({
      name: 'X',
      deletedAt: null,
      leadId: lead.id,
      status: 'active',
      createdBy: lead.id,
    });
  });

  it('lets the manager move completed → active', async () => {
    const { lead, p } = await owned();
    auth.as(lead);
    expect(
      (await call('POST', `${BASE}/${p.id}/status`, { status: 'completed' })).body.status,
    ).toBe('completed');
    expect((await call('POST', `${BASE}/${p.id}/status`, { status: 'active' })).body.status).toBe(
      'active',
    );
    expectApiError(
      await call('POST', `${BASE}/${p.id}/status`, { status: 'archived' }),
      422,
      'VALIDATION',
    );
  });

  it('hands the Lead over, refuses a non-manager candidate with LEAD_MUST_BE_MANAGER', async () => {
    const { lead, other, p } = await owned();
    const member = await f.user();
    auth.as(lead);
    const moved = await call('PUT', `${BASE}/${p.id}/lead`, { userId: other.id });
    expect(moved.status).toBe(200);
    expect(moved.body.lead.id).toBe(other.id);
    expectApiError(
      await call('PUT', `${BASE}/${p.id}/lead`, { userId: member.id }),
      422,
      'LEAD_MUST_BE_MANAGER',
    );
  });

  it('answers a non-member the same 404 as a random id', async () => {
    const { p } = await owned();
    auth.as(await f.user());
    const hidden = await call('PATCH', `${BASE}/${p.id}`, { name: 'X' });
    const unknown = await call('PATCH', `${BASE}/${f.tag}-nope`, { name: 'X' });
    expectApiError(hidden, 404, 'NOT_FOUND');
    expectSameButForRequest(hidden.body, unknown.body);
  });

  it('answers 409 PROJECT_IN_TRASH for a trashed project', async () => {
    const { lead, p } = await owned();
    await db.update(project).set({ deletedAt: new Date() }).where(eq(project.id, p.id));
    auth.as(lead);
    expectApiError(
      await call('POST', `${BASE}/${p.id}/status`, { status: 'draft' }),
      409,
      'PROJECT_IN_TRASH',
    );
  });
});

describe('API keys on the write routes', () => {
  // Denied routes answer before the key is verified, so any well-formed key shows the decision.
  const key = { 'x-api-key': `${API_KEY_PREFIX}not-a-real-key` }; // test-only

  it('refuses a key on PUT /lead outright (session only)', async () => {
    const res = await call('PUT', `${BASE}/p1/lead`, { userId: 'u1' }, key);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Endpoint ini tidak bisa diakses dengan API key');
  });
});
