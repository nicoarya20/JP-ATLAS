/**
 * `PUT` / `DELETE /api/admin/users/:id/leave` (P14 CU-03): an Admin records somebody's leave or
 * ends the one under way. Driven through the production router with the real guard, policy and
 * service, so what is asserted is what a console would get: the range rules (422), the overlap
 * refusal that names the period in the way (409 `LEAVE_OVERLAP`), a past range accepted on purpose
 * (§10 T3), who may call at all, the audit trail, and the card the person is told with (D5).
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { auditLog, leavePeriod, notification } from '../../server/db/schema';
import { LEAVE_MAX_DAYS, LEAVE_NOTE_MAX } from '../../server/leave/leave.dto';
import { call, expectApiError, resetApiLimiters, waitForAudit } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW, freezeAt } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'admleave' });

// today is 2026-10-07 in the team zone; every date below is read against it.
const TODAY = '2026-10-07';
const url = (u: TestUser | string) => `/admin/users/${typeof u === 'string' ? u : u.id}/leave`;

type Cast = {
  admin: TestUser;
  sa: TestUser;
  pm: TestUser;
  member: TestUser;
  target: TestUser;
};
let c: Cast;

beforeEach(async () => {
  resetApiLimiters();
  freezeAt(ATLAS_NOW);
  c = {
    admin: await f.user({ role: 'admin', name: 'Ayu' }),
    sa: await f.user({ role: 'super-admin', name: 'Sari' }),
    pm: await f.user({ role: 'project_manager', name: 'Nico' }),
    member: await f.user({ name: 'Dodi' }),
    target: await f.user({ name: 'Eka' }),
  };
  auth.as(c.admin);
});
afterEach(() => cleaner.flushTest());
afterAll(async () => {
  resetApiLimiters();
  await cleaner.flushAll();
});

const seed = (u: TestUser, startDate: string, endDate: string, note: string | null = null) =>
  db.insert(leavePeriod).values({ userId: u.id, startDate, endDate, note }).returning();

const periodsOf = (u: TestUser) =>
  db.select().from(leavePeriod).where(eq(leavePeriod.userId, u.id));

/** The `leave_recorded` cards written for one person, newest first. */
const cardsFor = (u: TestUser) =>
  db
    .select()
    .from(notification)
    .where(and(eq(notification.recipientId, u.id), eq(notification.kind, 'leave_recorded')));

const put = (u: TestUser, body: unknown) => call('PUT', url(u), body);
const range = (startDate: string, endDate: string, note?: string) => ({
  startDate,
  endDate,
  ...(note === undefined ? {} : { note }),
});

