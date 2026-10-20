/**
 * `sort=active` and `sort=overdue` rank the whole filtered team, not the page on screen (S6 tim-a,
 * closes H-D8-2): paging through the sorted list yields one global order with nobody twice and
 * nobody missing, people without visible numbers come last, and the statement count stays flat.
 */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { db } from '../../server/db';
import { user } from '../../server/db/schema';
import { toPrincipal } from '../../server/project/membership.query';
import { isRefused, type ListTeamOk, type ListTeamResult } from '../../server/team/team.dto';
import { listTeam } from '../../server/team/team.query';
import { TEAM_SORT_SCAN_LIMIT } from '../../server/team/team.sort';
import { testUser } from '../support/accounts';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'teamsort' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const NOW = ATLAS_NOW; // 2026-10-07 in the team zone
const PAST = '2026-10-01'; // before today: overdue
const LATER = '2026-12-01'; // after today: open but not late
const MATES = 30;
const PAGE = 10;
const principal = (u: TestUser) => toPrincipal({ user: u, role: u.role });
const marker = () => `m${crypto.randomUUID().slice(0, 8)}`;
const pad = (i: number) => String(i).padStart(2, '0');

function ok(r: ListTeamResult): ListTeamOk {
  if (isRefused(r)) throw new Error(`refused with ${r.code}`);
  return r;
}

/**
 * `boss` manages P1, which holds MATES people with `i % 7` open tasks, `min(i % 4, i % 7)` of them
 * overdue. In P2 `boss` is only a member, so P2's two people (`hidA`, `hidB`, both busy) are
 * listed but their numbers are out of scope for him: they have no `load` at all.
 */
async function team() {
  const mk = marker();
  const boss = await f.user({ role: 'project_manager', name: `${mk} Boss` });
  const lead2 = await f.user({ role: 'project_manager', name: `${mk} Lead2` });
  const hidA = await f.user({ name: `${mk} HidA` });
  const hidB = await f.user({ name: `${mk} HidB` });
  const mates: TestUser[] = [];
  for (let i = 0; i < MATES; i++) mates.push(await f.user({ name: `${mk} P${pad(i)}` }));
  const p1 = await f.project({
    lead: boss,
    members: mates.map((m) => [m, 'member'] as const),
    name: `${mk} P1`,
  });
  const p2 = await f.project({
    lead: lead2,
    members: [
      [boss, 'member'],
      [hidA, 'member'],
      [hidB, 'member'],
    ],
    name: `${mk} P2`,
  });
  const active = new Map<string, number>();
  const overdue = new Map<string, number>();
  for (const [i, m] of mates.entries()) {
    const open = i % 7;
    const late = Math.min(i % 4, open);
    active.set(m.name, open);
    overdue.set(m.name, late);
    for (let k = 0; k < open; k++)
      await f.task({ project: p1, assignee: m, status: 'todo', due: k < late ? PAST : LATER });
  }
  for (const h of [hidA, hidB])
    for (let k = 0; k < 5; k++)
      await f.task({ project: p2, assignee: h, status: 'todo', due: PAST });
  return { mk, boss, hidA, hidB, lead2, mates, active, overdue };
}

/** What the global order must be, computed from the known counts and not from the code under test. */
function expected(g: Awaited<ReturnType<typeof team>>, counts: Map<string, number>): string[] {
  const seen = (n: string) => counts.get(n) ?? 0;
  const scoped = [...g.mates.map((m) => m.name), g.boss.name].sort(
    (a, b) => seen(b) - seen(a) || a.localeCompare(b),
  );
  // Out of scope for the boss: no numbers, so after everyone with a number, by name.
  return [...scoped, g.hidA.name, g.hidB.name, g.lead2.name].sort((a, b) => {
    const blind = (n: string) => [g.hidA.name, g.hidB.name, g.lead2.name].includes(n);
    return Number(blind(a)) - Number(blind(b)) || scoped.indexOf(a) - scoped.indexOf(b);
  });
}

async function pages(g: Awaited<ReturnType<typeof team>>, sort: 'active' | 'overdue') {
  const out: string[] = [];
  let total = -1;
  for (let offset = 0; offset < MATES + 4; offset += PAGE) {
    const r = ok(await listTeam(principal(g.boss), { q: g.mk, sort, limit: PAGE, offset }, NOW));
    out.push(...r.people.map((x) => x.name));
    total = r.total;
  }
  return { out, total };
}

