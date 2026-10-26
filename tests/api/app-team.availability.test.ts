/**
 * `availability` on `GET /api/app/team` and `GET /api/app/team/:userId` (Cuti in the Team menu):
 * a recorded leave under way is shown to everybody, and a leave that is over or has not started
 * shows nothing. Since P14 there is no waiting state and so no per-viewer rule left (D2/D3), and
 * the Admin-only note never appears here (D6). Asserted on the raw response bodies; the list and
 * the detail must agree.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { db } from '../../server/db';
import { leavePeriod } from '../../server/db/schema';
import { call, type Json, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW, freezeAt } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'teamavail' });
beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
  freezeAt(ATLAS_NOW); // today is 2026-10-07 in the team zone
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const BASE = '/app/team';
const marker = () => `m${crypto.randomUUID().slice(0, 8)}`;

const leave = (u: TestUser, startDate: string, endDate: string, note: string | null = null) =>
  db.insert(leavePeriod).values({ userId: u.id, startDate, endDate, note });

/** One project of Eka (Pengelola, Project Manager) holding a Member per leave state. */
async function world() {
  const mk = marker();
  const eka = await f.user({ role: 'project_manager', name: `${mk} Eka` });
  const admin = await f.user({ role: 'admin', name: `${mk} Admin` });
  const mate = await f.user({ name: `${mk} Mate` });
  const onLeave = await f.user({ name: `${mk} OnLeave` });
  const over = await f.user({ name: `${mk} Over` });
  const future = await f.user({ name: `${mk} Future` });
  const everyone = [mate, onLeave, over, future];
  await f.project({ lead: eka, members: everyone.map((u) => [u, 'member'] as const), name: mk });
  // The note is Admin-only (D6); it is seeded precisely so the Team response can be shown not to carry it.
  await leave(onLeave, '2026-10-05', '2026-10-16', 'umroh');
  await leave(over, '2026-09-20', '2026-09-25');
  await leave(future, '2026-10-12', '2026-10-14');
  return { mk, eka, admin, mate, onLeave, over, future };
}
type World = Awaited<ReturnType<typeof world>>;

/** The `availability` of `target` as the list shows it to `who`. */
async function inList(who: TestUser, w: World, target: TestUser): Promise<unknown> {
  auth.as(who);
  const res = await call('GET', `${BASE}?q=${w.mk}&limit=50`);
  expect(res.status).toBe(200);
  const row = (res.body.people as Json[]).find((p) => p.id === target.id);
  expect(row).toBeDefined();
  expect('availability' in (row as Json)).toBe(true);
  return (row as Json).availability;
}

/** The `availability` of `target` as the detail page shows it to `who`. */
async function inDetail(who: TestUser, target: TestUser): Promise<unknown> {
  auth.as(who);
  const res = await call('GET', `${BASE}/${target.id}`);
  expect(res.status).toBe(200);
  expect('availability' in res.body).toBe(true);
  return res.body.availability;
}

const surfaces = [
  ['list', (who: TestUser, w: World, t: TestUser) => inList(who, w, t)],
  ['detail', (who: TestUser, _w: World, t: TestUser) => inDetail(who, t)],
] as const;

describe.each(surfaces)('availability in the %s', (_name, read) => {
  it('shows an approved leave under way, up to its last day, to a plain Member', async () => {
    const w = await world();
    expect(await read(w.mate, w, w.onLeave)).toEqual({ kind: 'on_leave', until: '2026-10-16' });
  });

  it('shows it to a Project Manager and an Admin as well', async () => {
    const w = await world();
    const want = { kind: 'on_leave', until: '2026-10-16' };
    expect(await read(w.eka, w, w.onLeave)).toEqual(want);
    expect(await read(w.admin, w, w.onLeave)).toEqual(want);
  });

  it('is null once the leave is over', async () => {
    const w = await world();
    expect(await read(w.eka, w, w.over)).toBeNull();
  });

  it('is null while the leave has not started', async () => {
    const w = await world();
    expect(await read(w.eka, w, w.future)).toBeNull();
  });

  it('is null for somebody with no recorded leave', async () => {
    const w = await world();
    expect(await read(w.eka, w, w.mate)).toBeNull();
  });

  it('never carries the Admin-only note (P14 D6)', async () => {
    const w = await world();
    const a = await read(w.mate, w, w.onLeave);
    expect(Object.keys(a as object).sort()).toEqual(['kind', 'until']);
    expect(JSON.stringify(a)).not.toInclude('umroh');
  });
});

describe('availability leaves the rest of the Team response alone', () => {
  it('keeps the old keys and the total, and only adds availability', async () => {
    const w = await world();
    auth.as(w.mate);
    const res = await call('GET', `${BASE}?q=${w.mk}&limit=50`);
    expect(res.body.total).toBe(5); // the four Members and Eka
    const other = (res.body.people as Json[]).find((p) => p.id === w.onLeave.id) as Json;
    expect(Object.keys(other).sort()).toEqual(
      ['availability', 'id', 'image', 'isSelf', 'jobTitle', 'name', 'projects'].sort(),
    );
  });
});
