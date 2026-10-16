/** Who sees which tasks (S2-02): SQL against the in-memory oracle for eight personas, hidden projects, counts and reviewer pools. */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { matchesProjectScope, projectListScope } from '../../server/access/project.policy';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { project, projectMember, task } from '../../server/db/schema';
import { SCHEDULE_GROUPS, scheduleGroupOf } from '../../server/metrics/schedule';
import { TASK_STATUSES } from '../../server/pm/enums';
import { loadReviewerPool } from '../../server/project/membership.query';
import { addDays } from '../../server/seed/atlas.data';
import type { ListTasksInput } from '../../server/task/task.dto';
import { loadReviewerPools } from '../../server/task/task.lookup.query';
import { countTasks, listTasks } from '../../server/task/task.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tvis' });
afterAll(() => cleaner.flushAll());

const TODAY = '2026-10-07'; // a Wednesday
const clock = { now: ATLAS_NOW, today: TODAY };
const principal = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });

async function allIds(p: Principal, input: ListTasksInput = { scope: 'all' }) {
  const ids: string[] = [];
  let cursor: string | undefined;
  do {
    const res = await listTasks(p, { ...input, limit: 100, ...(cursor ? { cursor } : {}) }, clock);
    if (!res.ok) throw new Error(`list refused with ${res.code}`);
    ids.push(...res.items.map((i) => i.id));
    cursor = res.nextCursor ?? undefined;
  } while (cursor);
  return ids;
}

describe('visibility parity: SQL list against matchesProjectScope', () => {
  const PER_PROJECT = 12;
  let people: Record<string, TestUser>;
  let projectIds: string[];
  let trashedIds: Set<string>;

  beforeAll(async () => {
    const mk = (role: TestUser['role']) => cleaner.shared(() => f.user({ role }));
    people = {
      manager: await mk('member'),
      member: await mk('member'),
      viewer: await mk('member'),
      outsider: await mk('member'),
      pmManager: await mk('project_manager'),
      pmOutsider: await mk('project_manager'),
      admin: await mk('admin'),
      superAdmin: await mk('super-admin'),
    };
    const { manager, member, viewer, pmManager } = people as Record<string, TestUser>;
    const [p1, p2, p3, p4] = await cleaner.shared(async () => [
      await f.project({
        lead: manager as TestUser,
        members: [
          [member as TestUser, 'member'],
          [viewer as TestUser, 'viewer'],
        ],
      }),
      await f.project({ lead: pmManager as TestUser, members: [[member as TestUser, 'viewer']] }),
      await f.project({ lead: member as TestUser }),
      await f.project({ lead: manager as TestUser }), // trashed below
    ]);
    const projects = [p1, p2, p3, p4].map((p) => p as NonNullable<typeof p1>);
    for (const p of projects) {
      await cleaner.shared(() =>
        f.tasks(p, PER_PROJECT, (i) => ({ assignee: i % 2 ? member : manager, creator: manager })),
      );
    }
    const [one] = await cleaner.shared(() =>
      f.tasks(projects[0] as NonNullable<typeof p1>, 1, () => ({ deletedAt: new Date() })),
    );
    await db
      .update(project)
      .set({ deletedAt: new Date() })
      .where(eq(project.id, (p4 as NonNullable<typeof p4>).id));
    projectIds = projects.map((p) => p.id);
    trashedIds = new Set([(one as NonNullable<typeof one>).id]);
  });

  const EXPECTED_COUNT: Record<string, number> = {
    manager: PER_PROJECT, // P1 only (P4 is trashed)
    member: 3 * PER_PROJECT, // P1, P2 as a viewer, P3
    viewer: PER_PROJECT,
    outsider: 0,
    pmManager: 3 * PER_PROJECT, // reads every live project (P-A1), manages P2
    pmOutsider: 3 * PER_PROJECT,
    admin: 3 * PER_PROJECT,
    superAdmin: 3 * PER_PROJECT,
  };

  it.each(Object.keys(EXPECTED_COUNT))('%s: SQL result equals the oracle', async (persona) => {
    const p = principal((people as Record<string, TestUser>)[persona] as TestUser);
    const memberOf = (
      await db
        .select({ id: projectMember.projectId })
        .from(projectMember)
        .where(eq(projectMember.userId, p.id))
    ).map((r) => r.id);
    const rows = await db
      .select({ id: task.id, projectId: task.projectId, deletedAt: task.deletedAt })
      .from(task)
      .where(inArray(task.projectId, projectIds));
    const trashedProjects = new Set([projectIds[3]]);
    const oracle = rows
      .filter(
        (r) =>
          !r.deletedAt &&
          !trashedProjects.has(r.projectId) &&
          matchesProjectScope(projectListScope(p), r.projectId, memberOf),
      )
      .map((r) => r.id)
      .sort();

    const mine = new Set(projectIds);
    const listed = (await allIds(p)).filter((id) =>
      rows.some((r) => r.id === id && mine.has(r.projectId)),
    );
    expect(listed.sort()).toEqual(oracle);
    expect(oracle).toHaveLength(EXPECTED_COUNT[persona] as number);
    for (const id of trashedIds) expect(listed).not.toContain(id);
  });

  it('answers a hidden project like one that does not exist', async () => {
    const outsider = principal((people as Record<string, TestUser>).outsider as TestUser);
    const hidden = await listTasks(
      outsider,
      { scope: 'project', projectId: projectIds[0] as string },
      clock,
    );
    const missing = await listTasks(outsider, { scope: 'project', projectId: 'tidak-ada' }, clock);
    expect(hidden).toEqual(missing);
  });

  it('lists nothing from a project in the Trash, even to its manager', async () => {
    const manager = principal((people as Record<string, TestUser>).manager as TestUser);
    expect(await allIds(manager, { scope: 'project', projectId: projectIds[3] as string })).toEqual(
      [],
    );
  });
});

