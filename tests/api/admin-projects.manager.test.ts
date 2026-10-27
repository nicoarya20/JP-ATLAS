/**
 * Ganti Pengelola from the Admin console (P11 AD-13): the gate, impersonation refusal,
 * `canActOnTarget` (an Admin may not displace an admin lead), a successful handover to an existing
 * manager, and the `PROJECT_MANAGER_SET` audit entry. The eligibility branch (A vs B) is not
 * exercised here — it awaits the user's decision — so every case uses a target that is valid under
 * both: already a manager of the project.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { auditLog, project } from '../../server/db/schema';
import { call, expectApiError, waitForAudit } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'admmgr' });
beforeEach(() => auth.as(null));
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const url = (id: string) => `/admin/projects/${id}/manager`;
const leadOf = async (id: string) =>
  (await db.select({ leadId: project.leadId }).from(project).where(eq(project.id, id)))[0]?.leadId;

describe('gate', () => {
  it('answers 401 to an anonymous caller', async () => {
    expectApiError(await call('PUT', url('p1'), { userId: 'x' }), 401, 'UNAUTHORIZED');
  });

  it('refuses a Member with 403 NOT_ADMIN', async () => {
    const u = await f.user({ role: 'member' });
    auth.as(u);
    expectApiError(await call('PUT', url('p1'), { userId: 'x' }), 403, 'NOT_ADMIN');
  });
});

describe('PUT /admin/projects/:id/manager', () => {
  it('hands the lead to another manager, updates the row and audits PROJECT_MANAGER_SET', async () => {
    const admin = await f.user({ role: 'admin' });
    const oldLead = await f.user({ role: 'project_manager' });
    const newManager = await f.user({ role: 'project_manager' });
    const p = await f.project({ lead: oldLead, members: [[newManager, 'manager']] });

    auth.as(admin);
    const res = await call('PUT', url(p.id), { userId: newManager.id });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(await leadOf(p.id)).toBe(newManager.id);

    const rows = await waitForAudit(
      eq(auditLog.action, 'project.manager.set'),
      eq(auditLog.targetId, p.id),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].actorId).toBe(admin.id);
    expect(rows[0].meta).toMatchObject({ from: oldLead.id, to: newManager.id });
  });

  it('refuses while impersonating, even for a super-admin (Q9)', async () => {
    const admin = await f.user({ role: 'super-admin' });
    const oldLead = await f.user({ role: 'project_manager' });
    const other = await f.user({ role: 'project_manager' });
    const p = await f.project({ lead: oldLead, members: [[other, 'manager']] });

    auth.as(admin, { impersonatedBy: 'someone-else' });
    expectApiError(await call('PUT', url(p.id), { userId: other.id }), 403, 'IMPERSONATING');
    expect(await leadOf(p.id)).toBe(oldLead.id); // unchanged
  });

  it('refuses an Admin displacing a lead who is themselves an admin (canActOnTarget)', async () => {
    const admin = await f.user({ role: 'admin' });
    const adminLead = await f.user({ role: 'admin' });
    const other = await f.user({ role: 'project_manager' });
    const p = await f.project({ lead: adminLead, members: [[other, 'manager']] });

    auth.as(admin);
    expectApiError(await call('PUT', url(p.id), { userId: other.id }), 403, 'TARGET_PROTECTED');
    expect(await leadOf(p.id)).toBe(adminLead.id); // unchanged
  });

  it('answers 404 when the project does not exist', async () => {
    const admin = await f.user({ role: 'admin' });
    const someone = await f.user({ role: 'project_manager' });
    auth.as(admin);
    expectApiError(await call('PUT', url('nope-nope'), { userId: someone.id }), 404, 'NOT_FOUND');
  });
});
