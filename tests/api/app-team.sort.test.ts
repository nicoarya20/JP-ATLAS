/**
 * `GET /api/app/team?sort=active|overdue` over HTTP (S6 tim-a): the global order across pages, who
 * may ask for it (`422 SORT_NOT_ALLOWED` otherwise) and that an API key may use it under its owner.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { api } from '../../server/api';
import { setApiKeyIdentity } from '../../server/api-keys/identity';
import { call, expectApiError, type Json, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW, freezeAt } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'teamsortapi' });
beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
  freezeAt(ATLAS_NOW);
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const BASE = '/app/team';
const marker = () => `m${crypto.randomUUID().slice(0, 8)}`;
const names = (body: Json) => body.people.map((p: Json) => p.name);

/**
 * Eka manages X with Awan (1 open task), Budi (3, two overdue), Cahya (3, none overdue) and Dedi
 * (a Project Manager with 5 overdue tasks, all in Z, which Eka does not see: a counted zero plus
 * `alsoElsewhere`). Hana works with Eka only in W, where Eka is a plain member: her numbers are
 * out of Eka's scope, so she carries no `load` and sorts last.
 */
async function graph() {
  const mk = marker();
  const eka = await f.user({ role: 'project_manager', name: `${mk} Eka` });
  const awan = await f.user({ name: `${mk} Awan` });
  const budi = await f.user({ name: `${mk} Budi` });
  const cahya = await f.user({ name: `${mk} Cahya` });
  const dedi = await f.user({ role: 'project_manager', name: `${mk} Dedi` });
  const x = await f.project({
    lead: eka,
    members: [
      [awan, 'member'],
      [budi, 'member'],
      [cahya, 'member'],
      [dedi, 'member'],
    ],
    name: `${mk} X`,
  });
  const z = await f.project({ lead: dedi, name: `${mk} Z` });
  const hana = await f.user({ name: `${mk} Hana` });
  const w = await f.project({
    lead: dedi,
    members: [
      [eka, 'member'],
      [hana, 'member'],
    ],
    name: `${mk} W`,
  });
  for (let i = 0; i < 4; i++)
    await f.task({ project: w, assignee: hana, status: 'todo', due: '2026-10-01' });
  await f.task({ project: x, assignee: awan, status: 'todo', due: '2026-12-01' });
  for (const due of ['2026-10-01', '2026-10-02', '2026-12-01'])
    await f.task({ project: x, assignee: budi, status: 'todo', due });
  for (const due of ['2026-12-01', '2026-12-02', '2026-12-03'])
    await f.task({ project: x, assignee: cahya, status: 'todo', due });
  for (let i = 0; i < 5; i++)
    await f.task({ project: z, assignee: dedi, status: 'todo', due: '2026-10-01' });
  return { mk, eka, awan, budi, cahya, dedi, hana, x, z };
}

async function listAs(who: TestUser, query: string): Promise<Json> {
  auth.as(who);
  const res = await call('GET', `${BASE}?${query}`);
  expect(res.status).toBe(200);
  return res.body;
}

describe('sort=active', () => {
  it('puts the busiest first, then by name, and Hana (not countable by Eka) last', async () => {
    const g = await graph();
    const body = await listAs(g.eka, `q=${g.mk}&sort=active`);
    expect(names(body)).toEqual(
      [g.budi, g.cahya, g.awan, g.dedi, g.eka, g.hana].map((u) => u.name), // 3, 3, 1, 0, 0, none
    );
    expect(body.people.at(-1).load).toBeUndefined();
  });

  it('is one global order across pages, with the full total on every page', async () => {
    const g = await graph();
    const seen: string[] = [];
    for (const offset of [0, 2, 4]) {
      const body = await listAs(g.eka, `q=${g.mk}&sort=active&limit=2&offset=${offset}`);
      expect(body.total).toBe(6);
      seen.push(...names(body));
    }
    expect(seen).toEqual([g.budi, g.cahya, g.awan, g.dedi, g.eka, g.hana].map((u) => u.name));
  });

  it('is open to an Admin who manages nothing', async () => {
    const g = await graph();
    const admin = await f.user({ role: 'admin', name: `${g.mk} Zadmin` });
    expect(names(await listAs(admin, `q=${g.mk}&sort=active`))[0]).toBe(`${g.mk} Dedi`);
  });

  it.each(['active', 'overdue'])('refuses %s to a Member with 422 SORT_NOT_ALLOWED', async (s) => {
    const g = await graph();
    auth.as(g.awan);
    const res = await call('GET', `${BASE}?q=${g.mk}&sort=${s}`);
    expectApiError(res, 422, 'SORT_NOT_ALLOWED');
    expect(res.body.people).toBeUndefined();
  });

  it.each(['active', 'overdue'])('refuses %s to a Project Manager who manages none', async (s) => {
    const g = await graph();
    const lone = await f.user({ role: 'project_manager', name: `${g.mk} Lone` });
    await f.project({ lead: g.eka, members: [[lone, 'member']], name: `${g.mk} Y` });
    auth.as(lone);
    expectApiError(await call('GET', `${BASE}?q=${g.mk}&sort=${s}`), 422, 'SORT_NOT_ALLOWED');
  });

  it('rejects an unknown sort with the uniform 422', async () => {
    const g = await graph();
    auth.as(g.eka);
    expectApiError(await call('GET', `${BASE}?sort=load`), 422, 'VALIDATION');
  });
});

describe('sort=overdue is global too', () => {
  it('orders the pages as one list: most overdue first, ties by name', async () => {
    const g = await graph();
    const seen: string[] = [];
    for (const offset of [0, 2, 4]) {
      const body = await listAs(g.eka, `q=${g.mk}&sort=overdue&limit=2&offset=${offset}`);
      seen.push(...names(body));
    }
    // Budi 2 overdue, then the zeros by name (Awan, Cahya, Dedi, Eka), then Hana with no numbers.
    expect(seen).toEqual([g.budi, g.awan, g.cahya, g.dedi, g.eka, g.hana].map((u) => u.name));
  });
});

describe('API keys', () => {
  it('lets an app:read key sort by active under its owner’s own right to', async () => {
    const g = await graph();
    const send = async (owner: TestUser) => {
      const request = new Request(`http://localhost/api${BASE}?q=${g.mk}&sort=active`);
      setApiKeyIdentity(request, {
        keyId: 'team-sort-key',
        keyName: null,
        scopes: ['app:read'],
        user: { id: owner.id, email: owner.email, name: owner.name },
        role: owner.role,
        startedAt: Date.now(),
      });
      const res = await api.handle(request);
      return { status: res.status, body: (await res.json()) as Json };
    };
    const manager = await send(g.eka);
    expect(manager.status).toBe(200);
    expect(names(manager.body)[0]).toBe(`${g.mk} Budi`);
    const member = await send(g.awan);
    expectApiError(member, 422, 'SORT_NOT_ALLOWED');
  });
});
