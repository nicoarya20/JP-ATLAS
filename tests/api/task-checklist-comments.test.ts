/** Task checklist, comments and timeline API (S2-06): personas, limits, plain text, keyset pages, no comment text in logs. */
import { afterAll, afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { task, taskActivity, taskChecklistItem, taskComment } from '../../server/db/schema';
import { logger } from '../../server/logger';
import {
  TASK_CHECKLIST_MAX_ITEMS,
  TASK_CHECKLIST_TEXT_MAX,
  TASK_COMMENT_MAX,
  TASK_FORMER_MEMBER_LABEL,
} from '../../server/task/task.limits';
import { call, expectApiError, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tccapi' });
beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
});
afterEach(() => cleaner.flushTest());
afterAll(async () => {
  resetApiLimiters();
  await cleaner.flushAll();
});

const OLD_ACTIVITY = new Date('2026-01-01T00:00:00.000Z'); // test-only

/** A project where `owner` created and works the task, plus every persona the rules tell apart. */
async function graph() {
  const lead = await f.user({ role: 'project_manager' });
  const owner = await f.user();
  const otherMember = await f.user();
  const viewer = await f.user();
  const outsider = await f.user();
  const pmOutsider = await f.user({ role: 'project_manager' });
  const admin = await f.user({ role: 'admin' });
  const proj = await f.project({
    lead,
    members: [
      [owner, 'member'],
      [otherMember, 'member'],
      [viewer, 'viewer'],
    ],
  });
  const t = await f.task({
    project: proj,
    creator: owner,
    assignee: owner,
    lastActivityAt: OLD_ACTIVITY,
  });
  const base = `/app/tasks/${t.number}`;
  return { lead, owner, otherMember, viewer, outsider, pmOutsider, admin, proj, t, base };
}

const lastActivity = async (id: string) =>
  (await db.select({ at: task.lastActivityAt }).from(task).where(eq(task.id, id)))[0]?.at;

describe('sign-in gate', () => {
  it.each([
    ['POST', '/app/tasks/1/checklist', { text: 'x' }],
    ['PATCH', '/app/tasks/1/checklist/i1', { isDone: true }],
    ['DELETE', '/app/tasks/1/checklist/i1', undefined],
    ['POST', '/app/tasks/1/comments', { body: 'x' }],
    ['PATCH', '/app/tasks/1/comments/c1', { body: 'x' }],
    ['DELETE', '/app/tasks/1/comments/c1', undefined],
    ['GET', '/app/tasks/1/timeline', undefined],
  ] as const)('%s %s without a session is 401', async (method, path, body) => {
    expectApiError(await call(method, path, body), 401, 'UNAUTHORIZED');
  });
});

