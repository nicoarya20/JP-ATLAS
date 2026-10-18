/**
 * Team person detail (S6 M02): who may open whose page, which contact field reaches whom, and the
 * open work a viewer is allowed to see. A person the caller shares no project with must look
 * missing, not forbidden (D8).
 */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { toPrincipal } from '../../server/project/membership.query';
import { ATLAS_REFERENCE_DATE } from '../../server/seed/atlas.data';
import type { GetPersonResult, ListTeamResult, Refused } from '../../server/team/team.dto';
import { isRefused } from '../../server/team/team.dto';
import { getPerson } from '../../server/team/team.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import { createFactory } from '../support/factory.task';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'teamperson' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const NOW = ATLAS_NOW; // Wednesday 2026-10-07 in the team zone
const TODAY = ATLAS_REFERENCE_DATE;
const principal = (u: { id: string; role: string }) =>
  toPrincipal({ user: u, role: u.role as never });
const marker = () => `m${crypto.randomUUID().slice(0, 8)}`;

/** The success branch has no `ok` key (it is the response body), so a refusal is the narrow case. */
function ok<T extends ListTeamResult | GetPersonResult>(r: T): Exclude<T, Refused> {
  if (isRefused(r)) throw new Error(`refused with ${r.code}`);
  return r as Exclude<T, Refused>;
}
const refusal = (r: ListTeamResult | GetPersonResult) => (isRefused(r) ? r.code : 'allowed');

describe('getPerson query budget', () => {
  it('keeps the person detail inside three statements', async () => {
    const mk = marker();
    const boss = await f.user({ role: 'project_manager', name: `${mk} Boss` });
    const mate = await f.user({ name: `${mk} Mate` });
    const p = await f.project({ lead: boss, members: [[mate, 'member']], name: `${mk} P` });
    await f.task({ project: p, assignee: mate, status: 'todo', due: TODAY });
    const { exec, queries } = countQueries();
    await getPerson(principal(boss), mate.id, NOW, exec);
    expect(queries.length).toBeLessThanOrEqual(3);
  });
});

describe('getPerson', () => {
  async function pair() {
    const mk = marker();
    const boss = await f.user({ role: 'project_manager', name: `${mk} Boss` });
    const mate = await f.user({ name: `${mk} Mate` });
    const stranger = await f.user({ name: `${mk} Stranger` });
    const p = await f.project({ lead: boss, members: [[mate, 'member']], name: `${mk} P` });
    await f.task({ project: p, assignee: mate, status: 'todo', due: '2026-10-01' });
    await f.task({ project: p, assignee: mate, status: 'todo', due: TODAY });
    await f.task({ project: p, assignee: mate, status: 'done', due: '2026-10-01' });
    return { mk, boss, mate, stranger, p };
  }

  it('gives a manager the shared projects, the open tasks and the load', async () => {
    const { boss, mate, p } = await pair();
    const r = ok(await getPerson(principal(boss), mate.id, NOW));
    expect(r.projects.map((x) => x.id)).toEqual([p.id]);
    expect(r.tasksVisible).toBe(true);
    expect(r.load).toEqual({ active: 2, overdue: 1 });
    expect(r.tasks).toHaveLength(2);
    expect(r.tasks?.[0]?.dueDate).toBe('2026-10-01'); // overdue first
    expect(r.tasks?.every((t) => t.status !== 'done')).toBe(true);
  });

  it('answers NOT_FOUND for someone who shares no project, never 403', async () => {
    const { mate, stranger } = await pair();
    expect(refusal(await getPerson(principal(mate), stranger.id, NOW))).toBe('NOT_FOUND');
    expect(refusal(await getPerson(principal(mate), 'tidak-ada', NOW))).toBe('NOT_FOUND');
  });

  it('shows a colleague the profile without tasks or load', async () => {
    const { mk, boss, mate } = await pair();
    const peer = await f.user({ name: `${mk} Peer` });
    await f.project({
      lead: boss,
      members: [
        [peer, 'member'],
        [mate, 'member'],
      ],
      name: `${mk} Q`,
    });
    const r = ok(await getPerson(principal(peer), mate.id, NOW));
    expect(r.tasksVisible).toBe(false);
    expect(r.tasks).toBeUndefined();
    expect(r.load).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain('"load"');
  });

  it('keeps the phone number for the person themselves and Admin only', async () => {
    const { mk, boss, mate } = await pair();
    const admin = await f.user({ role: 'admin', name: `${mk} Zadmin` });
    expect('phone' in ok(await getPerson(principal(boss), mate.id, NOW)).person).toBe(false);
    expect('phone' in ok(await getPerson(principal(admin), mate.id, NOW)).person).toBe(true);
    expect('phone' in ok(await getPerson(principal(mate), mate.id, NOW)).person).toBe(true);
  });

  it('lets a person see their own work even with no membership anywhere', async () => {
    const lone = await f.user({ name: `${marker()} Lone` });
    const r = ok(await getPerson(principal(lone), lone.id, NOW));
    expect(r.projects).toEqual([]);
    expect(r.tasksVisible).toBe(true);
    expect(r.load).toEqual({ active: 0, overdue: 0 });
  });

  it('hides a banned account from a colleague but not from an Admin', async () => {
    const { mk, boss, mate } = await pair();
    const admin = await f.user({ role: 'admin', name: `${mk} Zadmin` });
    const banned = await f.user({ banned: true, name: `${mk} Banned` });
    await f.project({
      lead: boss,
      members: [
        [banned, 'member'],
        [mate, 'member'],
      ],
      name: `${mk} R`,
    });
    expect(refusal(await getPerson(principal(mate), banned.id, NOW))).toBe('NOT_FOUND');
    expect(ok(await getPerson(principal(admin), banned.id, NOW)).person.id).toBe(banned.id);
  });

  it('flags work outside the manager scope without revealing its size', async () => {
    const { mk, boss, mate } = await pair();
    const otherBoss = await f.user({ role: 'project_manager', name: `${mk} Other` });
    const away = await f.project({
      lead: otherBoss,
      members: [[mate, 'member']],
      name: `${mk} Away`,
    });
    await f.task({ project: away, assignee: mate, status: 'todo', due: '2026-10-01' });
    const r = ok(await getPerson(principal(boss), mate.id, NOW));
    expect(r.alsoElsewhere).toBe(true);
    expect(r.load).toEqual({ active: 2, overdue: 1, alsoElsewhere: true });
    expect(r.tasks?.every((t) => t.projectId !== away.id)).toBe(true);
  });
});