describe('countTasks', () => {
  let me: TestUser;
  beforeAll(async () => {
    me = await cleaner.shared(() => f.user());
    const lead = await cleaner.shared(() => f.user({ role: 'project_manager' }));
    const [mine, foreign] = await cleaner.shared(async () => [
      await f.project({ lead, members: [[me, 'member']] }),
      await f.project({ lead }), // `me` is not a member: tasks assigned there stay hidden
    ]);
    const at = (days: number | null) => (days === null ? null : addDays(TODAY, days));
    // overdue x2, today, tomorrow, week, later x2, none x3, plus finished, canceled, trashed and hidden ones.
    const offsets = [-3, -1, 0, 1, 2, 5, 30, null, null, null];
    await cleaner.shared(async () => {
      await f.tasks(mine as NonNullable<typeof mine>, offsets.length, (i) => ({
        assignee: me,
        creator: lead,
        due: at(offsets[i] ?? null),
        status: i === 1 ? 'in_review' : 'todo',
      }));
      await f.task({
        project: mine as NonNullable<typeof mine>,
        assignee: me,
        status: 'done',
        due: at(-9),
      });
      await f.task({ project: mine as NonNullable<typeof mine>, assignee: me, status: 'canceled' });
      await f.task({
        project: mine as NonNullable<typeof mine>,
        assignee: me,
        deletedAt: new Date(),
      });
      await f.task({ project: foreign as NonNullable<typeof foreign>, assignee: me, due: at(0) });
    });
  });

  it('counts open tasks per schedule group and all live tasks per status', async () => {
    const counts = await countTasks(principal(me), clock);
    expect(counts.mine).toEqual({ overdue: 2, today: 1, tomorrow: 1, week: 1, later: 2, none: 3 });
    expect(counts.byStatus).toEqual({
      todo: 9,
      in_progress: 0,
      in_review: 1,
      done: 1,
      canceled: 1,
    });
  });

  it('equals the numbers derived from the "mine" list', async () => {
    const counts = await countTasks(principal(me), clock);
    const ids = new Set(await allIds(principal(me), { scope: 'mine' }));
    const rows = (await db.select().from(task).where(eq(task.assigneeId, me.id))).filter((r) =>
      ids.has(r.id),
    );
    for (const g of SCHEDULE_GROUPS) {
      expect(counts.mine[g]).toBe(rows.filter((r) => scheduleGroupOf(r, TODAY) === g).length);
    }
    for (const s of TASK_STATUSES)
      expect(counts.byStatus[s]).toBe(rows.filter((r) => r.status === s).length);
  });

  it('counts the same tasks the schedule filter lists', async () => {
    const counts = await countTasks(principal(me), clock);
    for (const due of SCHEDULE_GROUPS) {
      expect(await allIds(principal(me), { scope: 'mine', due })).toHaveLength(counts.mine[due]);
    }
  });

  it('is all zeros for someone with no tasks', async () => {
    const nobody = await f.user();
    const counts = await countTasks(principal(nobody), clock);
    expect(Object.values(counts.mine).every((n) => n === 0)).toBe(true);
    expect(Object.values(counts.byStatus).every((n) => n === 0)).toBe(true);
  });
});

describe('loadReviewerPools', () => {
  it('matches loadReviewerPool project by project, including banned and pending accounts', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const banned = await f.user({ role: 'project_manager', banned: true });
    const pending = await f.user({ role: 'member', status: 'pending' });
    const bannedAdmin = await f.user({ role: 'admin', banned: true });
    const a = await f.project({
      lead,
      members: [
        [banned, 'manager'],
        [pending, 'manager'],
      ],
    });
    const b = await f.project({ lead: bannedAdmin });
    const c = await f.project({ lead });
    const batch = await loadReviewerPools([a.id, b.id, c.id, a.id]);
    const mine = (ids: readonly string[]) => ids.filter((id) => id.startsWith(`${f.tag}-`)).sort();
    const norm = (pool: Awaited<ReturnType<typeof loadReviewerPool>>) => ({
      managers: [...pool.managers].sort((x, y) => x.userId.localeCompare(y.userId)),
      adminIds: mine(pool.adminIds),
    });
    for (const p of [a, b, c]) {
      expect(norm(batch.get(p.id) as Awaited<ReturnType<typeof loadReviewerPool>>)).toEqual(
        norm(await loadReviewerPool(p.id)),
      );
    }
    // Sanity: the inactive managers really are flagged, so the comparison above is not between two empty pools.
    const flags = new Map(batch.get(a.id)?.managers.map((m) => [m.userId, m.active]));
    expect(flags.get(banned.id)).toBe(false);
    expect(flags.get(pending.id)).toBe(false);
    expect(flags.get(lead.id)).toBe(true);
  });

  it('returns an empty map for no projects without a query', async () => {
    expect((await loadReviewerPools([])).size).toBe(0);
  });
});