describe('checklist', () => {
  it('ticking two of three steps shows 2/3 on the task and bumps its activity', async () => {
    const g = await graph();
    auth.as(g.owner);
    const ids: string[] = [];
    for (const text of ['Siapkan bahan', 'Kirim surat', 'Arsipkan']) {
      const res = await call('POST', `${g.base}/checklist`, { text });
      expect(res.status).toBe(201);
      ids.push(res.body.item.id);
    }
    for (const id of ids.slice(0, 2)) {
      const res = await call('PATCH', `${g.base}/checklist/${id}`, { isDone: true });
      expect(res.status).toBe(200);
      expect(res.body.item.isDone).toBe(true);
    }
    const detail = await call('GET', g.base);
    expect(detail.body.checklist).toMatchObject({ done: 2, total: 3 });
    expect((await lastActivity(g.t.id))?.getTime()).toBeGreaterThan(OLD_ACTIVITY.getTime());
    const [row] = await db
      .select()
      .from(taskChecklistItem)
      .where(eq(taskChecklistItem.id, ids[0] ?? ''));
    expect(row).toMatchObject({ doneBy: g.owner.id });
    expect(row?.doneAt).toBeInstanceOf(Date);
  });

  it('another member cannot tick or add on someone else’s task; a viewer neither; a stranger sees 404', async () => {
    const g = await graph();
    auth.as(g.owner);
    const item = (await call('POST', `${g.base}/checklist`, { text: 'Langkah' })).body.item;
    auth.as(g.otherMember);
    expectApiError(
      await call('PATCH', `${g.base}/checklist/${item.id}`, { isDone: true }),
      403,
      'NOT_OWNER',
    );
    expectApiError(await call('POST', `${g.base}/checklist`, { text: 'Lain' }), 403, 'NOT_OWNER');
    auth.as(g.viewer);
    expectApiError(
      await call('PATCH', `${g.base}/checklist/${item.id}`, { isDone: true }),
      403,
      'NOT_MEMBER',
    );
    auth.as(g.outsider);
    expectApiError(await call('DELETE', `${g.base}/checklist/${item.id}`), 404, 'NOT_FOUND');
    auth.as(g.lead);
    expect((await call('PATCH', `${g.base}/checklist/${item.id}`, { isDone: true })).status).toBe(
      200,
    );
  });

  it('rejects blank, too long and one-too-many steps with 422', async () => {
    const g = await graph();
    auth.as(g.owner);
    expectApiError(await call('POST', `${g.base}/checklist`, { text: '   ' }), 422, 'VALIDATION');
    const long = 'a'.repeat(TASK_CHECKLIST_TEXT_MAX + 1);
    expectApiError(await call('POST', `${g.base}/checklist`, { text: long }), 422, 'VALIDATION');
    await db.insert(taskChecklistItem).values(
      Array.from({ length: TASK_CHECKLIST_MAX_ITEMS }, (_, position) => ({
        taskId: g.t.id,
        text: `Langkah ${position}`,
        position,
      })),
    );
    expectApiError(
      await call('POST', `${g.base}/checklist`, { text: 'Satu lagi' }),
      422,
      'VALIDATION',
    );
  });

  it('renames, moves and removes a step; an empty patch is 422; a foreign item id is 404', async () => {
    const g = await graph();
    auth.as(g.owner);
    const add = async (text: string) =>
      (await call('POST', `${g.base}/checklist`, { text })).body.item.id;
    const [a, b, c] = [await add('A'), await add('B'), await add('C')];
    const moved = await call('PATCH', `${g.base}/checklist/${c}`, { position: 0, text: ' C2 ' });
    expect(moved.body.checklist.items.map((i: { text: string }) => i.text)).toEqual([
      'C2',
      'A',
      'B',
    ]);
    expect(moved.body.item).toMatchObject({ id: c, position: 0 });
    expectApiError(await call('PATCH', `${g.base}/checklist/${a}`, {}), 422, 'VALIDATION');
    const gone = await call('DELETE', `${g.base}/checklist/${b}`);
    expect(gone.status).toBe(200);
    expect(gone.body.checklist.total).toBe(2);
    const other = await f.task({ project: g.proj, creator: g.owner, assignee: g.owner });
    expectApiError(
      await call('DELETE', `/app/tasks/${other.number}/checklist/${a}`),
      404,
      'NOT_FOUND',
    );
  });
});

