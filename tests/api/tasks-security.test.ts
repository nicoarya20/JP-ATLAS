/**
 * Task IDOR matrix (S2-07, R03 §2.2): the eight personas against the read route and every task write
 * route, through the real router. A refused write must leave the task, its checklist and its comments
 * exactly as they were; a Member outside the project gets the same 404 as a task that does not exist.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { asc, eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { task, taskChecklistItem, taskComment } from '../../server/db/schema';
import type { TaskStatus } from '../../server/pm/enums';
import { PERSONA_CODES, type PersonaCode } from '../access/fixtures';
import { call, expectApiError, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import type { TestProject } from '../support/factory.project';
import { createFactory, type TestTask } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tsecm' });

type World = { proj: TestProject; owner: TestUser; people: Record<PersonaCode, TestUser> };
let w: World;

beforeAll(async () => {
  w = await cleaner.shared(async () => {
    const lead = await f.user({ role: 'project_manager' });
    const owner = await f.user();
    const people: Record<PersonaCode, TestUser> = {
      SA: await f.user({ role: 'super-admin' }),
      AD: await f.user({ role: 'admin' }),
      'PM-K': lead,
      'PM-X': await f.user({ role: 'project_manager' }),
      'M-K': await f.user(),
      AG: await f.user(),
      PT: await f.user(),
      BA: await f.user(),
    };
    const proj = await f.project({
      lead,
      members: [
        [owner, 'member'],
        [people.AD, 'viewer'], // K6: an Admin is never limited by the project role they hold
        [people['M-K'], 'manager'],
        [people.AG, 'member'],
        [people.PT, 'viewer'],
      ],
    });
    return { proj, owner, people };
  });
});
beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
});
afterEach(() => cleaner.flushTest());
afterAll(async () => {
  resetApiLimiters();
  await cleaner.flushAll();
});

type Verdict = 'ok' | readonly [403 | 404, string];
type Row = Record<PersonaCode, Verdict>;
const NOT_MEMBER = [403, 'NOT_MEMBER'] as const;
const NOT_OWNER = [403, 'NOT_OWNER'] as const;
const NOT_FOUND = [404, 'NOT_FOUND'] as const;
const row = (over: Partial<Row>): Row => ({
  SA: 'ok',
  AD: 'ok',
  'PM-K': 'ok',
  'PM-X': 'ok',
  'M-K': 'ok',
  AG: 'ok',
  PT: 'ok',
  BA: NOT_FOUND, // M21: a Member outside the project cannot tell the task exists
  ...over,
});
// The task belongs to `owner`, so AG (another Member) is neither its creator nor its assignee.
const READ = row({});
const WRITE = row({ 'PM-X': NOT_MEMBER, AG: NOT_OWNER, PT: NOT_MEMBER });
const COMMENT = row({ 'PM-X': NOT_MEMBER });
const CREATE = row({ 'PM-X': NOT_MEMBER, PT: NOT_MEMBER });
const EDIT_COMMENT = row({
  SA: NOT_OWNER,
  AD: NOT_OWNER,
  'PM-K': NOT_OWNER,
  'PM-X': NOT_MEMBER,
  'M-K': NOT_OWNER,
  AG: NOT_OWNER,
  PT: NOT_OWNER,
});
const DELETE_COMMENT = row({ 'PM-X': NOT_OWNER, AG: NOT_OWNER, PT: NOT_OWNER });

type Seeded = { t: TestTask; itemId: string; commentId: string };
type RouteSpec = {
  name: string;
  status: TaskStatus;
  verdict: Row;
  ok: number;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: (s: Seeded) => string;
  body?: unknown;
};

const base = (s: Seeded) => `/app/tasks/${s.t.number}`;
const ROUTES: RouteSpec[] = [
  { name: 'read', status: 'todo', verdict: READ, ok: 200, method: 'GET', path: base },
  {
    name: 'timeline',
    status: 'todo',
    verdict: READ,
    ok: 200,
    method: 'GET',
    path: (s) => `${base(s)}/timeline`,
  },
  {
    name: 'update',
    status: 'todo',
    verdict: WRITE,
    ok: 200,
    method: 'PATCH',
    path: base,
    body: { title: 'Judul diubah', priority: 'high' },
  },
  ...(
    [
      ['start', 'todo', undefined],
      ['unstart', 'in_progress', undefined],
      ['complete', 'in_progress', undefined],
      ['reopen', 'done', { reason: 'Masih ada yang kurang' }],
      ['cancel', 'todo', { category: 'duplicate' }],
      ['uncancel', 'canceled', undefined],
    ] as const
  ).map(
    ([verb, status, body]): RouteSpec => ({
      name: verb,
      status,
      verdict: WRITE,
      ok: 200,
      method: 'POST',
      path: (s) => `${base(s)}/${verb}`,
      body,
    }),
  ),
  {
    name: 'checklist add',
    status: 'todo',
    verdict: WRITE,
    ok: 201,
    method: 'POST',
    path: (s) => `${base(s)}/checklist`,
    body: { text: 'Langkah baru' },
  },
  {
    name: 'checklist tick',
    status: 'todo',
    verdict: WRITE,
    ok: 200,
    method: 'PATCH',
    path: (s) => `${base(s)}/checklist/${s.itemId}`,
    body: { isDone: true },
  },
  {
    name: 'checklist remove',
    status: 'todo',
    verdict: WRITE,
    ok: 200,
    method: 'DELETE',
    path: (s) => `${base(s)}/checklist/${s.itemId}`,
  },
  {
    name: 'comment add',
    status: 'todo',
    verdict: COMMENT,
    ok: 201,
    method: 'POST',
    path: (s) => `${base(s)}/comments`,
    body: { body: 'Sudah saya cek' },
  },
  {
    name: 'comment edit',
    status: 'todo',
    verdict: EDIT_COMMENT,
    ok: 200,
    method: 'PATCH',
    path: (s) => `${base(s)}/comments/${s.commentId}`,
    body: { body: 'Teks diganti' },
  },
  {
    name: 'comment remove',
    status: 'todo',
    verdict: DELETE_COMMENT,
    ok: 200,
    method: 'DELETE',
    path: (s) => `${base(s)}/comments/${s.commentId}`,
  },
];

/** A task of `owner` in `status` with one checklist step and one comment by `owner`. */
async function seed(status: TaskStatus): Promise<Seeded> {
  const t = await f.task({ project: w.proj, creator: w.owner, assignee: w.owner, status });
  const [item] = await db
    .insert(taskChecklistItem)
    .values({ taskId: t.id, text: 'Langkah awal', position: 0 })
    .returning({ id: taskChecklistItem.id });
  const [comment] = await db
    .insert(taskComment)
    .values({ taskId: t.id, authorId: w.owner.id, authorName: w.owner.name, body: 'Catatan awal' })
    .returning({ id: taskComment.id });
  if (!item || !comment) throw new Error(`Seeding the parts of task ${t.id} failed`);
  return { t, itemId: item.id, commentId: comment.id };
}

