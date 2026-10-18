/**
 * `GET /api/app/team` (S6 M03) — the core S6 promise, asserted on the raw response body: a Member
 * never sees another Member's numbers. Also the sign-in gate, the query schema, the refused
 * `sort=overdue`, and that `/team/picker` still reaches the picker rather than `/:userId`.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { api } from '../../server/api';
import { setApiKeyIdentity } from '../../server/api-keys/identity';
import type { Scope } from '../../server/api-keys/scopes';
import { TEAM_LIMIT_MAX, TEAM_SEARCH_MAX } from '../../server/team/team.query';
import { call, expectApiError, type Json, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'teamapi' });
beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const BASE = '/app/team';
/** Keys that carry somebody's workload; none may appear on a row the caller may not count (D10). */
const LOAD_KEYS = ['load', 'active', 'overdue', 'alsoElsewhere'];
const marker = () => `m${crypto.randomUUID().slice(0, 8)}`;

/** Lists the team as `who`, narrowed by the scenario marker so other files' rows never show up. */
async function listAs(who: TestUser, q: string, query = ''): Promise<Json> {
  auth.as(who);
  const res = await call('GET', `${BASE}?q=${q}${query}`);
  expect(res.status).toBe(200);
  return res.body;
}

const row = (body: Json, u: TestUser) => body.people.find((p: Json) => p.id === u.id);
const names = (body: Json) => body.people.map((p: Json) => p.name);

/**
 * Two projects. X is managed by Eka and holds Awan (Member), Budi (Member), Cahya (Observer) and
 * Dedi (a Project Manager who is only a Member here, but manages Z). Y is managed by Fajar and
 * also holds Budi.
 *
 * Budi carries three open tasks in X — one of them overdue — and one in Y, so a leak of
 * "everything" (4) is told apart from the manager of X's legitimate "X only" (3).
 */
async function graph() {
  const mk = marker();
  const eka = await f.user({ role: 'project_manager', name: `${mk} Eka` });
  const fajar = await f.user({ role: 'project_manager', name: `${mk} Fajar` });
  const awan = await f.user({ name: `${mk} Awan` });
  const budi = await f.user({ name: `${mk} Budi` });
  const cahya = await f.user({ name: `${mk} Cahya` });
  const dedi = await f.user({ role: 'project_manager', name: `${mk} Dedi` });
  const x = await f.project({
    lead: eka,
    members: [
      [awan, 'member'],
      [budi, 'member'],
      [cahya, 'viewer'],
      [dedi, 'member'],
    ],
    name: `${mk} X`,
  });
  const y = await f.project({ lead: fajar, members: [[budi, 'member']], name: `${mk} Y` });
  await f.project({ lead: dedi, name: `${mk} Z` });
  await f.task({ project: x, assignee: budi, status: 'todo', due: '2026-10-01' }); // overdue
  await f.task({ project: x, assignee: budi, status: 'in_progress', due: '2026-12-01' });
  await f.task({ project: x, assignee: budi, status: 'todo', due: null });
  await f.task({ project: y, assignee: budi, status: 'todo', due: '2026-12-02' });
  return { mk, eka, fajar, awan, budi, cahya, dedi, x, y };
}

/** Everyone in X, as the list names them for a caller who is in X: self first, then A-Z. */
const inX = (mk: string) => [`${mk} Awan`, `${mk} Budi`, `${mk} Cahya`, `${mk} Dedi`, `${mk} Eka`];

describe('sign-in gate', () => {
  it.each([BASE, `${BASE}/someone`])('GET %s without a session is 401', async (path) => {
    expectApiError(await call('GET', path), 401, 'UNAUTHORIZED');
  });

  it('answers 401, not 422, to an anonymous caller with a bad query', async () => {
    expectApiError(await call('GET', `${BASE}?limit=abc&sort=nope`), 401, 'UNAUTHORIZED');
  });
});