describe('listTeam sort=active', () => {
  it('orders the whole team across pages, with ties by name and blind rows last', async () => {
    const g = await team();
    const { out, total } = await pages(g, 'active');
    expect(total).toBe(MATES + 4);
    expect(out).toEqual(expected(g, g.active));
    expect(new Set(out).size).toBe(out.length);
  });

  it('puts people without visible numbers after a real zero, not among the zeros', async () => {
    const g = await team();
    const r = ok(await listTeam(principal(g.boss), { q: g.mk, sort: 'active', limit: 50 }, NOW));
    const loads = r.people.map((x) => x.load?.active);
    const firstBlind = loads.indexOf(undefined);
    expect(firstBlind).toBe(MATES + 1);
    expect(loads.slice(firstBlind).every((v) => v === undefined)).toBe(true);
    expect(loads.slice(0, firstBlind).at(-1)).toBe(0);
  });
});

describe('listTeam sort=overdue', () => {
  it('orders the whole team across pages, not just the page on screen', async () => {
    const g = await team();
    const { out, total } = await pages(g, 'overdue');
    expect(total).toBe(MATES + 4);
    expect(out).toEqual(expected(g, g.overdue));
    // The name order would put P00 first; the global order opens with the most overdue (3).
    expect(g.overdue.get(out[0] ?? '')).toBe(3);
  });
});

describe('listTeam load sorts: limits', () => {
  it('keeps the statement count flat from 4 to 41 people', async () => {
    const counts: number[] = [];
    for (const size of [3, 40]) {
      const mk = marker();
      const boss = await f.user({ role: 'project_manager', name: `${mk} Boss` });
      const mates: TestUser[] = [];
      for (let i = 0; i < size; i++) mates.push(await f.user({ name: `${mk} P${i}` }));
      const p = await f.project({
        lead: boss,
        members: mates.map((m) => [m, 'member'] as const),
        name: `${mk} P`,
      });
      for (const m of mates) await f.task({ project: p, assignee: m, status: 'todo', due: PAST });
      const { exec, queries } = countQueries();
      const r = ok(
        await listTeam(principal(boss), { q: mk, sort: 'active', limit: 50 }, NOW, exec),
      );
      expect(r.people).toHaveLength(size + 1);
      counts.push(queries.length);
    }
    expect(counts[0]).toBeLessThanOrEqual(5);
    expect(counts[1]).toBe(counts[0]);
  });

  it('refuses a Member and a manager-less Project Manager before reading anyone', async () => {
    const g = await team();
    const { exec, queries } = countQueries();
    for (const sort of ['active', 'overdue'] as const) {
      const r = await listTeam(principal(g.mates[0] as TestUser), { q: g.mk, sort }, NOW, exec);
      expect(isRefused(r) && r.code).toBe('SORT_NOT_ALLOWED');
    }
    // Only the caller's context was read; no person row, role or count.
    expect(queries).toHaveLength(2);
  });

  it('ranks the first TEAM_SORT_SCAN_LIMIT people by name and still reports the true total', async () => {
    const mk = marker();
    const boss = await f.user({ role: 'project_manager', name: `${mk} Boss` });
    const extra = TEAM_SORT_SCAN_LIMIT + 5;
    const rows = Array.from({ length: extra }, (_, i) =>
      testUser({ id: `teamsort-${mk}-${pad(i)}`, name: `${mk} Q${String(i).padStart(3, '0')}` }),
    );
    for (const r of rows) cleaner.track('user', r.id);
    await db.insert(user).values(rows);
    const members = rows.map((r) => [{ id: r.id } as TestUser, 'member'] as const);
    await f.project({ lead: boss, members, name: `${mk} Big` });
    const first = ok(await listTeam(principal(boss), { q: mk, sort: 'active', limit: 50 }, NOW));
    expect(first.total).toBe(extra + 1);
    const beyond = ok(
      await listTeam(
        principal(boss),
        { q: mk, sort: 'active', limit: 50, offset: TEAM_SORT_SCAN_LIMIT },
        NOW,
      ),
    );
    expect(beyond.people).toEqual([]);
    expect(beyond.total).toBe(extra + 1);
  });
});
