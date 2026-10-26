/** Task API (S2-03 read, SP2; S2-04 write): sign-in gate, shapes, keyset paging, IDOR-safe 404, closed write bodies. */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project } from '../../server/db/schema';
import { PAGE_LIMIT_MAX } from '../../server/pm/limits';
import { call, expectApiError, type Json } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tskapi' });
beforeEach(() => auth.as(null));
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const BASE = '/app/tasks';

/** The list item and detail keys SP2 locks for the task UI; adding one is fine, renaming one is a contract change. */
const ITEM_KEYS = [
  'assignee',
  'can',
  'checklist',
  'dueDate',
  'id',
  'labels',
  'number',
  'phase',
  'primary',
  'priority',
  'project',
  'status',
  'title',
];
const DETAIL_KEYS = [
  ...ITEM_KEYS,
  'canceledAt',
  'cancel',
  'completedAt',
  'createdAt',
  'creator',
  'description',
  'kind',
  'needsReview',
  'reopenCount',
  'reviewer',
  'startDate',
  'startedAt',
  'updatedAt',
];

function expectSameButForRequest(a: Json, b: Json): void {
  const strip = ({ requestId: _id, path: _path, ...rest }: Json) => rest;
  expect(strip(a)).toEqual(strip(b));
}

async function graph() {
  const lead = await f.user({ role: 'project_manager' });
  const me = await f.user();
  const outsider = await f.user();
  const mine = await f.project({ lead, members: [[me, 'member']] });
  const other = await f.project({ lead });
  const t1 = await f.task({ project: mine, assignee: me, creator: lead, due: '2030-01-01' });
  const t2 = await f.task({ project: mine, assignee: me, status: 'done' });
  const hidden = await f.task({ project: other, assignee: lead });
  return { lead, me, outsider, mine, other, t1, t2, hidden };
}

describe('sign-in gate', () => {
  it.each([BASE, `${BASE}/counts`, `${BASE}/1`])('GET %s without a session is 401', async (p) => {
    expectApiError(await call('GET', p), 401, 'UNAUTHORIZED');
  });

  it('answers 401, not 422, to an anonymous caller with a bad query', async () => {
    expectApiError(await call('GET', `${BASE}?limit=abc&status=nope`), 401, 'UNAUTHORIZED');
  });
});