/** Everything a write could touch on one task; equal before and after a refused write. */
async function fingerprint(taskId: string) {
  const [row] = await db
    .select({
      projectId: task.projectId,
      status: task.status,
      title: task.title,
      priority: task.priority,
      assigneeId: task.assigneeId,
      createdBy: task.createdBy,
      lastActivityAt: task.lastActivityAt,
    })
    .from(task)
    .where(eq(task.id, taskId));
  const items = await db
    .select({
      id: taskChecklistItem.id,
      text: taskChecklistItem.text,
      done: taskChecklistItem.isDone,
    })
    .from(taskChecklistItem)
    .where(eq(taskChecklistItem.taskId, taskId))
    .orderBy(asc(taskChecklistItem.id));
  const comments = await db
    .select({ id: taskComment.id, body: taskComment.body, deletedAt: taskComment.deletedAt })
    .from(taskComment)
    .where(eq(taskComment.taskId, taskId))
    .orderBy(asc(taskComment.id));
  return { row, items, comments };
}

const CASES = ROUTES.flatMap((r) => PERSONA_CODES.map((code) => [r.name, code, r] as const));

describe('IDOR matrix: eight personas × every task route', () => {
  it.each(CASES)('%s as %s', async (_name, code, r) => {
    const s = await seed(r.status);
    const before = await fingerprint(s.t.id);
    auth.as(w.people[code]);
    const res = await call(r.method, r.path(s), r.body);
    const verdict = r.verdict[code];
    if (verdict === 'ok') {
      expect(res.status).toBe(r.ok);
      return;
    }
    expectApiError(res, verdict[0], verdict[1]);
    expect(await fingerprint(s.t.id)).toEqual(before);
  });

  it.each([...PERSONA_CODES])('create in the project as %s', async (code) => {
    const count = async () =>
      (await db.select({ id: task.id }).from(task).where(eq(task.projectId, w.proj.id))).length;
    const before = await count();
    auth.as(w.people[code]);
    const res = await call('POST', '/app/tasks', { projectId: w.proj.id, title: 'Tugas persona' });
    const verdict = CREATE[code];
    if (verdict === 'ok') {
      expect(res.status).toBe(201);
      expect(res.body.projectId ?? res.body.project?.id).toBe(w.proj.id);
      return;
    }
    expectApiError(res, verdict[0], verdict[1]);
    expect(await count()).toBe(before);
  });
});

describe('a hidden task looks exactly like a missing one', () => {
  it('BA gets the same 404 body for a real task as for an unknown number and id', async () => {
    const s = await seed('todo');
    auth.as(w.people.BA);
    // `path` and `requestId` echo the request; everything that describes the outcome must match.
    const strip = (b: Record<string, unknown>) => ({
      status: b.status,
      code: b.code,
      error: b.error,
    });
    const real = await call('GET', base(s));
    const unknownNumber = await call('GET', '/app/tasks/999999999');
    const unknownId = await call('GET', `/app/tasks/${s.t.id}-x`);
    expect(real.status).toBe(404);
    expect(strip(real.body)).toEqual(strip(unknownNumber.body));
    expect(strip(real.body)).toEqual(strip(unknownId.body));
    const byId = await call('GET', `/app/tasks/${s.t.id}`);
    expect(strip(byId.body)).toEqual(strip(real.body));
  });

  it('the list never carries a task of a project BA is not in', async () => {
    const s = await seed('todo');
    auth.as(w.people.BA);
    for (const qs of ['scope=all', 'scope=mine', `scope=project&projectId=${w.proj.id}`]) {
      const res = await call('GET', `/app/tasks?${qs}&limit=50`);
      const ids = ((res.body?.items ?? []) as Array<{ id: string }>).map((i) => i.id);
      expect(ids).not.toContain(s.t.id);
    }
  });
});
