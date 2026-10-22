/** Project Trash API (S1-05): DELETE /app/projects/:id and POST /app/trash/project/:id/restore through the real router. */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { AUDIT_ACTIONS } from '../../server/audit';
import { API_KEY_PREFIX } from '../../server/auth';
import { db } from '../../server/db';
import { auditLog, project } from '../../server/db/schema';
import { rateLimiter } from '../../server/rate-limit';
import { call, expectApiError, waitForAudit } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW, freezeAt } from '../support/clock';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'trashapi' });
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

/** PM Lead, a Member-manager and a plain member on one project with two live tasks. */
async function team() {
  const lead = await f.user({ role: 'project_manager' });
  const memberManager = await f.user();
  const member = await f.user();
  const prj = await f.project({
    lead,
    members: [
      [memberManager, 'manager'],
      [member, 'member'],
    ],
  });
  await f.task({ project: prj });
  await f.task({ project: prj, status: 'in_progress' });
  auditedIds.push(prj.id);
  return { lead, memberManager, member, prj };
}

describe('sign-in gate', () => {
  it.each([
    ['DELETE', '/app/projects/p1'],
    ['POST', '/app/trash/project/p1/restore'],
  ])('%s %s without a session is 401', async (method, path) => {
    expectApiError(await call(method, path), 401, 'UNAUTHORIZED');
  });
});

describe('DELETE /app/projects/:id', () => {
  it('moves the project to the Trash for its PM Lead, hides it and writes an audit entry', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    const res = await del(prj.id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: prj.id, tasks: 2 });
    expectApiError(await call('GET', `/app/projects/${prj.id}`), 404, 'NOT_FOUND');
    const list = await call('GET', '/app/projects?scope=all');
    expect(list.body.items.map((i: { id: string }) => i.id)).not.toContain(prj.id);
    const [entry] = await waitForAudit(
      eq(auditLog.targetId, prj.id),
      eq(auditLog.action, AUDIT_ACTIONS.PROJECT_TRASH),
    );
    expect(entry).toMatchObject({ actorId: lead.id, targetType: 'project' });
  });

  it('refuses a Member-manager with 403 ROLE_CANNOT_TRASH', async () => {
    const { memberManager, prj } = await team();
    auth.as(memberManager);
    expectApiError(await del(prj.id), 403, 'ROLE_CANNOT_TRASH');
    expect(
      (await db.select().from(project).where(eq(project.id, prj.id)))[0]?.deletedAt,
    ).toBeNull();
  });

  it('refuses a plain member with 403 and a non-member with the same 404 as a random id', async () => {
    const { member, prj } = await team();
    auth.as(member);
    expectApiError(await del(prj.id), 403, 'NOT_MANAGER');
    auth.as(await f.user());
    const hidden = await del(prj.id);
    const missing = await del('does-not-exist');
    expectApiError(hidden, 404, 'NOT_FOUND');
    expect(hidden.body.error).toBe(missing.body.error);
  });

  it('refuses while impersonating with 403 IMPERSONATING', async () => {
    const { lead, prj } = await team();
    auth.as(lead, { impersonatedBy: 'someone-else' }); // test-only id
    expectApiError(await del(prj.id), 403, 'IMPERSONATING');
  });
});

describe('POST /app/trash/project/:id/restore', () => {
  it('lets a Member-manager restore it with its tasks and writes an audit entry', async () => {
    const { lead, memberManager, prj } = await team();
    auth.as(lead);
    await del(prj.id);
    auth.as(memberManager);
    const res = await restore(prj.id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: prj.id, tasks: 2 });
    expect((await call('GET', `/app/projects/${prj.id}`)).status).toBe(200);
    const [entry] = await waitForAudit(
      eq(auditLog.targetId, prj.id),
      eq(auditLog.action, AUDIT_ACTIONS.PROJECT_RESTORE),
    );
    expect(entry).toMatchObject({ actorId: memberManager.id, targetType: 'project' });
  });

  it('refuses a plain member with 403 and a live project with 409 WRONG_STATE', async () => {
    const { lead, member, prj } = await team();
    auth.as(lead);
    expectApiError(await restore(prj.id), 409, 'WRONG_STATE');
    await del(prj.id);
    auth.as(member);
    expectApiError(await restore(prj.id), 403, 'NOT_MANAGER');
  });

  it('answers 410 EXPIRED on day 31', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    freezeAt(ATLAS_NOW);
    await del(prj.id);
    freezeAt(new Date(ATLAS_NOW.getTime() + 30 * DAY_MS));
    expectApiError(await restore(prj.id), 410, 'EXPIRED');
  });
});

describe('API keys', () => {
  // Denied routes answer before the key is verified, so any well-formed key shows the decision.
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
