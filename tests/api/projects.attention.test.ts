/** `GET /app/projects?perhatian=1` (KB-9): only active projects at risk or late, with honest totals and pages. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { call, expectApiError, type Json, resetApiLimiters } from '../support/api';
import { type AttentionWorld, seedAttentionWorld } from '../support/attention-world';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'prjatt' });

// Read-only tests: one world for the file keeps the seeding (nine projects) out of every test.
let w: AttentionWorld;
beforeAll(async () => {
  w = await cleaner.shared(() => seedAttentionWorld(f));
});
beforeEach(() => {
  auth.as(w.me);
  resetApiLimiters();
});
afterAll(() => cleaner.flushAll());

const names = (res: { body: Json }) => (res.body.items as { name: string }[]).map((i) => i.name);
const url = (query = '') => `/app/projects?scope=all&sort=name&q=${w.marker}${query}`;

describe('perhatian=1', () => {
  it('keeps only active projects whose effective condition is at risk or late', async () => {
    const res = await call('GET', url('&perhatian=1'));
    expect(res.status).toBe(200);
    const { names: n } = w;
    expect(names(res)).toEqual([n.berisiko, n.override, n.terlambat].sort());
    expect(res.body.total).toBe(3);
    const levels = Object.fromEntries(
      (res.body.items as { name: string; condition: { level: string } }[]).map((i) => [
        i.name,
        i.condition.level,
      ]),
    );
    expect(levels).toEqual({
      [n.berisiko]: 'at_risk',
      [n.override]: 'off_track', // the manager's own judgement wins over "on track"
      [n.terlambat]: 'off_track',
    });
  });

  it('every item still carries its condition with the one-sentence reason', async () => {
    const res = await call('GET', url('&perhatian=1'));
    const byName = new Map((res.body.items as Json[]).map((i) => [i.name, i]));
    expect(byName.get(w.names.berisiko)?.condition).toEqual({
      level: 'at_risk',
      reason: '1 milestone terlewat',
    });
    expect(byName.get(w.names.terlambat)?.condition.reason).toStartWith('tenggat lewat');
  });

  it('without the flag the list is as before: every status, no filtering', async () => {
    const res = await call('GET', url());
    expect(res.body.total).toBe(8); // all of mine, the stranger's project hidden from a Member
    expect(names(res)).toContain(w.names.lancar);
  });

  it('counts the total before paging: two pages of 2 hold the same 3 projects', async () => {
    const first = await call('GET', url('&perhatian=1&limit=2&page=1'));
    const second = await call('GET', url('&perhatian=1&limit=2&page=2'));
    const beyond = await call('GET', url('&perhatian=1&limit=2&page=3'));
    expect(first.body).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect(second.body).toMatchObject({ total: 3, page: 2, limit: 2 });
    expect(first.body.items).toHaveLength(2);
    expect(second.body.items).toHaveLength(1);
    expect(beyond.body.items).toEqual([]);
    expect(beyond.body.total).toBe(3);
    const all = await call('GET', url('&perhatian=1'));
    expect([...names(first), ...names(second)]).toEqual(names(all));
  });

  it('keeps the chosen sort: soonest due date first puts the late project ahead', async () => {
    const res = await call('GET', `/app/projects?scope=all&sort=due&q=${w.marker}&perhatian=1`);
    expect(names(res)[0]).toBe(w.names.terlambat);
  });

  it('a Member only ever sees their own projects, a Project Manager sees all', async () => {
    const own = await call('GET', url('&perhatian=1')); // scope=all is narrowed to mine
    expect(names(own)).not.toContain(`${w.marker} Bukan milik saya`);
    expect(own.body.total).toBe(3);
    auth.as(w.lead);
    const everything = await call('GET', url('&perhatian=1'));
    expect(everything.body.total).toBe(4);
    expect(names(everything)).toContain(`${w.marker} Bukan milik saya`);
  });

  it.each(['draft', 'completed', 'on_hold', 'canceled'])(
    'status=%s with the flag is an empty page, since only active projects have a condition',
    async (status) => {
      const res = await call('GET', url(`&perhatian=1&status=${status}`));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ items: [], total: 0 });
    },
  );

  it('status=active with the flag gives the same three projects', async () => {
    const res = await call('GET', url('&perhatian=1&status=active'));
    expect(res.body.total).toBe(3);
  });

  it('refuses a flag value other than 1, and an anonymous caller first', async () => {
    expect((await call('GET', url('&perhatian=0'))).status).toBe(422);
    expect((await call('GET', url('&perhatian=true'))).status).toBe(422);
    auth.as(null);
    expectApiError(await call('GET', url('&perhatian=1')), 401, 'UNAUTHORIZED');
  });
});
