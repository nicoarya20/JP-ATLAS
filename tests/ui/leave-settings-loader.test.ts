/**
 * The /app/settings loader hands the Ketersediaan block the person's own state. Since P14 it is the
 * same read for every role — nobody applies for leave in the app and nobody decides it here (D3) —
 * so what is pinned is the date boundary and that `today` comes from the server. Runs against the
 * test database.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { loader } from '../../app/routes/app/settings';
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
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const SESSION = 'better-auth.session_token=test'; // test-only

async function leaveOf(who: Parameters<typeof auth.as>[0]) {
  auth.as(who);
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
  it('is null with today from the server when nothing is recorded', async () => {
    const leave = await leaveOf(w.dodi);
    expect(leave.onLeaveUntil).toBeNull();
    expect(leave.today).toBe(requestClock().today);
  });

  it('names the last day of a leave that covers today', async () => {
    await seedLeave(w.dodi, day(-1), day(2));
    expect((await leaveOf(w.dodi)).onLeaveUntil).toBe(day(2));
  });

  it('stays null for a leave that has not started or is already over', async () => {
    await seedLeave(w.dodi, day(3), day(5));
    await seedLeave(w.eka, day(-5), day(-3));
    expect((await leaveOf(w.dodi)).onLeaveUntil).toBeNull();
    expect((await leaveOf(w.eka)).onLeaveUntil).toBeNull();
  });

  it('reads only the signed-in person, not a colleague who is away', async () => {
    await seedLeave(w.eka, day(0), day(2));
    expect((await leaveOf(w.dodi)).onLeaveUntil).toBeNull();
    expect((await leaveOf(w.eka)).onLeaveUntil).toBe(day(2));
  });

  it('is the same read for a Member, a Project Manager and an Admin (P14 D3)', async () => {
    for (const who of [w.dodi, w.nico, w.ayu]) {
      await seedLeave(who, day(0), day(1));
      expect((await leaveOf(who)).onLeaveUntil).toBe(day(1));
    }
  });

  it('never hands the Admin-only note to the page (P14 D6)', async () => {
    await seedLeave(w.dodi, day(0), day(2), 'umroh');
    const leave = await leaveOf(w.dodi);
    expect(Object.keys(leave).sort()).toEqual(['onLeaveUntil', 'today']);
    expect(JSON.stringify(leave)).not.toInclude('umroh');
  });
});
