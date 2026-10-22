/**
 * `availability` on `GET /api/app/team` and `GET /api/app/team/:userId` (Cuti in the Team menu):
 * an approved leave under way is shown to everybody, a pending request only to its owner, Project
 * Managers and Admin, and a leave that is over, not started, rejected or canceled shows nothing.
 * Asserted on the raw response bodies; the list and the detail must agree.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { db } from '../../server/db';
import { leaveRequest } from '../../server/db/schema';
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

type Status = 'pending' | 'approved' | 'rejected' | 'canceled';
const leave = (u: TestUser, startDate: string, endDate: string, status: Status) =>
  db.insert(leaveRequest).values({ userId: u.id, startDate, endDate, status });

/** One project of Eka (Pengelola, Project Manager) holding a Member per leave state. */
async function world() {
  const mk = marker();
  const eka = await f.user({ role: 'project_manager', name: `${mk} Eka` });
  const admin = await f.user({ role: 'admin', name: `${mk} Admin` });
  const mate = await f.user({ name: `${mk} Mate` });
  const onLeave = await f.user({ name: `${mk} OnLeave` });
  const over = await f.user({ name: `${mk} Over` });
  const future = await f.user({ name: `${mk} Future` });
  const pending = await f.user({ name: `${mk} Pending` });
  const rejected = await f.user({ name: `${mk} Rejected` });
  const canceled = await f.user({ name: `${mk} Canceled` });
  const everyone = [mate, onLeave, over, future, pending, rejected, canceled];
  await f.project({ lead: eka, members: everyone.map((u) => [u, 'member'] as const), name: mk });
  await leave(onLeave, '2026-10-05', '2026-10-16', 'approved');
  await leave(over, '2026-09-20', '2026-09-25', 'approved');
  await leave(future, '2026-10-12', '2026-10-14', 'approved');
  await leave(pending, '2026-10-14', '2026-10-16', 'pending');
  await leave(rejected, '2026-10-07', '2026-10-09', 'rejected');
  await leave(canceled, '2026-10-07', '2026-10-09', 'canceled');
  return { mk, eka, admin, mate, onLeave, over, future, pending, rejected, canceled };
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

  it('shows a pending request to its owner, a Project Manager and an Admin', async () => {
    const w = await world();
    const want = { kind: 'pending', from: '2026-10-14', to: '2026-10-16' };
    expect(await read(w.pending, w, w.pending)).toEqual(want);
    expect(await read(w.eka, w, w.pending)).toEqual(want);
    expect(await read(w.admin, w, w.pending)).toEqual(want);
  });

  it('shows a pending request to no other Member', async () => {
    const w = await world();
    expect(await read(w.mate, w, w.pending)).toBeNull();
  });

  it('is null for a rejected and for a canceled request, whoever asks', async () => {
    const w = await world();
    for (const who of [w.eka, w.admin, w.rejected, w.canceled]) {
      expect(await read(who, w, w.rejected)).toBeNull();
      expect(await read(who, w, w.canceled)).toBeNull();
    }
  });

  it('is null for somebody who never asked for leave', async () => {
    const w = await world();
    expect(await read(w.eka, w, w.mate)).toBeNull();
  });
});

describe('availability leaves the rest of the Team response alone', () => {
  it('keeps the old keys and the total, and only adds availability', async () => {
    const w = await world();
    auth.as(w.mate);
    const res = await call('GET', `${BASE}?q=${w.mk}&limit=50`);
    expect(res.body.total).toBe(8); // the seven Members and Eka
    const other = (res.body.people as Json[]).find((p) => p.id === w.onLeave.id) as Json;
    expect(Object.keys(other).sort()).toEqual(
      ['availability', 'id', 'image', 'isSelf', 'jobTitle', 'name', 'projects'].sort(),
    );
  });
});
