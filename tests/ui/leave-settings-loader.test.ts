/**
 * The /app/settings loader hands the leave blocks their state and every right (Member: Ketersediaan
 * only; Project Manager: plus Persetujuan cuti; Admin: plus the team switch). Runs against the test database.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { loader } from '../../app/routes/app/settings';
import { upsertLeaveSettings } from '../../server/settings-leave';
import { requestClock } from '../../server/task/task.clock';
import { type LeaveWorld, leaveWorld, seedLeave } from '../leave/leave.world';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'setleave' });
let w: LeaveWorld;

beforeEach(async () => {
  w = await leaveWorld(f);
});
afterEach(async () => {
  await upsertLeaveSettings({ requiresApproval: true });
  await cleaner.flushTest();
});
afterAll(() => cleaner.flushAll());

const SESSION = 'better-auth.session_token=test'; // test-only

async function leaveOf(who: Parameters<typeof auth.as>[0], opts?: { impersonatedBy?: string }) {
  auth.as(who, opts);
  const request = new Request('http://localhost/app/settings', { headers: { cookie: SESSION } });
  return (await loader({ request } as Parameters<typeof loader>[0])).leave;
}

/** `today` of the loader (team zone) shifted by `n` days, as `YYYY-MM-DD`. */
function day(n: number): string {
  const { today } = requestClock();
  const base = Date.parse(`${today}T00:00:00Z`);
  return new Date(base + n * 86_400_000).toISOString().slice(0, 10);
}

describe("settings loader: the person's own leave", () => {
  it('starts as "none" with today from the server', async () => {
    const leave = await leaveOf(w.dodi);
    expect(leave.me.state).toBe('none');
    expect(leave.me.request).toBeNull();
    expect(leave.today).toBe(requestClock().today);
  });

  it('shows a request waiting for approval as "pending"', async () => {
    await seedLeave(w.dodi, day(3), day(5), 'pending');
    const leave = await leaveOf(w.dodi);
    expect(leave.me.state).toBe('pending');
    expect(leave.me.request).toMatchObject({
      startDate: day(3),
      endDate: day(5),
      days: 3,
      canCancel: true,
    });
  });

  it('shows an approved leave under way as "approved"', async () => {
    await seedLeave(w.dodi, day(0), day(2), 'approved');
    expect((await leaveOf(w.dodi)).me.state).toBe('approved');
  });

  it('keeps a rejected request visible until a new one is sent', async () => {
    await seedLeave(w.dodi, day(3), day(5), 'rejected');
    const leave = await leaveOf(w.dodi);
    expect(leave.me.state).toBe('rejected');
    expect(leave.me.history).toHaveLength(1);
  });
});

describe('settings loader: rights per person', () => {
  it('Member: no approvals, no team switch, the request goes to a Pengelola or an Admin', async () => {
    const leave = await leaveOf(w.dodi);
    expect(leave.flags).toEqual({
      canDecide: false,
      canManageSwitch: false,
      autoApproves: false,
      approvers: 'manager_or_admin',
    });
    expect(leave.pending).toBeNull();
  });

  it('Project Manager: sees the requests of their Members, not the team switch; asks Admin', async () => {
    await seedLeave(w.dodi, day(3), day(5), 'pending');
    await seedLeave(w.oki, day(3), day(5), 'pending'); // Oki is in a project Nico does not manage
    const leave = await leaveOf(w.nico);
    expect(leave.flags).toEqual({
      canDecide: true,
      canManageSwitch: false,
      autoApproves: false,
      approvers: 'admin',
    });
    expect(leave.pending?.total).toBe(1);
    expect(leave.pending?.items[0]).toMatchObject({
      requester: { id: w.dodi.id, name: 'Dodi' },
      startDate: day(3),
      days: 3,
      dueTasks: 0,
    });
  });

  it('Admin: sees every request and the team switch; their own leave is saved at once', async () => {
    await seedLeave(w.dodi, day(3), day(5), 'pending');
    await seedLeave(w.oki, day(3), day(5), 'pending');
    const leave = await leaveOf(w.ayu);
    expect(leave.flags).toEqual({
      canDecide: true,
      canManageSwitch: true,
      autoApproves: true,
      approvers: 'none',
    });
    expect(leave.pending?.total).toBe(2);
  });

  it('Super-admin: the same as Admin', async () => {
    const boss = await f.user({ role: 'super-admin' });
    const flags = (await leaveOf(boss)).flags;
    expect(flags.canDecide).toBe(true);
    expect(flags.canManageSwitch).toBe(true);
  });

  it('a Super-admin acting as someone else decides nothing and cannot flip the switch', async () => {
    const boss = await f.user({ role: 'super-admin' });
    const leave = await leaveOf(boss, { impersonatedBy: 'someone-else' });
    expect(leave.flags.canDecide).toBe(false);
    expect(leave.flags.canManageSwitch).toBe(false);
    expect(leave.pending).toBeNull();
  });

  it('with the approval switch off, every request is saved at once and the state says so', async () => {
    await upsertLeaveSettings({ requiresApproval: false });
    const leave = await leaveOf(w.dodi);
    expect(leave.me.requiresApproval).toBe(false);
    expect(leave.flags.autoApproves).toBe(true);
  });
});