describe('GET /app/tasks', () => {
  it('returns my tasks with the explicit SP2 shape and response caps', async () => {
    const { me, t1, t2 } = await graph();
    auth.as(me);
    const res = await call('GET', BASE);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['caps', 'items', 'nextCursor']);
    expect(res.body.nextCursor).toBeNull();
    expect(res.body.caps).toEqual({ createTask: true });
    expect(res.body.items.map((i: Json) => i.id).sort()).toEqual([t1.id, t2.id].sort());
    const item = res.body.items.find((i: Json) => i.id === t1.id);
    expect(Object.keys(item).sort()).toEqual([...ITEM_KEYS].sort());
    expect(item).toMatchObject({ number: t1.number, primary: 'start', dueDate: '2030-01-01' });
    expect(item.can).toMatchObject({ update: true, start: true });
  });

  it('hides caps.createTask from a caller with no project to add to', async () => {
    await graph();
    auth.as(await f.user());
    const res = await call('GET', BASE);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], nextCursor: null, caps: {} });
  });

  it('filters by one or several statuses', async () => {
    const { me, t1, t2 } = await graph();
    auth.as(me);
    const one = await call('GET', `${BASE}?status=done`);
    expect(one.body.items.map((i: Json) => i.id)).toEqual([t2.id]);
    const both = await call('GET', `${BASE}?status=todo&status=done`);
    expect(both.body.items.map((i: Json) => i.id).sort()).toEqual([t1.id, t2.id].sort());
  });

  it('lists one project for scope=project and refuses it without a projectId', async () => {
    const { lead, other, hidden } = await graph();
    auth.as(lead);
    const res = await call('GET', `${BASE}?scope=project&projectId=${other.id}`);
    expect(res.body.items.map((i: Json) => i.id)).toEqual([hidden.id]);
    expect(res.body.caps).toEqual({ createTask: true });
    expectApiError(await call('GET', `${BASE}?scope=project`), 422, 'VALIDATION');
  });

  // The Proyek filter on the Tugas page sends `projectId` together with scope `mine` or `all`.
  it('narrows "mine" and "all" to the chosen project, and shows nothing of a project the caller may not see', async () => {
    const { lead, me, mine, other, hidden } = await graph();
    const leadInMine = await f.task({ project: mine, assignee: lead, creator: lead });
    auth.as(lead);
    const ids = async (qs: string) =>
      (await call('GET', `${BASE}?${qs}`)).body.items.map((i: Json) => i.id).sort();
    expect(await ids('scope=mine')).toEqual([hidden.id, leadInMine.id].sort());
    expect(await ids(`scope=mine&projectId=${other.id}`)).toEqual([hidden.id]);
    expect(await ids(`scope=mine&projectId=${mine.id}`)).toEqual([leadInMine.id]);
    expect(await ids(`scope=all&projectId=${other.id}`)).toEqual([hidden.id]);
    // A member of `mine` only: naming another project is an empty list, not a way to read it.
    auth.as(me);
    expect(await ids(`scope=all&projectId=${other.id}`)).toEqual([]);
  });

  it('pages with the keyset cursor without duplicates or gaps', async () => {
    const { me, mine } = await graph();
    await f.tasks(mine, 3, (i) => ({ assignee: me, due: `2030-02-0${i + 1}` }));
    auth.as(me);
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const q: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
      const page = await call('GET', `${BASE}?limit=2${q}`);
      expect(page.status).toBe(200);
      expect(page.body.items.length).toBeLessThanOrEqual(2);
      seen.push(...page.body.items.map((i: Json) => i.id));
      cursor = page.body.nextCursor;
    } while (cursor);
    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(5);
  });

  it('accepts the maximum page size and refuses anything above it', async () => {
    const { me } = await graph();
    auth.as(me);
    expect((await call('GET', `${BASE}?limit=${PAGE_LIMIT_MAX}`)).status).toBe(200);
    expectApiError(await call('GET', `${BASE}?limit=${PAGE_LIMIT_MAX + 1}`), 422, 'VALIDATION');
  });

  it.each([
    ['garbage', 'not-a-cursor'],
    ['valid base64 of junk', Buffer.from('{"x":1}').toString('base64url')],
  ])('answers 400 BAD_CURSOR to a %s cursor', async (_label, cursor) => {
    auth.as((await graph()).me);
    expectApiError(await call('GET', `${BASE}?cursor=${cursor}`), 400, 'BAD_CURSOR');
  });

  it.each([
    ['an unknown status', 'status=nope'],
    ['an unknown scope', 'scope=everything'],
    ['an unknown sort', 'sort=nope'],
    ['an unknown schedule group', 'due=someday'],
    ['an overlong search', `q=${'x'.repeat(101)}`],
  ])('rejects %s with the uniform 422', async (_label, query) => {
    auth.as(await f.user());
    expectApiError(await call('GET', `${BASE}?${query}`), 422, 'VALIDATION');
  });
});

describe('GET /app/tasks/counts', () => {
  it('counts my open tasks per schedule group and all of them per status', async () => {
    const { me } = await graph();
    auth.as(me);
    const res = await call('GET', `${BASE}/counts`);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['byStatus', 'mine']);
    expect(res.body.byStatus).toMatchObject({ todo: 1, done: 1, in_progress: 0 });
    expect(Object.keys(res.body.mine).sort()).toEqual(
      ['later', 'none', 'overdue', 'today', 'tomorrow', 'week'].sort(),
    );
    const open = Object.values(res.body.mine as Record<string, number>).reduce((a, b) => a + b);
    expect(open).toBe(1);
  });
});

describe('GET /app/tasks/:ref', () => {
  it('finds a task by number and by id with the same detail shape', async () => {
    const { me, t1 } = await graph();
    auth.as(me);
    const byNumber = await call('GET', `${BASE}/${t1.number}`);
    expect(byNumber.status).toBe(200);
    expect(Object.keys(byNumber.body).sort()).toEqual([...DETAIL_KEYS].sort());
    expect(byNumber.body).toMatchObject({ id: t1.id, primary: 'start', needsReview: false });
    const byId = await call('GET', `${BASE}/${t1.id}`);
    expect(byId.body).toEqual(byNumber.body);
  });

  it('answers a random id and a non-member with an identical 404', async () => {
    const { outsider, t1 } = await graph();
    auth.as(outsider);
    const hiddenRes = await call('GET', `${BASE}/${t1.id}`);
    const missing = await call('GET', `${BASE}/${crypto.randomUUID()}`);
    const missingNumber = await call('GET', `${BASE}/999999999999`);
    expectApiError(hiddenRes, 404, 'NOT_FOUND');
    expectApiError(missing, 404, 'NOT_FOUND');
    expectSameButForRequest(hiddenRes.body, missing.body);
    expectSameButForRequest(hiddenRes.body, missingNumber.body);
  });

  it('lets a Project Manager who is not a member read, without edit rights', async () => {
    const { t1 } = await graph();
    auth.as(await f.user({ role: 'project_manager' }));
    const res = await call('GET', `${BASE}/${t1.number}`);
    expect(res.status).toBe(200);
    expect(res.body.can).not.toHaveProperty('update');
  });
});

