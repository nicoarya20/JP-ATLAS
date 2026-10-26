/**
 * `GET /api/admin/users/:id/leave` (P14 CU-04): the period under way plus the recorded history the
 * Admin drawer shows. Driven through the production router with the real gate and policy. What is
 * pinned here: the history is the only place a period that is entirely past can be read (§10 T1,
 * it never reaches the Team badge), it is paged rather than whole, the Admin who wrote each row
 * comes from the same statement (no N+1), and the note is readable here and nowhere else (D6).
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { auditLog, leavePeriod, notification } from '../../server/db/schema';
import {
  LEAVE_HISTORY_LIMIT,
  LEAVE_HISTORY_MAX_LIMIT,
  listLeavePeriods,
} from '../../server/leave/leave.query';
import { leaveStatusFor } from '../../server/leave/leave.status.query';
import { call, expectApiError, resetApiLimiters, waitForAudit } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW, freezeAt } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'admleaveread' });

// today is 2026-10-07 in the team zone; every date below is read against it.
const TODAY = '2026-10-07';
const url = (u: TestUser | string, qs = '') =>
  `/admin/users/${typeof u === 'string' ? u : u.id}/leave${qs}`;

type Cast = { admin: TestUser; pm: TestUser; member: TestUser; sa: TestUser; target: TestUser };
let c: Cast;

beforeEach(async () => {
  resetApiLimiters();
  freezeAt(ATLAS_NOW);
  c = {
    admin: await f.user({ role: 'admin', name: 'Ayu' }),
    pm: await f.user({ role: 'project_manager', name: 'Nico' }),
    member: await f.user({ name: 'Dodi' }),
    sa: await f.user({ role: 'super-admin', name: 'Sari' }),
    target: await f.user({ name: 'Eka' }),
  };
  auth.as(c.admin);
});
afterEach(() => cleaner.flushTest());
afterAll(async () => {
  resetApiLimiters();
  await cleaner.flushAll();
});

/** Seeds a period straight into the table; `by` is the admin `created_by` names. */
const seed = (
  u: TestUser,
  startDate: string,
  endDate: string,
  note: string | null = null,
  by: TestUser | null = c.admin,
) =>
  db
    .insert(leavePeriod)
    .values({ userId: u.id, startDate, endDate, note, createdBy: by?.id ?? null })
    .returning();

const get = (u: TestUser | string, qs = '') => call('GET', url(u, qs));

describe('the period under way and the history', () => {
  it('answers the running period, and lists past, running and future ranges newest first', async () => {
    await seed(c.target, '2026-08-01', '2026-08-03', 'cuti lebaran');
    await seed(c.target, '2026-10-05', '2026-10-09', 'sakit');
    await seed(c.target, '2026-12-20', '2026-12-24');
    const res = await get(c.target);
    expect(res.status).toBe(200);
    expect(res.body.today).toBe(TODAY);
    expect(res.body.running).toMatchObject({
      startDate: '2026-10-05',
      endDate: '2026-10-09',
      days: 5,
      note: 'sakit',
    });
    expect(res.body.total).toBe(3);
    expect(res.body.items.map((i: { startDate: string }) => i.startDate)).toEqual([
      '2026-12-20',
      '2026-10-05',
      '2026-08-01',
    ]);
    // A range that is entirely past reaches no other screen: the Team badge is computed from today.
    expect(res.body.items[2]).toMatchObject({
      endDate: '2026-08-03',
      days: 3,
      note: 'cuti lebaran',
    });
    expect(res.body.items[0].days).toBe(5);
  });

  it('names the Admin who recorded each period, and says nothing when the column is empty', async () => {
    await seed(c.target, '2026-09-01', '2026-09-02', null, c.sa);
    await seed(c.target, '2026-07-01', '2026-07-02', null, null);
    const res = await get(c.target);
    expect(res.body.items[0].recordedBy).toMatchObject({ id: c.sa.id, name: 'Sari' });
    expect(res.body.items[1].recordedBy).toBeNull();
    expect(typeof res.body.items[0].recordedAt).toBe('string');
    expect(Date.parse(res.body.items[0].recordedAt)).not.toBeNaN();
  });

  it('answers an empty history and no running period for somebody who was never away', async () => {
    const res = await get(c.target);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ running: null, items: [], total: 0, page: 1 });
    expect(res.body.limit).toBe(LEAVE_HISTORY_LIMIT);
  });

  it('drops the period from the history once the leave is ended, because the row is deleted', async () => {
    await seed(c.target, '2026-10-05', '2026-10-09');
    expect((await call('DELETE', url(c.target))).status).toBe(200);
    const res = await get(c.target);
    expect(res.body).toMatchObject({ running: null, items: [], total: 0 });
  });
});

