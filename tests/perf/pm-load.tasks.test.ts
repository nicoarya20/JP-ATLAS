/** Task read cost (S2-02): the query count of "Tugas saya" does not grow with the number of tasks, and the main query can use the partial index. */
import { afterAll, describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { Principal } from '../../server/access/types';
import { db, schema } from '../../server/db';
import { ACTIVE_STATUSES } from '../../server/metrics/task.metrics';
import { addDays } from '../../server/seed/atlas.data';
import { countTasks, listTasks } from '../../server/task/task.query';
import { getTaskDetail } from '../../server/task/task-detail.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tperf' });
afterAll(async () => {
  await cleaner.flushAll();
  // Hundreds of rows came and went: without a vacuum the leftover bloat and stale statistics can make
  // the planner pick another index in `tests/db/pm-indexes.test.ts` on the next run of a persistent test DB.
  await db.$client.unsafe('vacuum (analyze) task');
});

const TODAY = '2026-10-07';
const clock = { now: ATLAS_NOW, today: TODAY };
const QUERY_BUDGET = 6;
const SMALL = 50;
const PROJECTS = 3;
const LARGE = 500;
const principal = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });

/** A second Drizzle instance on the same connection that records each SQL statement it sends. */
function counting() {
  const log: { query: string; params: unknown[] }[] = [];
  const exec = drizzle(db.$client, {
    schema,
    logger: { logQuery: (query, params) => log.push({ query, params }) },
  });
  return { exec, log };
}

async function world() {
  const lead = await f.user({ role: 'project_manager' });
  const me = await f.user();
  const projects: TestProject[] = [];
  for (let i = 0; i < PROJECTS; i++)
    projects.push(await f.project({ lead, members: [[me, 'member']] }));
  const add = (n: number) =>
    Promise.all(
      projects.map((p) =>
        f.tasks(p, Math.ceil(n / PROJECTS), (i) => ({
          assignee: me,
          creator: lead,
          due: i % 4 === 0 ? null : addDays(TODAY, (i % 9) - 3),
          status: i % 5 === 0 ? 'in_progress' : 'todo',
        })),
      ),
    );
  return { me, lead, projects, add };
}

describe('task reads: constant query count', () => {
  it('"Tugas saya" takes the same, at most six, queries for 50 and for 500 tasks', async () => {
    const { me, add } = await world();
    const input = { scope: 'mine', status: [...ACTIVE_STATUSES], limit: 100 } as const;
    const measure = async () => {
      const { exec, log } = counting();
      const res = await listTasks(principal(me), input, clock, exec);
      if (!res.ok) throw new Error('list refused');
      return { queries: log.length, rows: res.items.length };
    };
    await add(SMALL);
    const small = await measure();
    await add(LARGE - SMALL);
    const large = await measure();

    expect(small.rows).toBe(Math.ceil(SMALL / PROJECTS) * PROJECTS);
    expect(large.rows).toBe(100);
    expect(small.queries).toBeLessThanOrEqual(QUERY_BUDGET);
    expect(large.queries).toBe(small.queries);
  });

  it('counts take one query and the detail takes at most six', async () => {
    const { me, add } = await world();
    const [first] = (await add(30)).flat();
    const a = counting();
    await countTasks(principal(me), clock, a.exec);
    expect(a.log).toHaveLength(1);
    const b = counting();
    const res = await getTaskDetail(principal(me), String(first?.number), clock, b.exec);
    expect(res.ok).toBe(true);
    expect(b.log.length).toBeLessThanOrEqual(QUERY_BUDGET);
  });

  it('keeps the count flat when a page spans more projects', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const me = await f.user();
    const run = async (projects: number) => {
      for (let i = 0; i < projects; i++) {
        const p = await f.project({ lead, members: [[me, 'member']] });
        await f.tasks(p, 5, () => ({ assignee: me, creator: lead }));
      }
      const { exec, log } = counting();
      await listTasks(principal(me), { scope: 'mine' }, clock, exec);
      return log.length;
    };
    const two = await run(2);
    const eight = await run(6); // 2 + 6 = 8 projects now
    expect(eight).toBe(two);
  });
});

describe('task reads: index use', () => {
  it('lets the "mine" list use the partial (assignee_id, status, due_date) index', async () => {
    const { me, add } = await world();
    await add(150);
    const { exec, log } = counting();
    await listTasks(
      principal(me),
      { scope: 'mine', status: [...ACTIVE_STATUSES], sort: 'due' },
      clock,
      exec,
    );
    const main = log.find((l) => /from "task"/i.test(l.query) && /order by/i.test(l.query));
    expect(main).toBeDefined();
    // On a table this small the planner prefers `task_project_id_status_idx` and filters by assignee.
    // Inside a transaction that is rolled back, sequential scans are off and that competing index is
    // dropped, so the plan shows whether the assignee index fits the query's predicates and ordering.
    let plan = '';
    const undo = new Error('rollback');
    await db.$client
      .begin(async (tx) => {
        await tx.unsafe('set local enable_seqscan = off');
        await tx.unsafe('drop index task_project_id_status_idx');
        const rows = await tx.unsafe(
          `explain (format json) ${main?.query}`,
          (main?.params ?? []) as never[],
        );
        plan = JSON.stringify(rows);
        throw undo;
      })
      .catch((e) => {
        if (e !== undo) throw e;
      });
    expect(plan).toContain('task_assignee_id_status_due_date_idx');
  });
});