describe('PUT /admin/users/:id/leave', () => {
  it('records a period for somebody who has none, and tells them about it', async () => {
    const res = await put(c.target, range('2026-10-20', '2026-10-22', 'umroh'));
    expect(res.status).toBe(200);
    expect(res.body.replaced).toBeNull();
    expect(res.body.period).toMatchObject({
      startDate: '2026-10-20',
      endDate: '2026-10-22',
      days: 3,
      note: 'umroh',
    });
    const rows = await periodsOf(c.target);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ note: 'umroh', createdBy: c.admin.id });
    const [card] = await cardsFor(c.target);
    if (!card) throw new Error('the person was not told their leave was recorded');
    expect(card).toMatchObject({ lane: 'info', refType: 'leave', refId: res.body.period.id });
    expect(card.payload).toMatchObject({
      startDate: '2026-10-20',
      endDate: '2026-10-22',
      days: 3,
      change: 'set',
    });
    // The note is Admin-only (D6): it may not ride along in the Inbox card.
    expect(JSON.stringify(card.payload)).not.toContain('umroh');
  });

  it('replaces the leave under way instead of leaving a second row behind', async () => {
    const [first] = await seed(c.target, '2026-10-05', '2026-10-09');
    if (!first) throw new Error('seed failed');
    const res = await put(c.target, range('2026-10-05', '2026-10-12'));
    expect(res.status).toBe(200);
    expect(res.body.period.id).toBe(first.id);
    expect(res.body.replaced).toMatchObject({ startDate: '2026-10-05', endDate: '2026-10-09' });
    const rows = await periodsOf(c.target);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ endDate: '2026-10-12' });
  });

  it('accepts a range that is already over: recording is not applying (§10 T3)', async () => {
    const res = await put(c.target, range('2026-09-01', '2026-09-05'));
    expect(res.status).toBe(200);
    expect(res.body.period).toMatchObject({ startDate: '2026-09-01', days: 5 });
    expect(res.body.period.endDate < TODAY).toBe(true);
  });

  it('clears a blank note instead of storing an empty string', async () => {
    const res = await put(c.target, range('2026-10-20', '2026-10-21', '   '));
    expect(res.status).toBe(200);
    expect(res.body.period.note).toBeNull();
  });

  const tooLong = (days: number) => range('2026-11-01', isoPlus('2026-11-01', days - 1));
  it.each([
    ['a date that is not a real day', range('2026-02-30', '2026-03-02')],
    ['a date that is not a date at all', range('20 Nov', '2026-11-21')],
    ['an end before the start', range('2026-11-10', '2026-11-09')],
    [`a range longer than ${LEAVE_MAX_DAYS} days`, tooLong(LEAVE_MAX_DAYS + 1)],
    ['a note over the limit', range('2026-11-01', '2026-11-02', 'x'.repeat(LEAVE_NOTE_MAX + 1))],
  ])('refuses %s with 422 VALIDATION', async (_name, body) => {
    const res = await put(c.target, body);
    expectApiError(res, 422, 'VALIDATION');
    expect(await periodsOf(c.target)).toHaveLength(0);
  });

  it(`accepts exactly ${LEAVE_MAX_DAYS} days`, async () => {
    const res = await put(c.target, tooLong(LEAVE_MAX_DAYS));
    expect(res.status).toBe(200);
    expect(res.body.period.days).toBe(LEAVE_MAX_DAYS);
  });

  it('refuses a range that overlaps another period, naming the one in the way (§10 T2)', async () => {
    await seed(c.target, '2026-11-01', '2026-11-05');
    const res = await put(c.target, range('2026-11-04', '2026-11-06'));
    expectApiError(res, 409, 'LEAVE_OVERLAP');
    expect(res.body.error).toContain('1–5 Nov 2026');
    expect(await periodsOf(c.target)).toHaveLength(1);
  });

  it('still refuses when the replacement of a running leave runs into a third period', async () => {
    await seed(c.target, '2026-10-05', '2026-10-09'); // under way, so it is the one being replaced
    await seed(c.target, '2026-10-20', '2026-10-25');
    const res = await put(c.target, range('2026-10-05', '2026-10-21'));
    expectApiError(res, 409, 'LEAVE_OVERLAP');
    expect(res.body.error).toContain('20–25 Okt 2026');
    // Nothing was written: the period under way is untouched.
    const rows = await periodsOf(c.target);
    expect(rows.map((r) => r.endDate).sort()).toEqual(['2026-10-09', '2026-10-25']);
  });

  it('keeps one person periods apart from another person', async () => {
    await seed(c.member, '2026-11-01', '2026-11-05');
    expect((await put(c.target, range('2026-11-01', '2026-11-05'))).status).toBe(200);
  });

  it('touching days do not overlap: a period may start the day after another ends', async () => {
    await seed(c.target, '2026-11-01', '2026-11-05');
    expect((await put(c.target, range('2026-11-06', '2026-11-08'))).status).toBe(200);
    expect(await periodsOf(c.target)).toHaveLength(2);
  });

  it('answers 404 for an account that does not exist', async () => {
    const res = await call('PUT', url('ghost-user'), range('2026-11-01', '2026-11-02'));
    expectApiError(res, 404, 'NOT_FOUND');
  });
});