describe('POST /app/tasks', () => {
  it('is 401 without a session, even with a bad body', async () => {
    expectApiError(await call('POST', BASE, { title: '' }), 401, 'UNAUTHORIZED');
  });

  it('creates a task for a project member and answers 201 with the detail shape', async () => {
    const { me, mine } = await graph();
    auth.as(me);
    const res = await call('POST', BASE, {
      projectId: mine.id,
      title: 'Cat ulang pagar',
      dueDate: '2030-03-01',
      checklist: ['Beli cat'],
      needsReview: false,
    });
    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual([...DETAIL_KEYS].sort());
    expect(res.body).toMatchObject({
      title: 'Cat ulang pagar',
      status: 'todo',
      needsReview: false,
    });
    expect(res.body.checklist.total).toBe(1);
  });

  it('ignores stray fields: the creator, status and trash stamp come from the server', async () => {
    const { me, lead, mine } = await graph();
    auth.as(me);
    const res = await call('POST', BASE, {
      projectId: mine.id,
      title: 'Liar',
      createdBy: lead.id,
      status: 'done',
      deletedAt: '2020-01-01T00:00:00Z',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'todo', creator: { id: me.id } });
    expect((await call('GET', `${BASE}/${res.body.number}`)).status).toBe(200);
  });

  it.each([
    ['needsReview true', { needsReview: true }],
    ['tags (S4)', { tags: ['a'] }],
    ['phaseId (S5)', { phaseId: 'p1' }],
    ['estimateHours (S5)', { estimateHours: 3 }],
    ['an impossible date', { dueDate: '2030-02-31' }],
    ['an overlong title', { title: 'x'.repeat(201) }],
  ])('rejects %s with 422', async (_label, extra) => {
    const { me, mine } = await graph();
    auth.as(me);
    const res = await call('POST', BASE, { projectId: mine.id, title: 'x', ...extra });
    expectApiError(res, 422, 'VALIDATION');
  });

  it('refuses a viewer (403), a hidden project (404) and a trashed one (409 PROJECT_IN_TRASH)', async () => {
    const { lead, me, outsider, mine } = await graph();
    const viewer = await f.user();
    const watched = await f.project({ lead, members: [[viewer, 'viewer']] });
    auth.as(viewer);
    expectApiError(
      await call('POST', BASE, { projectId: watched.id, title: 'x' }),
      403,
      'NOT_MEMBER',
    );
    auth.as(outsider);
    expectApiError(await call('POST', BASE, { projectId: mine.id, title: 'x' }), 404, 'NOT_FOUND');
    await db.update(project).set({ deletedAt: new Date() }).where(eq(project.id, mine.id));
    auth.as(me);
    const trashed = await call('POST', BASE, { projectId: mine.id, title: 'x' });
    expectApiError(trashed, 409, 'PROJECT_IN_TRASH');
  });
});

describe('PATCH /app/tasks/:ref', () => {
  it('changes my task partially and ignores stray fields', async () => {
    const { me, lead, other, t1 } = await graph();
    auth.as(me);
    const res = await call('PATCH', `${BASE}/${t1.number}`, {
      priority: 'high',
      projectId: other.id,
      status: 'done',
      createdBy: me.id,
      deletedAt: '2020-01-01T00:00:00Z',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      priority: 'high',
      status: 'todo',
      project: { id: t1.projectId },
      creator: { id: lead.id },
    });
  });

  it('answers 403 NOT_OWNER to another member and 404 to an outsider', async () => {
    const { lead, mine, outsider } = await graph();
    const second = await f.user();
    const shared = await f.project({ lead, members: [[second, 'member']] });
    const t = await f.task({ project: shared, creator: lead });
    auth.as(second);
    expectApiError(await call('PATCH', `${BASE}/${t.id}`, { title: 'x' }), 403, 'NOT_OWNER');
    auth.as(outsider);
    const hiddenTask = await f.task({ project: mine });
    expectApiError(
      await call('PATCH', `${BASE}/${hiddenTask.id}`, { title: 'x' }),
      404,
      'NOT_FOUND',
    );
  });

  it.each([
    ['needsReview', { needsReview: false }],
    ['tags', { tags: [] }],
    ['estimateHours', { estimateHours: 1 }],
  ])('rejects the later-slice field %s with 422', async (_label, body) => {
    const { me, t1 } = await graph();
    auth.as(me);
    expectApiError(await call('PATCH', `${BASE}/${t1.id}`, body), 422, 'VALIDATION');
  });
});
