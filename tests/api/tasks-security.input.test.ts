/**
 * Task input guards (S2-07): mass assignment on every task POST/PATCH, no cross-project reach through
 * `:ref` and child ids (C-ACC-3), and the per-user write limiter on the task routes (R04 §3.10).
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { task, taskChecklistItem, taskComment } from '../../server/db/schema';
import type { TaskStatus } from '../../server/pm/enums';
import { WRITE_RATE_MAX } from '../../server/pm/limits';
import { call, expectApiError, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tseci' });
beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
});
afterEach(() => cleaner.flushTest());
afterAll(async () => {
  resetApiLimiters();
  await cleaner.flushAll();
});

const FORGED_DATE = '2020-01-01T00:00:00.000Z'; // test-only

/** Two projects: `owner` works in A only, `stranger` in B only, `admin` sees both. */
async function graph() {
  const lead = await f.user({ role: 'project_manager' });
  const owner = await f.user();
  const stranger = await f.user();
  const admin = await f.user({ role: 'admin' });
  const a = await f.project({ lead, members: [[owner, 'member']] });
  const b = await f.project({ lead, members: [[stranger, 'member']] });
  const ta = await f.task({ project: a, creator: owner, assignee: owner });
  const tb = await f.task({ project: b, creator: stranger, assignee: stranger });
  return { lead, owner, stranger, admin, a, b, ta, tb };
}

const taskRow = async (id: string) => (await db.select().from(task).where(eq(task.id, id)))[0];

/**
 * Elysia strips keys a body schema does not name before the handler runs, so the write still succeeds
 * with only its own fields; the DB checks after each call prove the stray keys changed nothing.
 */
function expectIgnored(status: number, ok: number) {
  expect(status).toBe(ok);
}

describe('mass assignment: stray fields have no effect', () => {
  it('POST /tasks ignores server-owned columns', async () => {
    const g = await graph();
    auth.as(g.owner);
    const forged = {
      id: 'forged-task-id',
      number: 1,
      status: 'done',
      createdBy: g.stranger.id,
      reviewerId: g.stranger.id,
      reopenCount: 9,
      completedAt: FORGED_DATE,
      deletedAt: FORGED_DATE,
      lastActivityAt: FORGED_DATE,
      cancelCategory: 'other',
    };
    const res = await call('POST', '/app/tasks', {
      projectId: g.a.id,
      title: 'Tugas dengan field liar',
      ...forged,
    });
    expectIgnored(res.status, 201);
    const rows = await db.select().from(task).where(eq(task.projectId, g.a.id));
    expect(rows.find((r) => r.id === forged.id)).toBeUndefined();
    const made = rows.find((r) => r.title === 'Tugas dengan field liar');
    expect(made).toMatchObject({
      status: 'todo',
      createdBy: g.owner.id,
      reviewerId: null,
      reopenCount: 0,
      completedAt: null,
      deletedAt: null,
      cancelCategory: null,
    });
    expect(made?.number).not.toBe(forged.number);
  });

  it('PATCH /tasks/:ref cannot move the task, change its state or forge its history', async () => {
    const g = await graph();
    auth.as(g.owner);
    const before = await taskRow(g.ta.id);
    const res = await call('PATCH', `/app/tasks/${g.ta.number}`, {
      title: 'Judul baru',
      projectId: g.b.id,
      status: 'done',
      number: g.tb.number,
      createdBy: g.stranger.id,
      reopenCount: 5,
      completedAt: FORGED_DATE,
      deletedAt: FORGED_DATE,
    });
    expectIgnored(res.status, 200);
    const after = await taskRow(g.ta.id);
    expect(after).toMatchObject({
      title: 'Judul baru',
      projectId: g.a.id,
      status: before?.status,
      number: before?.number,
      createdBy: g.owner.id,
      reopenCount: 0,
      completedAt: null,
      deletedAt: null,
    });
  });

  it.each([
    ['start', {}],
    ['complete', { status: 'canceled' }],
    ['cancel', { category: 'duplicate', status: 'done', canceledAt: FORGED_DATE }],
  ] as const)('POST …/%s applies only its own step', async (verb, extra) => {
    const g = await graph();
    auth.as(g.owner);
    const res = await call('POST', `/app/tasks/${g.ta.number}/${verb}`, {
      ...extra,
      assigneeId: g.stranger.id,
      createdBy: g.stranger.id,
      projectId: g.b.id,
    });
    expectIgnored(res.status, 200);
    const after = await taskRow(g.ta.id);
    expect(after).toMatchObject({
      projectId: g.a.id,
      assigneeId: g.owner.id,
      createdBy: g.owner.id,
    });
    const to: Record<typeof verb, TaskStatus> = {
      start: 'in_progress',
      complete: 'done',
      cancel: 'canceled',
    };
    expect(after?.status).toBe(to[verb]);
  });

  it('checklist writes cannot attach a step elsewhere or forge who ticked it', async () => {
    const g = await graph();
    auth.as(g.owner);
    const add = await call('POST', `/app/tasks/${g.ta.number}/checklist`, {
      text: 'Langkah',
      taskId: g.tb.id,
      isDone: true,
      doneBy: g.stranger.id,
    });
    expectIgnored(add.status, 201);
    const [item] = await db
      .insert(taskChecklistItem)
      .values({ taskId: g.ta.id, text: 'Langkah tetap', position: 9 })
      .returning();
    const patch = await call('PATCH', `/app/tasks/${g.ta.number}/checklist/${item?.id}`, {
      isDone: true,
      taskId: g.tb.id,
      doneBy: g.stranger.id,
    });
    expectIgnored(patch.status, 200);
    expect(
      await db.select().from(taskChecklistItem).where(eq(taskChecklistItem.taskId, g.tb.id)),
    ).toEqual([]);
    for (const row of await db
      .select()
      .from(taskChecklistItem)
      .where(eq(taskChecklistItem.taskId, g.ta.id))) {
      expect(row.doneBy === null || row.doneBy === g.owner.id).toBe(true);
    }
  });

  it('comment writes cannot pose as someone else or land on another task', async () => {
    const g = await graph();
    auth.as(g.owner);
    const forged = {
      authorId: g.stranger.id,
      authorName: 'Boss',
      taskId: g.tb.id,
      editedAt: FORGED_DATE,
    };
    const add = await call('POST', `/app/tasks/${g.ta.number}/comments`, {
      body: 'Halo',
      ...forged,
    });
    expectIgnored(add.status, 201);
    const [own] = await db
      .insert(taskComment)
      .values({ taskId: g.ta.id, authorId: g.owner.id, authorName: g.owner.name, body: 'Asli' })
      .returning();
    const edit = await call('PATCH', `/app/tasks/${g.ta.number}/comments/${own?.id}`, {
      body: 'Diubah',
      ...forged,
    });
    expectIgnored(edit.status, 200);
    expect(await db.select().from(taskComment).where(eq(taskComment.taskId, g.tb.id))).toEqual([]);
    for (const row of await db.select().from(taskComment).where(eq(taskComment.taskId, g.ta.id))) {
      expect(row).toMatchObject({ authorId: g.owner.id, authorName: g.owner.name });
    }
  });
});