describe('comments', () => {
  it('a viewer may comment, a non-member PM gets 403, a stranger 404', async () => {
    const g = await graph();
    auth.as(g.viewer);
    const res = await call('POST', `${g.base}/comments`, { body: 'Saya pantau, ya.' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ body: 'Saya pantau, ya.', author: { id: g.viewer.id } });
    auth.as(g.pmOutsider);
    expectApiError(await call('POST', `${g.base}/comments`, { body: 'Halo' }), 403, 'NOT_MEMBER');
    auth.as(g.outsider);
    expectApiError(await call('POST', `${g.base}/comments`, { body: 'Halo' }), 404, 'NOT_FOUND');
  });

  it('stores markup exactly as typed and bumps the task activity', async () => {
    const g = await graph();
    auth.as(g.owner);
    const payload = '<img src=x onerror=alert(1)> **tebal**';
    const res = await call('POST', `${g.base}/comments`, { body: payload });
    expect(res.body.body).toBe(payload);
    const [row] = await db.select().from(taskComment).where(eq(taskComment.id, res.body.id));
    expect(row?.body).toBe(payload);
    expect((await lastActivity(g.t.id))?.getTime()).toBeGreaterThan(OLD_ACTIVITY.getTime());
  });

  it('answers 422 for a blank or too long comment', async () => {
    const g = await graph();
    auth.as(g.owner);
    expectApiError(await call('POST', `${g.base}/comments`, { body: ' \n ' }), 422, 'VALIDATION');
    const long = 'k'.repeat(TASK_COMMENT_MAX + 1);
    expectApiError(await call('POST', `${g.base}/comments`, { body: long }), 422, 'VALIDATION');
    expect(
      (await call('POST', `${g.base}/comments`, { body: 'k'.repeat(TASK_COMMENT_MAX) })).status,
    ).toBe(201);
  });

  it('only the author edits; another member gets 403 even as a manager', async () => {
    const g = await graph();
    auth.as(g.owner);
    const c = (await call('POST', `${g.base}/comments`, { body: 'Draf' })).body;
    for (const who of [g.otherMember, g.lead]) {
      auth.as(who);
      expectApiError(
        await call('PATCH', `${g.base}/comments/${c.id}`, { body: 'Diubah' }),
        403,
        'NOT_OWNER',
      );
    }
    auth.as(g.owner);
    const edited = await call('PATCH', `${g.base}/comments/${c.id}`, { body: 'Final' });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ id: c.id, body: 'Final' });
    expect(typeof edited.body.editedAt).toBe('string');
  });

  it('the author, a project manager and an Admin may remove; another member may not', async () => {
    const g = await graph();
    for (const remover of [g.owner, g.lead, g.admin]) {
      auth.as(g.owner);
      const c = (await call('POST', `${g.base}/comments`, { body: 'Hapus saya' })).body;
      auth.as(g.otherMember);
      expectApiError(await call('DELETE', `${g.base}/comments/${c.id}`), 403, 'NOT_OWNER');
      auth.as(remover);
      const res = await call('DELETE', `${g.base}/comments/${c.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: c.id });
      expect(await db.select().from(taskComment).where(eq(taskComment.id, c.id))).toEqual([]);
      const marks = await db.select().from(taskActivity).where(eq(taskActivity.taskId, g.t.id));
      expect(marks.some((m) => m.action === 'comment.delete' && m.actorId === remover.id)).toBe(
        true,
      );
      expect(JSON.stringify(marks)).not.toContain('Hapus saya');
    }
  });

  it('never writes the comment text to the logger', async () => {
    const g = await graph();
    const spies = (['info', 'warn', 'error', 'debug'] as const).map((level) =>
      spyOn(logger, level),
    );
    try {
      auth.as(g.owner);
      const secret = 'RAHASIA-komentar-7731'; // test-only: marker proving comment bodies never reach the log
      const c = (await call('POST', `${g.base}/comments`, { body: secret })).body;
      await call('PATCH', `${g.base}/comments/${c.id}`, { body: `${secret}-2` });
      await call('DELETE', `${g.base}/comments/${c.id}`);
      const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
      expect(logged).toContain(c.id);
      expect(logged).not.toContain(secret);
    } finally {
      for (const s of spies) s.mockRestore();
    }
  });
});

describe('timeline', () => {
  it('pages comments and activity as one stream with no duplicates or gaps', async () => {
    const g = await graph();
    auth.as(g.owner);
    for (const body of ['satu', 'dua', 'tiga']) await call('POST', `${g.base}/comments`, { body });
    // test-only: identical timestamps force the id tie-break of the keyset.
    const tie = new Date();
    await db.insert(taskActivity).values(
      ['a', 'b', 'c'].map((n) => ({
        taskId: g.t.id,
        actorId: g.owner.id,
        action: `test.${n}`,
        createdAt: tie,
      })),
    );
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const qs: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
      const res = await call('GET', `${g.base}/timeline?limit=2${qs}`);
      expect(res.status).toBe(200);
      seen.push(...res.body.items.map((i: { id: string }) => i.id));
      cursor = res.body.nextCursor;
      pages += 1;
    } while (cursor && pages < 10);
    expect(pages).toBe(3);
    expect(seen).toHaveLength(6);
    expect(new Set(seen).size).toBe(6);
  });

  it('shows a removed author as "Mantan anggota" and the viewer may read it', async () => {
    const g = await graph();
    auth.as(g.owner);
    const c = (await call('POST', `${g.base}/comments`, { body: 'Catatan lama' })).body;
    await db.update(taskComment).set({ authorId: null }).where(eq(taskComment.id, c.id));
    auth.as(g.viewer);
    const res = await call('GET', `${g.base}/timeline`);
    const entry = res.body.items.find((i: { id: string }) => i.id === c.id);
    expect(entry).toMatchObject({
      kind: 'comment',
      author: { id: null, name: TASK_FORMER_MEMBER_LABEL },
    });
  });

  it('answers 400 BAD_CURSOR for a forged cursor and 404 to a stranger', async () => {
    const g = await graph();
    auth.as(g.owner);
    const forged = Buffer.from(JSON.stringify(['yesterday', 'x'])).toString('base64url');
    expectApiError(await call('GET', `${g.base}/timeline?cursor=${forged}`), 400, 'BAD_CURSOR');
    auth.as(g.outsider);
    expectApiError(await call('GET', `${g.base}/timeline`), 404, 'NOT_FOUND');
  });
});
