/** Condition override and activity routes (S5a-03): set, replace, clear, guards, and the feed after each change. */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { OVERRIDE_REASON_MAX } from '../../server/project/project.limits';
import { expectApiError, type Json } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { callApp, resetWriteLimit } from '../support/deadline-app';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'ovapi' });
beforeEach(() => {
  auth.as(null);
  resetWriteLimit();
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const HOUR_MS = 3_600_000;
const over = (id: string) => `/projects/${id}/condition-override`;
const payload = (extra: Json = {}) => ({
  condition: 'at_risk',
  reason: 'Menunggu klien',
  ...extra,
});

async function team(status: 'active' | 'on_hold' = 'active') {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const outsider = await f.user();
  const prj = await f.project({
    lead,
    members: [[member, 'member']],
    status,
    dueDate: '2030-12-01',
  });
  return { lead, member, outsider, prj };
}

describe('sign-in gate', () => {
  it.each([
    ['POST', '/projects/p1/condition-override'],
    ['DELETE', '/projects/p1/condition-override'],
    ['GET', '/projects/p1/activity'],
  ])('%s %s without a session is 401', async (method, path) => {
    expectApiError(
      await callApp(method, path, method === 'POST' ? {} : undefined),
      401,
      'UNAUTHORIZED',
    );
  });
});

describe('condition override', () => {
  it('sets (201) with its author, and DELETE clears it', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    const set = await callApp('POST', over(prj.id), payload());
    expect(set.status).toBe(201);
    expect(set.body.conditionOverride).toMatchObject({
      projectId: prj.id,
      condition: 'at_risk',
      reason: 'Menunggu klien',
      setBy: lead.id,
      setByName: lead.name,
      expiresAt: null,
      clearedAt: null,
    });
    const del = await callApp('DELETE', over(prj.id));
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ conditionOverride: null, cleared: 1 });
    // Asking again is harmless.
    expect((await callApp('DELETE', over(prj.id))).body).toEqual({
      conditionOverride: null,
      cleared: 0,
    });
  });

  it('keeps a future expiry and refuses one in the past', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    const expiresAt = new Date(Date.now() + HOUR_MS).toISOString();
    const ok = await callApp('POST', over(prj.id), payload({ expiresAt }));
    expect(ok.body.conditionOverride.expiresAt).toBe(expiresAt);
    const past = new Date(Date.now() - HOUR_MS).toISOString();
    expectApiError(
      await callApp('POST', over(prj.id), payload({ expiresAt: past })),
      422,
      'VALIDATION',
    );
  });

  it.each([
    ['an unknown condition', { condition: 'bagus' }, 'VALIDATION'],
    ['an empty reason', { reason: '' }, 'VALIDATION'],
    ['a blank reason', { reason: '  ' }, 'REASON_REQUIRED'],
    ['an oversized reason', { reason: 'a'.repeat(OVERRIDE_REASON_MAX + 1) }, 'VALIDATION'],
  ])('rejects %s with 422', async (_n, extra, code) => {
    const { lead, prj } = await team();
    auth.as(lead);
    expectApiError(await callApp('POST', over(prj.id), payload(extra)), 422, code);
  });

  it('refuses a project that is not running (422 NOT_ACTIVE)', async () => {
    const { lead, prj } = await team('on_hold');
    auth.as(lead);
    const res = await callApp('POST', over(prj.id), payload());
    expectApiError(res, 422, 'NOT_ACTIVE');
    expect(res.body.error).toContain('berjalan');
  });

  it('answers 403 to a plain member and 404 to an outsider, for set and clear', async () => {
    const { member, outsider, prj } = await team();
    auth.as(member);
    expectApiError(await callApp('POST', over(prj.id), payload()), 403, 'NOT_MANAGER');
    expectApiError(await callApp('DELETE', over(prj.id)), 403, 'NOT_MANAGER');
    auth.as(outsider);
    expectApiError(await callApp('POST', over(prj.id), payload()), 404, 'NOT_FOUND');
    expectApiError(await callApp('DELETE', over(prj.id)), 404, 'NOT_FOUND');
  });
});

describe('GET /projects/:id/activity', () => {
  it('reads as plain Indonesian sentences, newest first', async () => {
    const { lead, member, prj } = await team();
    auth.as(lead);
    await callApp('POST', `/projects/${prj.id}/extend-deadline`, {
      newDueDate: '2030-12-20',
      reasonCategory: 'resource',
      reason: 'Tim kurang',
    });
    await callApp('POST', over(prj.id), payload());
    auth.as(member);
    const res = await callApp('GET', `/projects/${prj.id}/activity`);
    expect(res.status).toBe(200);
    expect(res.body.nextCursor).toBeNull();
    expect(res.body.items.map((i: Json) => i.text)).toEqual([
      `${lead.name} mengatur kondisi proyek secara manual menjadi Perlu perhatian`,
      `${lead.name} memperpanjang tenggat 1 Des → 20 Des`,
    ]);
    expect(Object.keys(res.body.items[0]).sort()).toEqual(
      ['action', 'actorId', 'actorName', 'createdAt', 'id', 'text'].sort(),
    );
  });

  it('pages with limit and nextCursor, and rejects a forged cursor', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    for (const d of ['2030-12-05', '2030-12-10', '2030-12-15']) {
      await callApp('POST', `/projects/${prj.id}/extend-deadline`, {
        newDueDate: d,
        reasonCategory: 'other',
        reason: 'Alasan',
      });
    }
    const one = await callApp('GET', `/projects/${prj.id}/activity?limit=2`);
    expect(one.body.items).toHaveLength(2);
    expect(typeof one.body.nextCursor).toBe('string');
    const two = await callApp(
      'GET',
      `/projects/${prj.id}/activity?limit=2&cursor=${one.body.nextCursor}`,
    );
    expect(two.body.items).toHaveLength(1);
    expect(two.body.nextCursor).toBeNull();
    const ids = [...one.body.items, ...two.body.items].map((i: Json) => i.id);
    expect(new Set(ids).size).toBe(3);
    expectApiError(
      await callApp('GET', `/projects/${prj.id}/activity?cursor=rusak`),
      422,
      'VALIDATION',
    );
  });

  it('is 404 for an outsider and for a missing project', async () => {
    const { outsider, prj } = await team();
    auth.as(outsider);
    expectApiError(await callApp('GET', `/projects/${prj.id}/activity`), 404, 'NOT_FOUND');
    expectApiError(await callApp('GET', '/projects/no-such/activity'), 404, 'NOT_FOUND');
  });
});
