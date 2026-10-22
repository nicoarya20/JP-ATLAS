/** Project Trash page API (S1-18): GET /app/trash, who sees what, restore rights and paging, through the real router. */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { API_KEY_PREFIX } from '../../server/auth';
import { db } from '../../server/db';
import { auditLog, task } from '../../server/db/schema';
import { rateLimiter } from '../../server/rate-limit';
import { call, expectApiError } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW, freezeAt } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'trashpage' });
const auditedIds: string[] = [];
// One in-process client shares the `unknown` limiter bucket with every earlier API test file in the run.
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
const del = (id: string) => call('DELETE', `/app/projects/${id}`);
const restore = (id: string) => call('POST', `/app/trash/project/${id}/restore`);
type Item = { id: string; can: { restore?: unknown }; deletedBy: { id: string } | null };
const trashIds = async (u: TestUser) => {
  auth.as(u);
  const res = await call('GET', '/app/trash?limit=100');
  expect(res.status).toBe(200);
  return (res.body.items as Item[]).map((i) => i.id);
};

/** PM Lead, a Member-manager, a member, a viewer and an outsider; two live tasks. */
async function team() {
  const lead = await f.user({ role: 'project_manager' });
  const memberManager = await f.user();
  const member = await f.user();
  const viewer = await f.user();
  const outsider = await f.user();
  const prj = await f.project({
    lead,
    members: [
      [memberManager, 'manager'],
      [member, 'member'],
      [viewer, 'viewer'],
    ],
  });
  const tasks = [await f.task({ project: prj }), await f.task({ project: prj, status: 'done' })];
  auditedIds.push(prj.id);
  return { lead, memberManager, member, viewer, outsider, prj, tasks };
}

describe('sign-in gate', () => {
  it('GET /app/trash without a session is 401', async () => {
    expectApiError(await call('GET', '/app/trash'), 401, 'UNAUTHORIZED');
  });
});

describe('GET /app/trash', () => {
  it('shows a PM-manager delete to that PM, the Member-manager and Admin, not to other members', async () => {
    const t = await team();
    const admin = await f.user({ role: 'admin' });
    auth.as(t.lead);
    expect((await del(t.prj.id)).status).toBe(200);
    for (const u of [t.lead, t.memberManager, admin]) expect(await trashIds(u)).toContain(t.prj.id);
    for (const u of [t.member, t.viewer, t.outsider]) {
      expect(await trashIds(u)).not.toContain(t.prj.id);
    }
  });

  it('sends the deleter, the restore limit and can.restore from the server', async () => {
    const t = await team();
    auth.as(t.lead);
    freezeAt(ATLAS_NOW);
    await del(t.prj.id);
    auth.as(t.memberManager);
    const res = await call('GET', '/app/trash');
    const item = (res.body.items as Item[]).find((i) => i.id === t.prj.id);
    expect(item).toMatchObject({
      kind: 'project',
      deletedBy: { id: t.lead.id, name: t.lead.name },
      deletedAt: ATLAS_NOW.toISOString(),
      restorableUntil: '2026-11-05',
      can: { restore: true },
    });
    expect(JSON.stringify(res.body)).not.toContain('example.test'); // no email (Q8)
  });

  it('pages with page/limit and a total', async () => {
    const lead = await f.user({ role: 'project_manager' });
    for (let i = 0; i < 3; i++) {
      const prj = await f.project({ lead });
      auditedIds.push(prj.id);
      auth.as(lead);
      await del(prj.id);
    }
    auth.as(lead);
    const first = await call('GET', '/app/trash?limit=2&page=1');
    expect(first.body).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect(first.body.items).toHaveLength(2);
    const second = await call('GET', '/app/trash?limit=2&page=2');
    expect(second.body.items).toHaveLength(1);
    expect(second.body.total).toBe(3);
  });

  it('rejects a limit above the maximum with 422', async () => {
    auth.as(await f.user());
    expect((await call('GET', '/app/trash?limit=100000')).status).toBe(422);
  });
});

describe('restore from the Trash', () => {
  it('refuses a Member-manager delete with 403 ROLE_CANNOT_TRASH yet lets them restore', async () => {
    const t = await team();
    auth.as(t.memberManager);
    expectApiError(await del(t.prj.id), 403, 'ROLE_CANNOT_TRASH');
    auth.as(t.lead);
    await del(t.prj.id);
    auth.as(t.memberManager);
    const res = await restore(t.prj.id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: t.prj.id, tasks: 2 });
    const rows = await db
      .select({ deletedAt: task.deletedAt })
      .from(task)
      .where(
        inArray(
          task.id,
          t.tasks.map((x) => x.id),
        ),
      );
    expect(rows.map((r) => r.deletedAt)).toEqual([null, null]);
    expect(await trashIds(t.memberManager)).not.toContain(t.prj.id);
  });

  it('lets an Admin restore and refuses a member and a viewer with 403', async () => {
    const t = await team();
    auth.as(t.lead);
    await del(t.prj.id);
    for (const u of [t.member, t.viewer]) {
      auth.as(u);
      expectApiError(await restore(t.prj.id), 403, 'NOT_MANAGER');
    }
    auth.as(await f.user({ role: 'admin' }));
    expect((await restore(t.prj.id)).status).toBe(200);
  });

  it('answers 410 EXPIRED on day 31 and shows the button disabled', async () => {
    const t = await team();
    auth.as(t.lead);
    freezeAt(ATLAS_NOW);
    await del(t.prj.id);
    freezeAt(new Date(ATLAS_NOW.getTime() + 30 * DAY_MS));
    expectApiError(await restore(t.prj.id), 410, 'EXPIRED');
    const res = await call('GET', '/app/trash');
    const item = (res.body.items as Item[]).find((i) => i.id === t.prj.id);
    expect(item?.can.restore).toBe('EXPIRED');
  });
});

describe('API keys', () => {
  const key = { 'x-api-key': `${API_KEY_PREFIX}not-a-real-key` }; // test-only

  it.each([
    ['DELETE', '/app/projects/p1'],
    ['POST', '/app/trash/project/p1/restore'],
  ])('refuses a key on %s %s outright (session only)', async (method, path) => {
    const res = await call(method, path, undefined, key);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Endpoint ini tidak bisa diakses dengan API key');
  });
});
