/** Task Trash API (S6 D1): DELETE /app/tasks/:ref and POST /app/trash/task/:id/restore, who may, states, audit and keys. */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { API_KEY_PREFIX } from '../../server/auth';
import { db } from '../../server/db';
import { auditLog, task } from '../../server/db/schema';
import { rateLimiter } from '../../server/rate-limit';
import { call, expectApiError, waitForAudit } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW, freezeAt } from '../support/clock';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tasktrash' });
const auditedIds: string[] = [];
beforeEach(() => {
  auth.as(null);
  rateLimiter.reset();
});
afterEach(async () => {
  for (const id of auditedIds.splice(0)) await db.delete(auditLog).where(eq(auditLog.targetId, id));
  await cleaner.flushTest();
});
afterAll(() => cleaner.flushAll());

const DAY_MS = 86_400_000;
const del = (ref: string | number) => call('DELETE', `/app/tasks/${ref}`);
const restore = (id: string) => call('POST', `/app/trash/task/${id}/restore`);
const getTask = (ref: string | number) => call('GET', `/app/tasks/${ref}`);
const stateOf = async (id: string) => {
  const [row] = await db
    .select({ deletedAt: task.deletedAt, deletedBy: task.deletedBy, number: task.number })
    .from(task)
    .where(eq(task.id, id));
  if (!row) throw new Error(`task ${id} is gone`);
  return row;
};

/** A PM lead, a Member-manager, the task's creator, its assignee, a plain member, a viewer and an outsider. */
async function team() {
  const lead = await f.user({ role: 'project_manager' });
  const memberManager = await f.user();
  const creator = await f.user();
  const assignee = await f.user();
  const viewer = await f.user();
  const outsider = await f.user();
  const prj = await f.project({
    lead,
    members: [
      [memberManager, 'manager'],
      [creator, 'member'],
      [assignee, 'member'],
      [viewer, 'viewer'],
    ],
  });
  const t = await f.task({ project: prj, creator, assignee, title: 'Rapikan gudang' }); // test-only
  return { lead, memberManager, creator, assignee, viewer, outsider, prj, t };
}

describe('DELETE /app/tasks/:ref', () => {
  it('sends the task to the Trash for its creator, answers the label and hides the task at once', async () => {
    const s = await team();
    auth.as(s.creator);
    const res = await del(s.t.number);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      trash: {
        kind: 'task',
        id: s.t.id,
        number: s.t.number,
        label: `#${s.t.number} Rapikan gudang`,
      },
    });
    const row = await stateOf(s.t.id);
    expect(row.deletedAt).not.toBeNull();
    expect(row.deletedBy).toBe(s.creator.id);
    expectApiError(await getTask(s.t.number), 404, 'NOT_FOUND');
    expectApiError(await getTask(s.t.id), 404, 'NOT_FOUND');
  });

  it.each([
    ['PM lead', 'lead'],
    ['Member-manager', 'memberManager'],
  ] as const)('lets the %s delete a task they did not create', async (_label, who) => {
    const s = await team();
    auth.as(s[who]);
    expect((await del(s.t.id)).status).toBe(200);
  });

  it('lets an Admin delete without being a member of the project', async () => {
    const s = await team();
    auth.as(await f.user({ role: 'admin' }));
    expect((await del(s.t.number)).status).toBe(200);
  });

  it('refuses the assignee who did not create it and the observer with 403, leaving the task alone', async () => {
    const s = await team();
    auth.as(s.assignee);
    expectApiError(await del(s.t.number), 403, 'NOT_OWNER');
    auth.as(s.viewer);
    expectApiError(await del(s.t.number), 403, 'NOT_MEMBER');
    expect((await stateOf(s.t.id)).deletedAt).toBeNull();
  });

  it('answers a non-member the same 404 as a task that does not exist', async () => {
    const s = await team();
    auth.as(s.outsider);
    const hidden = await del(s.t.number);
    const missing = await del(999_999_999);
    expectApiError(hidden, 404, 'NOT_FOUND');
    expect(hidden.body.error).toBe(missing.body.error);
    expect((await stateOf(s.t.id)).deletedAt).toBeNull();
  });

  it('answers 404 when the task is already in the Trash, so a second delete changes nothing', async () => {
    const s = await team();
    auth.as(s.lead);
    expect((await del(s.t.number)).status).toBe(200);
    const first = await stateOf(s.t.id);
    expectApiError(await del(s.t.number), 404, 'NOT_FOUND');
    expect((await stateOf(s.t.id)).deletedAt).toEqual(first.deletedAt);
  });

  it('lets exactly one of two simultaneous deletes win', async () => {
    const s = await team();
    auth.as(s.lead);
    const [a, b] = await Promise.all([del(s.t.number), del(s.t.number)]);
    expect([a.status, b.status].sort()).toEqual([200, 404]);
  });

  it('refuses a task whose project is already in the Trash with 404', async () => {
    const s = await team();
    auth.as(s.lead);
    expect((await call('DELETE', `/app/projects/${s.prj.id}`)).status).toBe(200);
    auditedIds.push(s.prj.id);
    expectApiError(await del(s.t.number), 404, 'NOT_FOUND');
  });

  it('is refused while impersonating', async () => {
    const s = await team();
    auth.as(s.lead, { impersonatedBy: 'someone-else' });
    expectApiError(await del(s.t.number), 403, 'IMPERSONATING');
    expect((await stateOf(s.t.id)).deletedAt).toBeNull();
  });

  it('writes an audit entry with a masked email, the number and no title', async () => {
    const s = await team();
    auth.as({ ...s.creator, email: 'nama.panjang@contoh.test' }); // test-only
    auditedIds.push(s.t.id);
    await del(s.t.number);
    const rows = await waitForAudit(
      eq(auditLog.targetId, s.t.id),
      eq(auditLog.action, 'task.trash'),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.targetType).toBe('task');
    expect(rows[0]?.actorEmail).not.toContain('nama.panjang');
    expect(rows[0]?.actorEmail).toContain('@');
    expect(JSON.stringify(rows[0])).not.toContain('Rapikan gudang');
    expect(rows[0]?.summary).toContain(`#${s.t.number}`);
  });
});