describe('no reach across projects', () => {
  it('there is no /projects/:id/tasks/:ref route, so a task never answers under another project', async () => {
    const g = await graph();
    auth.as(g.admin);
    for (const path of [
      `/app/projects/${g.a.id}/tasks/${g.tb.number}`,
      `/app/projects/${g.a.id}/tasks/${g.tb.id}`,
    ]) {
      const res = await call('GET', path);
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body ?? {})).not.toContain(g.tb.title);
    }
  });

  it('a step or comment of task B cannot be reached through task A, even by an Admin', async () => {
    const g = await graph();
    const [item] = await db
      .insert(taskChecklistItem)
      .values({ taskId: g.tb.id, text: 'Milik B', position: 0 })
      .returning();
    const [comment] = await db
      .insert(taskComment)
      .values({ taskId: g.tb.id, authorId: g.stranger.id, authorName: g.stranger.name, body: 'B' })
      .returning();
    const a = `/app/tasks/${g.ta.number}`;
    for (const who of [g.owner, g.admin]) {
      auth.as(who);
      expectApiError(
        await call('PATCH', `${a}/checklist/${item?.id}`, { isDone: true }),
        404,
        'NOT_FOUND',
      );
      expectApiError(await call('DELETE', `${a}/checklist/${item?.id}`), 404, 'NOT_FOUND');
    }
    // An Admin may delete anyone's comment, so this 404 can only come from the comment not being under task A.
    auth.as(g.admin);
    expectApiError(await call('DELETE', `${a}/comments/${comment?.id}`), 404, 'NOT_FOUND');
    auth.as(g.stranger);
    expectApiError(
      await call('PATCH', `/app/tasks/${g.ta.number}/comments/${comment?.id}`, { body: 'x' }),
      404,
      'NOT_FOUND',
    );
    const [kept] = await db
      .select()
      .from(taskChecklistItem)
      .where(eq(taskChecklistItem.id, item?.id ?? ''));
    expect(kept?.isDone).toBe(false);
    const [still] = await db
      .select()
      .from(taskComment)
      .where(eq(taskComment.id, comment?.id ?? ''));
    expect(still?.body).toBe('B');
  });

  it('a task cannot take a kind or an assignee from another project', async () => {
    const g = await graph();
    auth.as(g.lead); // manages both projects, so only the cross-project rule can refuse
    expectApiError(
      await call('PATCH', `/app/tasks/${g.ta.number}`, { kindId: g.b.kinds.issue }),
      422,
      'VALIDATION',
    );
    expectApiError(
      await call('PATCH', `/app/tasks/${g.ta.number}`, { assigneeId: g.stranger.id }),
      422,
      'VALIDATION',
    );
    expectApiError(
      await call('POST', '/app/tasks', { projectId: g.a.id, title: 'X', kindId: g.b.kinds.task }),
      422,
      'VALIDATION',
    );
    expect(await taskRow(g.ta.id)).toMatchObject({
      kindId: g.a.kinds.task,
      assigneeId: g.owner.id,
    });
  });
});

describe('write limiter per user', () => {
  it(`answers 429 RATE_LIMITED after ${WRITE_RATE_MAX} task writes, while another user on the same IP still writes`, async () => {
    const g = await graph();
    const other = await f.user();
    auth.as(g.owner);
    // Unknown numbers still pass the limiter (it runs before the handler) and write nothing.
    for (let i = 0; i < WRITE_RATE_MAX; i++) {
      expect((await call('POST', '/app/tasks/999999999/start')).status).toBe(404);
    }
    const limited = await call('PATCH', `/app/tasks/${g.ta.number}`, { title: 'Terlambat' });
    expectApiError(limited, 429, 'RATE_LIMITED');
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await taskRow(g.ta.id))?.title).toBe(g.ta.title);
    // Reads are not writes: the same user still opens the task.
    expect((await call('GET', `/app/tasks/${g.ta.number}`)).status).toBe(200);
    // All in-process calls share one client IP, so this proves the bucket is the user, not the IP.
    auth.as(other);
    expect((await call('POST', '/app/tasks/999999999/start')).status).toBe(404);
  });
});
