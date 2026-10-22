/** Deadline routes (S5a-03): extend, history, guards and the race, through the real error plugin. */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project } from '../../server/db/schema';
import { EXTENSION_REASON_MAX } from '../../server/project/project.limits';
import { expectApiError, type Json } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { callApp, resetWriteLimit } from '../support/deadline-app';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'dlapi' });
beforeEach(() => {
  auth.as(null);
  resetWriteLimit();
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const DUE = '2030-10-15'; // test-only
const extend = (id: string) => `/projects/${id}/extend-deadline`;
const body = (newDueDate: string, over: Json = {}) => ({
  newDueDate,
  reasonCategory: 'dependency',
  reason: 'Menunggu pemasok',
  ...over,
});

async function team(opts: { status?: 'active' | 'completed'; dueDate?: string | null } = {}) {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const outsider = await f.user();
  const prj = await f.project({
    lead,
    members: [[member, 'member']],
    status: opts.status ?? 'active',
    dueDate: opts.dueDate === undefined ? DUE : opts.dueDate,
  });
  return { lead, member, outsider, prj };
}

describe('sign-in gate', () => {
  it.each([
    ['POST', '/projects/p1/extend-deadline'],
    ['GET', '/projects/p1/extensions'],
  ])('%s %s without a session is 401', async (method, path) => {
    expectApiError(
      await callApp(method, path, method === 'POST' ? {} : undefined),
      401,
      'UNAUTHORIZED',
    );
  });
});

describe('POST /projects/:id/extend-deadline', () => {
  it('extends (201), fills the baseline once and counts each extension', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    const first = await callApp('POST', extend(prj.id), body('2030-10-31'));
    expect(first.status).toBe(201);
    expect(first.body.project).toEqual({
      dueDate: '2030-10-31',
      originalDueDate: DUE,
      extensionCount: 1,
    });
    expect(Object.keys(first.body.extension).sort()).toEqual(
      [
        'createdAt',
        'extendedBy',
        'extendedByName',
        'id',
        'newDueDate',
        'oldDueDate',
        'projectId',
        'reason',
        'reasonCategory',
      ].sort(),
    );
    expect(first.body.extension).toMatchObject({
      oldDueDate: DUE,
      newDueDate: '2030-10-31',
      extendedBy: lead.id,
    });
    const second = await callApp('POST', extend(prj.id), body('2030-11-30'));
    expect(second.body.project).toEqual({
      dueDate: '2030-11-30',
      originalDueDate: DUE,
      extensionCount: 2,
    });
    const third = await callApp('POST', extend(prj.id), body('2030-12-31'));
    expect(third.body.project.extensionCount).toBe(3);
    expect((await db.select().from(project).where(eq(project.id, prj.id)))[0]).toMatchObject({
      dueDate: '2030-12-31',
      originalDueDate: DUE,
    });
  });

  it.each([
    ['the same date', DUE],
    ['an earlier date', '2030-09-01'],
  ])('refuses %s with 422 NOT_LATER and a message that says what to do', async (_n, date) => {
    const { lead, prj } = await team();
    auth.as(lead);
    const res = await callApp('POST', extend(prj.id), body(date));
    expectApiError(res, 422, 'NOT_LATER');
    expect(res.body.error).toContain('lebih lambat');
  });

  it('refuses a project without a due date and a finished project (422)', async () => {
    const none = await team({ dueDate: null });
    auth.as(none.lead);
    expectApiError(
      await callApp('POST', extend(none.prj.id), body('2030-10-31')),
      422,
      'NO_DEADLINE',
    );
    const done = await team({ status: 'completed' });
    auth.as(done.lead);
    expectApiError(
      await callApp('POST', extend(done.prj.id), body('2030-10-31')),
      422,
      'PROJECT_CLOSED',
    );
  });

  it.each([
    ['an unknown category', { reasonCategory: 'lainnya' }, 'VALIDATION'],
    ['a missing category', { reasonCategory: undefined }, 'VALIDATION'],
    ['an empty reason', { reason: '' }, 'VALIDATION'],
    ['a blank reason', { reason: '   ' }, 'REASON_REQUIRED'],
    ['an oversized reason', { reason: 'a'.repeat(EXTENSION_REASON_MAX + 1) }, 'VALIDATION'],
    ['a badly shaped date', { newDueDate: '31-10-2030' }, 'VALIDATION'],
    ['an impossible date', { newDueDate: '2030-02-30' }, 'VALIDATION'],
  ])('rejects %s with 422 and writes nothing', async (_n, over, code) => {
    const { lead, prj } = await team();
    auth.as(lead);
    expectApiError(await callApp('POST', extend(prj.id), body('2030-10-31', over)), 422, code);
    expect((await db.select().from(project).where(eq(project.id, prj.id)))[0]?.dueDate).toBe(DUE);
  });

  it('ignores smuggled dueDate, originalDueDate, extendedBy and createdAt (mass assignment)', async () => {
    const { lead, outsider, prj } = await team();
    auth.as(lead);
    const res = await callApp(
      'POST',
      extend(prj.id),
      body('2030-10-31', {
        dueDate: '2099-01-01',
        originalDueDate: '2000-01-01',
        extendedBy: outsider.id,
        createdAt: '2000-01-01T00:00:00Z',
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.project).toMatchObject({ dueDate: '2030-10-31', originalDueDate: DUE });
    expect(res.body.extension).toMatchObject({ extendedBy: lead.id });
    expect(res.body.extension.createdAt.startsWith('2000')).toBe(false);
  });

  it('answers 403 to a plain member, 404 to an outsider and a missing project', async () => {
    const { member, outsider, prj } = await team();
    auth.as(member);
    expectApiError(await callApp('POST', extend(prj.id), body('2030-10-31')), 403, 'NOT_MANAGER');
    auth.as(outsider);
    expectApiError(await callApp('POST', extend(prj.id), body('2030-10-31')), 404, 'NOT_FOUND');
    expectApiError(await callApp('POST', extend('no-such'), body('2030-10-31')), 404, 'NOT_FOUND');
  });

  it('lets an Admin who is not a member extend', async () => {
    const { prj } = await team();
    auth.as(await f.user({ role: 'admin' }));
    expect((await callApp('POST', extend(prj.id), body('2030-10-31'))).status).toBe(201);
  });

  it('keeps two extensions at once a valid chain', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    const [a, b] = await Promise.all([
      callApp('POST', extend(prj.id), body('2030-11-15')),
      callApp('POST', extend(prj.id), body('2030-11-30')),
    ]);
    const ok = [a, b].filter((r) => r.status === 201);
    for (const r of [a, b]) if (r.status !== 201) expectApiError(r, 422, 'NOT_LATER');
    const olds = ok.map((r) => r.body.extension.oldDueDate);
    expect(new Set(olds).size).toBe(olds.length);
    const list = await callApp('GET', `/projects/${prj.id}/extensions`);
    expect(list.body.count).toBe(ok.length);
  });
});

describe('GET /projects/:id/extensions', () => {
  it('lists newest first with who and why, plus the total', async () => {
    const { lead, member, prj } = await team();
    auth.as(lead);
    for (const d of ['2030-10-20', '2030-11-01', '2030-12-01'])
      await callApp('POST', extend(prj.id), body(d));
    auth.as(member);
    const res = await callApp('GET', `/projects/${prj.id}/extensions`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ count: 3, total: 3, limit: 50 });
    expect(res.body.items.map((e: Json) => e.newDueDate)).toEqual([
      '2030-12-01',
      '2030-11-01',
      '2030-10-20',
    ]);
    expect(res.body.items[0]).toMatchObject({
      extendedByName: lead.name,
      reason: 'Menunggu pemasok',
    });
  });

  it('honours limit but keeps the all-time count', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    for (const d of ['2030-10-20', '2030-11-01']) await callApp('POST', extend(prj.id), body(d));
    const res = await callApp('GET', `/projects/${prj.id}/extensions?limit=1`);
    expect(res.body.items).toHaveLength(1);
    expect(res.body).toMatchObject({ count: 2, total: 2, limit: 1 });
    expectApiError(
      await callApp('GET', `/projects/${prj.id}/extensions?limit=0`),
      422,
      'VALIDATION',
    );
  });

  it('is an empty list for a project never extended, and 404 for an outsider', async () => {
    const { lead, outsider, prj } = await team();
    auth.as(lead);
    expect((await callApp('GET', `/projects/${prj.id}/extensions`)).body).toMatchObject({
      items: [],
      count: 0,
    });
    auth.as(outsider);
    expectApiError(await callApp('GET', `/projects/${prj.id}/extensions`), 404, 'NOT_FOUND');
  });
});