describe('POST /app/trash/task/:id/restore', () => {
  it('brings the task back with the same number and id, as the deleter, a manager or an Admin', async () => {
    const s = await team();
    for (const who of [s.creator, s.lead, await f.user({ role: 'admin' })]) {
      auth.as(s.creator);
      await del(s.t.number);
      auth.as(who);
      const res = await restore(s.t.id);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: s.t.id, number: s.t.number });
      const back = await getTask(s.t.number);
      expect(back.status).toBe(200);
      expect(back.body).toMatchObject({ id: s.t.id, number: s.t.number, title: 'Rapikan gudang' });
    }
  });

  it('refuses the assignee and the observer who did not delete it, and the outsider with 404', async () => {
    const s = await team();
    auth.as(s.creator);
    await del(s.t.number);
    auth.as(s.assignee);
    expectApiError(await restore(s.t.id), 403, 'NOT_OWNER');
    auth.as(s.viewer);
    expectApiError(await restore(s.t.id), 403, 'NOT_MEMBER');
    auth.as(s.outsider);
    expectApiError(await restore(s.t.id), 404, 'NOT_FOUND');
    expect((await stateOf(s.t.id)).deletedAt).not.toBeNull();
  });

  it('answers 409 WRONG_STATE for a live task and 404 for an unknown id', async () => {
    const s = await team();
    auth.as(s.lead);
    expectApiError(await restore(s.t.id), 409, 'WRONG_STATE');
    expectApiError(await restore('no-such-task'), 404, 'NOT_FOUND');
  });

  it('refuses while the project is in the Trash and works after the project is restored', async () => {
    const s = await team();
    auditedIds.push(s.prj.id);
    auth.as(s.lead);
    await del(s.t.number);
    await call('DELETE', `/app/projects/${s.prj.id}`);
    const res = await restore(s.t.id);
    expectApiError(res, 409, 'PROJECT_IN_TRASH');
    expect(res.body.error).toContain('Pulihkan proyeknya dulu');
    // A task trashed before its project is not brought back by the project restore ...
    await call('POST', `/app/trash/project/${s.prj.id}/restore`);
    expect((await stateOf(s.t.id)).deletedAt).not.toBeNull();
    // ... but can be restored on its own once the project is live again.
    expect((await restore(s.t.id)).status).toBe(200);
  });

  it('answers 410 EXPIRED on day 31', async () => {
    const s = await team();
    auth.as(s.lead);
    freezeAt(ATLAS_NOW);
    await del(s.t.number);
    freezeAt(new Date(ATLAS_NOW.getTime() + 30 * DAY_MS));
    expectApiError(await restore(s.t.id), 410, 'EXPIRED');
  });

  it('is refused while impersonating and writes an audit entry otherwise', async () => {
    const s = await team();
    auditedIds.push(s.t.id);
    auth.as(s.lead);
    await del(s.t.number);
    auth.as(s.lead, { impersonatedBy: 'someone-else' });
    expectApiError(await restore(s.t.id), 403, 'IMPERSONATING');
    auth.as(s.lead);
    await restore(s.t.id);
    const rows = await waitForAudit(
      eq(auditLog.targetId, s.t.id),
      eq(auditLog.action, 'task.restore'),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.targetType).toBe('task');
  });
});

describe('API keys', () => {
  const key = { 'x-api-key': `${API_KEY_PREFIX}not-a-real-key` }; // test-only

  it.each([
    ['DELETE', '/app/tasks/12'],
    ['DELETE', '/app/tasks/some-task-id'],
    ['POST', '/app/trash/task/some-task-id/restore'],
  ])('refuses a key on %s %s outright (session only)', async (method, path) => {
    const res = await call(method, path, undefined, key);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Endpoint ini tidak bisa diakses dengan API key');
  });

  it('answers 401 without a session', async () => {
    expect((await call('DELETE', '/app/tasks/12')).status).toBe(401);
    expect((await call('POST', '/app/trash/task/x/restore')).status).toBe(401);
  });
});