describe('load privacy (G1: a Member does not see another Member’s numbers)', () => {
  it.each(['member', 'observer', 'pm-who-manages-elsewhere'] as const)(
    'hides every load key on Budi’s row from a %s of the same project',
    async (kind) => {
      const g = await graph();
      const viewer = kind === 'member' ? g.awan : kind === 'observer' ? g.cahya : g.dedi;
      const body = await listAs(viewer, g.mk);
      const budi = row(body, g.budi);
      expect(budi).toBeDefined();
      for (const key of LOAD_KEYS) expect(JSON.stringify(budi)).not.toContain(key);
      expect(budi.load).toBeUndefined();
      // Nor may the summary carry Budi's work: this caller has no task of their own, so the only
      // numbers it could hold would be somebody else's three. (`summary.active` is the caller's own
      // total, which M02 deliberately keeps — see tests/team/team.query.test.ts.)
      expect(body.summary.active ?? 0).toBe(0);
      expect(body.summary.overdue ?? 0).toBe(0);
    },
  );

  it('tells a Project Manager who joined no project about nobody at all', async () => {
    const g = await graph();
    const lone = await f.user({ role: 'project_manager', name: `${g.mk} Lone` });
    const body = await listAs(lone, g.mk);
    expect(names(body)).toEqual([]);
    expect(body.summary).toEqual({ people: 0, projects: 0 });
    expect(JSON.stringify(body)).not.toContain('load');
  });

  it('shows the manager of X only the work done in X, flagged as also elsewhere (G2)', async () => {
    const g = await graph();
    const body = await listAs(g.eka, g.mk);
    expect(row(body, g.budi).load).toEqual({ active: 3, overdue: 1, alsoElsewhere: true });
    // The flag carries no number: Y's extra task must not be countable from this body.
    expect(JSON.stringify(row(body, g.budi))).not.toContain('"active":4');
    expect(body.summary).toMatchObject({ active: 3, overdue: 1 });
  });

  it('shows an Admin every project’s numbers, with no also-elsewhere flag (G3)', async () => {
    const g = await graph();
    const admin = await f.user({ role: 'admin', name: `${g.mk} Zadmin` });
    expect(row(await listAs(admin, g.mk), g.budi).load).toEqual({ active: 4, overdue: 1 });
  });

  it('always shows the caller their own numbers, across every project (G3)', async () => {
    const g = await graph();
    const body = await listAs(g.budi, g.mk);
    expect(row(body, g.budi)).toMatchObject({ isSelf: true, load: { active: 4, overdue: 1 } });
  });

  it('counts a colleague with no task as zero rather than dropping the key', async () => {
    const g = await graph();
    expect(row(await listAs(g.eka, g.mk), g.awan).load).toEqual({ active: 0, overdue: 0 });
  });

  it('narrows the manager’s numbers to the project the list is filtered to', async () => {
    const g = await graph();
    const body = await listAs(g.eka, g.mk, `&projectId=${g.x.id}`);
    expect(row(body, g.budi).load).toEqual({ active: 3, overdue: 1, alsoElsewhere: true });
    expect(names(body).sort()).toEqual(inX(g.mk));
  });
});

describe('list shape', () => {
  it('returns summary, people and total with exactly the documented keys', async () => {
    const g = await graph();
    const body = await listAs(g.awan, g.mk);
    expect(Object.keys(body).sort()).toEqual(['people', 'summary', 'total']);
    expect(Object.keys(body.summary).sort()).toEqual(['active', 'overdue', 'people', 'projects']);
    expect(body.summary).toMatchObject({ people: 5, projects: 1 });
    expect(body.total).toBe(5);
    expect(Object.keys(row(body, g.budi)).sort()).toEqual([
      'id',
      'image',
      'isSelf',
      'jobTitle',
      'name',
      'projects',
    ]);
    // Budi is in Y too, but a Member of X may not be told that project exists.
    expect(row(body, g.budi).projects).toEqual([{ id: g.x.id, name: `${g.mk} X`, role: 'member' }]);
  });

  it('puts the caller first, then A-Z', async () => {
    const g = await graph();
    expect(names(await listAs(g.cahya, g.mk))).toEqual([
      `${g.mk} Cahya`,
      `${g.mk} Awan`,
      `${g.mk} Budi`,
      `${g.mk} Dedi`,
      `${g.mk} Eka`,
    ]);
  });

  it('pages with limit and offset while keeping the full total', async () => {
    const g = await graph();
    const page = await listAs(g.awan, g.mk, '&limit=2&offset=1');
    expect([page.people.length, page.total]).toEqual([2, 5]);
    expect(names(page)).toEqual([`${g.mk} Budi`, `${g.mk} Cahya`]);
  });

  it('accepts a limit above the maximum and clamps it instead of refusing', async () => {
    const g = await graph();
    const body = await listAs(g.awan, g.mk, `&limit=${TEAM_LIMIT_MAX + 50}`);
    expect(names(body).sort()).toEqual(inX(g.mk));
  });

  it('answers the same 404 for a project the caller does not follow as for one that is gone', async () => {
    const g = await graph();
    auth.as(g.awan);
    const hidden = await call('GET', `${BASE}?projectId=${g.y.id}`);
    const missing = await call('GET', `${BASE}?projectId=does-not-exist`);
    expectApiError(hidden, 404, 'NOT_FOUND');
    expectApiError(missing, 404, 'NOT_FOUND');
    expect(hidden.body.error).toBe(missing.body.error);
  });

  it.each([
    ['a non-numeric limit', 'limit=abc'],
    ['limit 0', 'limit=0'],
    ['a negative offset', 'offset=-1'],
    ['an unknown sort', 'sort=name_desc'],
    ['an over-long q', `q=${'x'.repeat(TEAM_SEARCH_MAX + 1)}`],
  ])('rejects %s with the uniform 422', async (_label, query) => {
    const g = await graph();
    auth.as(g.awan);
    expectApiError(await call('GET', `${BASE}?${query}`), 422, 'VALIDATION');
  });
});

