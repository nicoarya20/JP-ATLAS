/**
 * Leave status in the Team reads: one extra statement per list, whatever the number of people
 * (no N+1), also for a load sort that scans a wider window than the page it returns.
 */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { db } from '../../server/db';
import { leaveRequest } from '../../server/db/schema';
import { toPrincipal } from '../../server/project/membership.query';
import type { ListTeamOk, ListTeamResult } from '../../server/team/team.dto';
import { isRefused } from '../../server/team/team.dto';
import { getPerson } from '../../server/team/team.person.query';
import { listTeam } from '../../server/team/team.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'teamavq' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const NOW = ATLAS_NOW; // 2026-10-07 in the team zone
const principal = (u: TestUser) => toPrincipal({ user: u, role: u.role });
const leaveStatements = (queries: readonly string[]) =>
  queries.filter((q) => q.includes('"leave_request"'));

function ok(r: ListTeamResult): ListTeamOk {
  if (isRefused(r)) throw new Error(`refused with ${r.code}`);
  return r;
}

/** A manager and `people` Members, every second one on approved leave. */
async function team(people: number) {
  const mk = `m${crypto.randomUUID().slice(0, 8)}`;
  const boss = await f.user({ role: 'project_manager', name: `${mk} Boss` });
  const mates: TestUser[] = [];
  for (let i = 0; i < people; i++) mates.push(await f.user({ name: `${mk} P${i}` }));
  await f.project({
    lead: boss,
    members: mates.map((m) => [m, 'member'] as const),
    name: `${mk} P`,
  });
  const away = mates.filter((_, i) => i % 2 === 0);
  if (away.length > 0) {
    await db.insert(leaveRequest).values(
      away.map((m) => ({
        userId: m.id,
        startDate: '2026-10-06',
        endDate: '2026-10-09',
        status: 'approved' as const,
      })),
    );
  }
  return { mk, boss, mates, away };
}

describe('listTeam leave statement', () => {
  it.each([undefined, 'active'] as const)(
    'adds exactly one statement for 3 and for 40 people (sort=%s)',
    async (sort) => {
      const counts: number[] = [];
      for (const size of [3, 40]) {
        const t = await team(size);
        const { exec, queries } = countQueries();
        const r = ok(await listTeam(principal(t.boss), { q: t.mk, sort, limit: 50 }, NOW, exec));
        expect(r.people).toHaveLength(size + 1);
        const onLeave = r.people.filter((x) => x.availability?.kind === 'on_leave');
        expect(onLeave.map((x) => x.id).sort()).toEqual(t.away.map((x) => x.id).sort());
        expect(leaveStatements(queries)).toHaveLength(1);
        counts.push(queries.length);
      }
      expect(counts[0]).toBeLessThanOrEqual(5);
      expect(counts[1]).toBe(counts[0]);
    },
  );
});

describe('getPerson leave statement', () => {
  it('adds exactly one statement and returns the status', async () => {
    const t = await team(2);
    const [mate] = t.away;
    if (!mate) throw new Error('no one on leave in the fixture');
    const { exec, queries } = countQueries();
    const r = await getPerson(principal(t.boss), mate.id, NOW, exec);
    if (isRefused(r)) throw new Error(`refused with ${r.code}`);
    expect(r.availability).toEqual({ kind: 'on_leave', until: '2026-10-09' });
    expect(leaveStatements(queries)).toHaveLength(1);
    expect(queries.length).toBeLessThanOrEqual(4);
  });
});