describe('DELETE /admin/users/:id/leave', () => {
  it('ends the leave under way and tells the person', async () => {
    const [row] = await seed(c.target, '2026-10-05', '2026-10-09', 'sakit');
    if (!row) throw new Error('seed failed');
    const res = await call('DELETE', url(c.target));
    expect(res.status).toBe(200);
    expect(res.body.cleared).toMatchObject({ id: row.id, days: 5 });
    expect(await periodsOf(c.target)).toHaveLength(0);
    const [card] = await cardsFor(c.target);
    expect(card?.payload).toMatchObject({ change: 'cleared', startDate: '2026-10-05' });
  });

  it('answers 404 when the person is not on leave today, and leaves a future period alone', async () => {
    await seed(c.target, '2026-10-20', '2026-10-25');
    expectApiError(await call('DELETE', url(c.target)), 404, 'NOT_FOUND');
    expect(await periodsOf(c.target)).toHaveLength(1);
  });

  it('answers 404 for an account that does not exist', async () => {
    expectApiError(await call('DELETE', url('ghost-user')), 404, 'NOT_FOUND');
  });
});

describe('who may record a leave', () => {
  it.each(['member', 'pm'] as const)('refuses a %s on both endpoints with 403', async (who) => {
    auth.as(c[who]);
    expectApiError(await put(c.target, range('2026-11-01', '2026-11-02')), 403, 'NOT_ADMIN');
    expectApiError(await call('DELETE', url(c.target)), 403, 'NOT_ADMIN');
    expect(await periodsOf(c.target)).toHaveLength(0);
  });

  it('refuses while impersonating: the trail would name the wrong person (Q9)', async () => {
    auth.as(c.admin, { impersonatedBy: c.sa.id });
    expectApiError(await put(c.target, range('2026-11-01', '2026-11-02')), 403, 'IMPERSONATING');
    expectApiError(await call('DELETE', url(c.target)), 403, 'IMPERSONATING');
  });

  it('lets a super-admin record leave for an Admin: nobody is protected from being away', async () => {
    auth.as(c.sa);
    expect((await put(c.admin, range('2026-11-01', '2026-11-03'))).status).toBe(200);
  });

  it('lets an Admin record their own leave, and sends themselves no card', async () => {
    const res = await put(c.admin, range('2026-11-01', '2026-11-03'));
    expect(res.status).toBe(200);
    expect(await cardsFor(c.admin)).toHaveLength(0);
  });
});

describe('audit', () => {
  const forAction = (action: string, targetId: string) =>
    waitForAudit(eq(auditLog.action, action), eq(auditLog.targetId, targetId));

  it('records leave.set without the Admin-only note', async () => {
    const note = 'urusan keluarga'; // test-only
    const res = await put(c.target, range('2026-10-20', '2026-10-22', note));
    const [entry] = await forAction('leave.set', res.body.period.id as string);
    if (!entry) throw new Error('No audit entry for the recorded leave');
    cleaner.track('audit', entry.id);
    expect(entry).toMatchObject({ actorId: c.admin.id, targetType: 'leave' });
    expect(entry.summary).toContain('20–22 Okt 2026');
    expect(entry.meta).toMatchObject({
      userId: c.target.id,
      startDate: '2026-10-20',
      days: 3,
      hasNote: true,
      replacedPeriodId: null,
    });
    expect(JSON.stringify(entry)).not.toContain(note);
  });

  it('records leave.clear, and nothing at all for a refused call', async () => {
    const [row] = await seed(c.target, '2026-10-05', '2026-10-09');
    if (!row) throw new Error('seed failed');
    expect((await call('DELETE', url(c.target))).status).toBe(200);
    const [entry] = await forAction('leave.clear', row.id);
    if (!entry) throw new Error('No audit entry for the ended leave');
    cleaner.track('audit', entry.id);
    expect(entry).toMatchObject({ actorId: c.admin.id, targetType: 'leave' });

    auth.as(c.member);
    expectApiError(await put(c.target, range('2026-11-01', '2026-11-02')), 403, 'NOT_ADMIN');
    const refused = await waitForAudit(
      eq(auditLog.action, 'leave.set'),
      eq(auditLog.actorId, c.member.id),
    );
    expect(refused).toEqual([]);
  });
});

/** `YYYY-MM-DD` plus whole days; test-only arithmetic so the range cases read as dates. */
function isoPlus(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