describe('sort=overdue', () => {
  it('refuses the sort for a Member with 422 SORT_NOT_ALLOWED', async () => {
    const g = await graph();
    auth.as(g.awan);
    const res = await call('GET', `${BASE}?q=${g.mk}&sort=overdue`);
    expectApiError(res, 422, 'SORT_NOT_ALLOWED');
    expect(res.body.error).toBe('Pengurutan ini hanya untuk Pengelola dan Admin.');
    // A refusal, not a quiet fall back to the name order: no row escapes in the body.
    expect(res.body.people).toBeUndefined();
  });

  it('refuses it for a Project Manager who manages no project in view', async () => {
    const g = await graph();
    auth.as(g.dedi);
    expectApiError(
      await call('GET', `${BASE}?q=${g.mk}&projectId=${g.x.id}&sort=overdue`),
      422,
      'SORT_NOT_ALLOWED',
    );
  });

  it('allows it for the manager of the project and puts the most overdue first', async () => {
    const g = await graph();
    expect(names(await listAs(g.eka, g.mk, '&sort=overdue'))[0]).toBe(`${g.mk} Budi`);
  });

  it('allows it for an Admin who manages nothing', async () => {
    const g = await graph();
    const admin = await f.user({ role: 'admin', name: `${g.mk} Zadmin` });
    expect(names(await listAs(admin, g.mk, '&sort=overdue'))[0]).toBe(`${g.mk} Budi`);
  });

  it('accepts sort=name from anyone', async () => {
    const g = await graph();
    expect(names(await listAs(g.awan, g.mk, '&sort=name'))[0]).toBe(`${g.mk} Awan`);
  });
});

describe('route precedence and API keys', () => {
  it('still answers /team/picker with the picker, not the person detail', async () => {
    const g = await graph();
    auth.as(g.eka);
    const res = await call('GET', `${BASE}/picker?q=${g.mk}&projectId=${g.x.id}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.person).toBeUndefined();
  });

  /** Sends a GET as an API key identity, the way the key plugin injects it (no session). */
  async function callAsKey(path: string, owner: TestUser, scopes: Scope[]): Promise<Json> {
    const request = new Request(`http://localhost/api${path}`, { method: 'GET' });
    setApiKeyIdentity(request, {
      keyId: 'team-key',
      keyName: null,
      scopes,
      user: { id: owner.id, email: owner.email, name: owner.name },
      role: owner.role,
      startedAt: Date.now(),
    });
    const res = await api.handle(request);
    return { status: res.status, body: await res.json() };
  }

  it('lets a key with app:read read the list, under its owner’s own visibility', async () => {
    const g = await graph();
    const res = await callAsKey(`${BASE}?q=${g.mk}`, g.awan, ['app:read']);
    expect(res.status).toBe(200);
    expect(res.body.people.map((p: Json) => p.name).sort()).toEqual(inX(g.mk));
    const budi = res.body.people.find((p: Json) => p.id === g.budi.id);
    for (const key of LOAD_KEYS) expect(JSON.stringify(budi)).not.toContain(key);
  });
});