describe('the history is paged, never whole', () => {
  /** `n` one-day ranges on consecutive days of 2025, so every page boundary is a real date. */
  const seedMany = async (n: number) => {
    for (let i = 0; i < n; i++) {
      const day = String(i + 1).padStart(2, '0');
      await seed(c.target, `2025-03-${day}`, `2025-03-${day}`);
    }
  };

  it('returns one page by default and counts the rest', async () => {
    await seedMany(14);
    const first = await get(c.target);
    expect(first.body.items).toHaveLength(LEAVE_HISTORY_LIMIT);
    expect(first.body.total).toBe(14);
    const second = await get(c.target, '?page=2');
    expect(second.body.items).toHaveLength(4);
    expect(second.body.page).toBe(2);
    // Page 2 continues where page 1 stopped; no range is served twice.
    const ids = new Set([
      ...first.body.items.map((i: { id: string }) => i.id),
      ...second.body.items.map((i: { id: string }) => i.id),
    ]);
    expect(ids.size).toBe(14);
  });

  it('caps a greedy page size instead of loading every period', async () => {
    const res = await get(c.target, '?limit=5000');
    expect(res.body.limit).toBe(LEAVE_HISTORY_MAX_LIMIT);
  });

  it('falls back to the default page for junk paging', async () => {
    const res = await get(c.target, '?page=-3&limit=abc');
    expect(res.body).toMatchObject({ page: 1, limit: LEAVE_HISTORY_LIMIT });
  });

  it('spends the same two statements whatever the page holds (the recorder is joined, not fetched per row)', async () => {
    await seed(c.target, '2026-03-01', '2026-03-02', null, c.sa);
    const one = countQueries();
    await listLeavePeriods(c.target.id, { limit: 10, offset: 0 }, one.exec);
    expect(one.queries).toHaveLength(2);
    for (let i = 4; i < 9; i++)
      await seed(c.target, `2026-0${i}-01`, `2026-0${i}-02`, null, c.admin);
    const many = countQueries();
    const page = await listLeavePeriods(c.target.id, { limit: 10, offset: 0 }, many.exec);
    expect(page.items).toHaveLength(6);
    expect(many.queries).toHaveLength(2);
  });
});

describe('who may read somebody else’s leave', () => {
  it.each(['member', 'pm'] as const)('refuses a %s with 403', async (who) => {
    auth.as(c[who]);
    expectApiError(await get(c.target), 403, 'NOT_ADMIN');
  });

  it('refuses while impersonating: the Admin-only note is not for a borrowed identity', async () => {
    auth.as(c.admin, { impersonatedBy: c.sa.id });
    expectApiError(await get(c.target), 403, 'IMPERSONATING');
  });

  it('refuses an anonymous caller and answers 404 for an account that does not exist', async () => {
    expectApiError(await get('ghost-user'), 404, 'NOT_FOUND');
    auth.as(null);
    expectApiError(await get(c.target), 401, 'UNAUTHORIZED');
  });
});

describe('the note stays Admin-only (P14 D6)', () => {
  // The full `/api/app/team` body is swept in `tests/api/app-team.availability.test.ts`; what is
  // proved here is that the two surfaces P14 CU-03/CU-04 added keep the note where it belongs.
  it('comes back to an Admin here, and to nobody through the Team status, the card or the trail', async () => {
    const note = 'kontrol ke dokter'; // test-only
    const put = await call('PUT', url(c.target), {
      startDate: '2026-10-05',
      endDate: '2026-10-09',
      note,
    });
    expect(put.status).toBe(200);

    const read = await get(c.target);
    expect(read.body.running.note).toBe(note);
    expect(read.body.items[0].note).toBe(note);

    const status = await leaveStatusFor([c.target.id], TODAY);
    expect(JSON.stringify(status.get(c.target.id))).not.toContain(note);

    const cards = await db
      .select()
      .from(notification)
      .where(eq(notification.recipientId, c.target.id));
    expect(cards.length).toBeGreaterThan(0);
    expect(JSON.stringify(cards)).not.toContain(note);

    const trail = await waitForAudit(eq(auditLog.targetId, read.body.running.id as string));
    expect(trail.length).toBeGreaterThan(0);
    for (const entry of trail) cleaner.track('audit', entry.id);
    expect(JSON.stringify(trail)).not.toContain(note);
  });
});
