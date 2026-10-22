/**
 * The workspace switch "Cuti perlu persetujuan" over HTTP: anyone signed in reads it, only Admin and
 * Super-admin change it (403 `NOT_ADMIN` for the rest), every change is audited, and it really decides
 * whether the next request waits.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { AUDIT_ACTIONS } from '../../server/audit';
import { auditLog } from '../../server/db/schema';
import { getLeaveSettings, upsertLeaveSettings } from '../../server/settings-leave';
import { type LeaveWorld, leaveWorld } from '../leave/leave.world';
import { call, expectApiError, resetApiLimiters, waitForAudit } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW, freezeAt } from '../support/clock';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'leaveset' });
let w: LeaveWorld;

beforeEach(async () => {
  auth.as(null);
  resetApiLimiters();
  freezeAt(ATLAS_NOW);
  await upsertLeaveSettings({ requiresApproval: true });
  w = await leaveWorld(f);
});
afterEach(async () => {
  await upsertLeaveSettings({ requiresApproval: true });
  await cleaner.flushTest();
});
afterAll(() => cleaner.flushAll());

const PATH = '/app/leave/settings';

describe('GET /leave/settings', () => {
  it('tells every signed-in role that approval is required by default', async () => {
    for (const who of [w.dodi, w.nico, w.ayu]) {
      auth.as(who);
      const res = await call('GET', PATH);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ requiresApproval: true });
    }
  });

  it('also answers with a trailing slash', async () => {
    auth.as(w.dodi);
    expect((await call('GET', `${PATH}/`)).body).toEqual({ requiresApproval: true });
  });
});

describe('PUT /leave/settings', () => {
  it('lets an Admin and a Super-admin switch it off and on, and the next read agrees', async () => {
    const root = await f.user({ role: 'super-admin' });
    for (const who of [w.ayu, root]) {
      auth.as(who);
      const off = await call('PUT', PATH, { requiresApproval: false });
      expect(off.status).toBe(200);
      expect(off.body).toEqual({ requiresApproval: false });
      expect((await call('GET', PATH)).body).toEqual({ requiresApproval: false });
      expect((await getLeaveSettings()).requiresApproval).toBe(false);
      const on = await call('PUT', PATH, { requiresApproval: true });
      expect(on.body).toEqual({ requiresApproval: true });
    }
  });

  it('refuses a Member and a Project Manager with 403 NOT_ADMIN and changes nothing', async () => {
    for (const who of [w.dodi, w.nico, w.eka]) {
      auth.as(who);
      expectApiError(await call('PUT', PATH, { requiresApproval: false }), 403, 'NOT_ADMIN');
    }
    expect((await getLeaveSettings()).requiresApproval).toBe(true);
  });

  it('refuses an Admin who is acting as someone else', async () => {
    auth.as(w.ayu, { impersonatedBy: w.ayu.id });
    expectApiError(await call('PUT', PATH, { requiresApproval: false }), 403, 'IMPERSONATING');
    expect((await getLeaveSettings()).requiresApproval).toBe(true);
  });

  it('refuses a body that is not a boolean switch', async () => {
    auth.as(w.ayu);
    for (const body of [{}, { requiresApproval: 'no' }, { requiresApproval: null }]) {
      expectApiError(await call('PUT', PATH, body), 422, 'VALIDATION');
    }
    expect((await getLeaveSettings()).requiresApproval).toBe(true);
  });

  it('writes an audit line for the change, without the person’s address', async () => {
    auth.as(w.ayu);
    await call('PUT', PATH, { requiresApproval: false });
    const rows = await waitForAudit(
      eq(auditLog.actorId, w.ayu.id),
      eq(auditLog.action, AUDIT_ACTIONS.SETTINGS_LEAVE_UPDATE),
    );
    for (const r of rows) cleaner.track('audit', r.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      targetType: 'settings',
      meta: { requiresApproval: false },
    });
    expect(rows[0].actorEmail).not.toBe(w.ayu.email);
  });

  it('decides whether the next request waits: on = pending, off = approved on submit', async () => {
    const body = { startDate: '2026-10-14', endDate: '2026-10-15' };
    auth.as(w.dodi);
    expect((await call('POST', '/app/leave', body)).body.request.status).toBe('pending');
    auth.as(w.ayu);
    await call('PUT', PATH, { requiresApproval: false });
    auth.as(w.oki);
    const sent = await call('POST', '/app/leave', body);
    expect(sent.body.request).toMatchObject({ status: 'approved', decidedBy: null });
    auth.as(w.oki);
    expect((await call('GET', '/app/leave/me')).body).toMatchObject({
      state: 'approved',
      requiresApproval: false,
    });
  });
});
