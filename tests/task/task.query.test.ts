/** Task list (S2-02): keyset paging over every sort, filters, labels, checklist progress, cursor errors and the create-task capability. */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { task, taskChecklistItem } from '../../server/db/schema';
import { PROJECT_PRIORITIES } from '../../server/pm/enums';
import { addDays } from '../../server/seed/atlas.data';
import type { ListTasksInput, ListTasksResult } from '../../server/task/task.dto';
import { TASK_SORTS } from '../../server/task/task.limits';
import { listTasks } from '../../server/task/task.query';
import { type AtlasScenario, seedAtlas } from '../support/atlas';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tqry' });
afterAll(() => cleaner.flushAll());

const principal = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });
const PAGE = 25;

let atlas: AtlasScenario;
let clock: { now: Date; today: string };
beforeAll(async () => {
  atlas = await cleaner.shared(() => seedAtlas(f));
  clock = { now: ATLAS_NOW, today: atlas.today };
});

function good(res: ListTasksResult) {
  if (!res.ok) throw new Error(`list refused with ${res.code}`);
  return res;
}

/** Reads every page of a list and returns the ids in order plus the number of pages. */
async function walk(p: Principal, input: ListTasksInput) {
  const ids: string[] = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const res = good(
      await listTasks(p, { ...input, limit: PAGE, ...(cursor ? { cursor } : {}) }, clock),
    );
    ids.push(...res.items.map((i) => i.id));
    cursor = res.nextCursor ?? undefined;
    pages++;
  } while (cursor);
  return { ids, pages };
}

describe('Atlas lists', () => {
  const key = (k: keyof AtlasScenario['tasks']) => atlas.tasks[k].id;

  it("returns Nico's own tasks by due date, with the overdue label on #12 and none on the task due today", async () => {
    const res = good(await listTasks(principal(atlas.users.nico), { scope: 'mine' }, clock));
    expect(res.items.map((i) => i.id)).toEqual([
      key('architecture'),
      key('fixSso'),
      key('specApi'),
      key('sinarReport'),
      key('reviewDesign'),
    ]);
    const byId = new Map(res.items.map((i) => [i.id, i]));
    expect(byId.get(key('fixSso'))?.labels).toEqual(['overdue']);
    expect(byId.get(key('specApi'))?.labels).toEqual([]);
    expect(byId.get(key('specApi'))?.primary).toBe('start');
    expect(byId.get(key('specApi'))?.assignee?.name).toBe(atlas.users.nico.name);
    expect(byId.get(key('specApi'))?.project.name).toBe(atlas.projects.atlas.name);
  });

  it('marks the in-review task as waiting only for the reviewer it names', async () => {
    const input: ListTasksInput = { scope: 'project', projectId: atlas.projects.atlas.id };
    const labelsFor = async (u: TestUser) => {
      const res = good(await listTasks(principal(u), input, clock));
      return res.items.find((i) => i.id === key('fixProfileSave'))?.labels;
    };
    expect(await labelsFor(atlas.users.nico)).toEqual(['awaiting_my_review']);
    expect(await labelsFor(atlas.users.dodi)).toEqual([]);
  });

  it.each([
    ['overdue', ['fixSso']],
    ['today', ['specApi']],
    ['tomorrow', ['sinarReport']],
    ['week', ['reviewDesign']],
    ['later', []],
    ['none', []],
  ] as const)('filters "mine" by schedule group %s', async (due, expected) => {
    const res = good(await listTasks(principal(atlas.users.nico), { scope: 'mine', due }, clock));
    expect(res.items.map((i) => i.id)).toEqual(expected.map((k) => key(k)));
  });

  // Bug: the Proyek filter of the Tugas page sends `projectId` with scope `mine` or `all`, and the query ignored it.
  it.each([
    ['mine', 'nico', 'atlas', ['architecture', 'fixSso', 'specApi', 'reviewDesign']],
    ['mine', 'nico', 'sinar', ['sinarReport']],
  ] as const)(
    'narrows scope %s to the chosen project (%s, %s)',
    async (scope, who, projectKey, expected) => {
      const res = good(
        await listTasks(
          principal(atlas.users[who]),
          { scope, projectId: atlas.projects[projectKey].id },
          clock,
        ),
      );
      expect(res.items.map((i) => i.id)).toEqual(expected.map((k) => key(k)));
      expect(new Set(res.items.map((i) => i.project.id))).toEqual(
        new Set([atlas.projects[projectKey].id]),
      );
    },
  );

  it('narrows "all" to the chosen project and still hides projects the caller may not see', async () => {
    const nico = principal(atlas.users.nico);
    const inSinar = good(
      await listTasks(nico, { scope: 'all', projectId: atlas.projects.sinar.id }, clock),
    );
    expect(inSinar.items.length).toBeGreaterThan(0);
    expect(new Set(inSinar.items.map((i) => i.project.id))).toEqual(
      new Set([atlas.projects.sinar.id]),
    );
    // An id the caller cannot see (or that does not exist) is an empty list, never another project's rows.
    const unknown = good(
      await listTasks(nico, { scope: 'all', projectId: `${f.tag}-no-such-project` }, clock),
    );
    expect(unknown.items).toEqual([]);
  });

  it('keeps finished tasks out of every schedule group filter', async () => {
    const res = good(
      await listTasks(principal(atlas.users.nico), { scope: 'mine', due: 'overdue' }, clock),
    );
    expect(res.items.map((i) => i.id)).not.toContain(key('architecture'));
  });
});

describe('keyset paging', () => {
  let lead: TestUser;
  let projectId: string;
  beforeAll(async () => {
    lead = await cleaner.shared(() => f.user({ role: 'project_manager' }));
    const project = await cleaner.shared(() => f.project({ lead }));
    projectId = project.id;
    // Ties on due date, priority and created_at, and every seventh task without a due date.
    await cleaner.shared(() =>
      f.tasks(project, 60, (i) => ({
        creator: lead,
        due: i % 7 === 0 ? null : addDays(atlas.today, i % 5),
        priority: PROJECT_PRIORITIES[i % 4] ?? 'medium',
        createdAt: new Date(ATLAS_NOW.getTime() + (i % 6) * 1000),
      })),
    );
    // Microsecond values with ties: a cursor that went through a JS Date would skip or repeat rows.
    await db.execute(sql`UPDATE task SET updated_at = timestamptz '2026-01-01 00:00:00.123456+00'
      + ((abs(hashtext(id)) % 10) || ' seconds')::interval WHERE project_id = ${projectId}`);
  });

  const rank = sql`CASE ${task.priority} WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`;
  const ORDER = {
    due: sql`${task.dueDate} ASC NULLS LAST, ${task.id} ASC`,
    priority: sql`${rank} ASC, ${task.id} ASC`,
    updated: sql`${task.updatedAt} DESC, ${task.id} ASC`,
    created: sql`${task.createdAt} DESC, ${task.id} ASC`,
  };

  it.each([...TASK_SORTS])(
    'sort %s: three pages, no row twice, none lost, in database order',
    async (sort) => {
      const expected = await db
        .select({ id: task.id })
        .from(task)
        .where(eq(task.projectId, projectId))
        .orderBy(ORDER[sort]);
      const { ids, pages } = await walk(principal(lead), { scope: 'project', projectId, sort });
      expect(pages).toBe(3);
      expect(new Set(ids).size).toBe(60);
      expect(ids).toEqual(expected.map((r) => r.id));
    },
  );

  it('puts tasks without a due date after the dated ones', async () => {
    const res = good(
      await listTasks(principal(lead), { scope: 'project', projectId, limit: 100 }, clock),
    );
    const dues = res.items.map((i) => i.dueDate);
    expect(dues.indexOf(null)).toBe(dues.map((d) => d !== null).lastIndexOf(true) + 1);
    expect(dues.filter((d) => d === null)).toHaveLength(9);
  });

  it('clamps the limit to the page maximum and treats 0 as 1', async () => {
    const big = good(
      await listTasks(principal(lead), { scope: 'project', projectId, limit: 5000 }, clock),
    );
    expect(big.items).toHaveLength(60);
    expect(big.nextCursor).toBeNull();
    const tiny = good(
      await listTasks(principal(lead), { scope: 'project', projectId, limit: 0 }, clock),
    );
    expect(tiny.items).toHaveLength(1);
    expect(tiny.nextCursor).not.toBeNull();
  });

  const forged = (...parts: unknown[]) => Buffer.from(JSON.stringify(parts)).toString('base64url');
  it.each([
    ['not base64 JSON', 'due', '%%%'],
    ['a due date that does not exist', 'due', forged('2026-02-30', 'x')],
    ['a due key of the wrong type', 'due', forged(7, 'x')],
    ['a null key on a sort that never has one', 'updated', forged(null, 'x')],
    ['a priority rank out of range', 'priority', forged(9, 'x')],
    ['a timestamp without microseconds', 'created', forged('2026-01-01T00:00:00Z', 'x')],
  ] as const)('answers BAD_CURSOR for %s', async (_name, sort, cursor) => {
    const res = await listTasks(
      principal(lead),
      { scope: 'project', projectId, sort, cursor },
      clock,
    );
    expect(res).toEqual({ ok: false, code: 'BAD_CURSOR' });
  });

  it('accepts a null key on the due sort, where tasks without a due date come last', async () => {
    const res = await listTasks(
      principal(lead),
      { scope: 'project', projectId, sort: 'due', cursor: forged(null, 'x') },
      clock,
    );
    expect(res.ok).toBe(true);
  });

  it('refuses a cursor issued for another sort', async () => {
    const first = good(
      await listTasks(
        principal(lead),
        { scope: 'project', projectId, sort: 'due', limit: 5 },
        clock,
      ),
    );
    const res = await listTasks(
      principal(lead),
      { scope: 'project', projectId, sort: 'priority', cursor: first.nextCursor as string },
      clock,
    );
    expect(res).toEqual({ ok: false, code: 'BAD_CURSOR' });
  });

  it('needs a projectId for the project scope', async () => {
    await expect(listTasks(principal(lead), { scope: 'project' }, clock)).rejects.toThrow(
      'projectId',
    );
  });
});

describe('filters and details', () => {
  let lead: TestUser;
  let other: TestUser;
  let projectId: string;
  beforeAll(async () => {
    lead = await cleaner.shared(() => f.user({ role: 'project_manager' }));
    other = await cleaner.shared(() => f.user());
    const project = await cleaner.shared(() => f.project({ lead, members: [[other, 'member']] }));
    projectId = project.id;
    const mk = (title: string, extra: Partial<Parameters<typeof f.task>[0]> = {}) =>
      f.task({ project, creator: lead, title, ...extra });
    await cleaner.shared(async () => {
      await mk('Bayar 100% dulu', { priority: 'high', assignee: other });
      await mk('Cek_garis bawah', { status: 'in_progress', priority: 'low' });
      await mk('Tulis \\ laporan', { status: 'done' });
      await mk('Laporan akhir', { status: 'canceled', priority: 'critical' });
    });
  });
  const titles = async (input: Partial<ListTasksInput>) => {
    const res = good(
      await listTasks(principal(lead), { scope: 'project', projectId, ...input }, clock),
    );
    return res.items.map((i) => i.title).sort();
  };

  it.each([
    ['percent sign is literal', '%', ['Bayar 100% dulu']],
    ['underscore is literal', '_', ['Cek_garis bawah']],
    ['backslash is literal', '\\', ['Tulis \\ laporan']],
    ['case-insensitive and trimmed', '  LAPORAN ', ['Laporan akhir', 'Tulis \\ laporan']],
    ['no match', 'tidak ada', []],
  ])('search: %s', async (_name, q, expected) => {
    expect(await titles({ q })).toEqual(expected);
  });

  it('search finds a task by its number, with or without "#", and is not fooled by a huge number', async () => {
    const all = good(await listTasks(principal(lead), { scope: 'project', projectId }, clock));
    const target = all.items.find((i) => i.title === 'Cek_garis bawah');
    if (!target) throw new Error('seeded task missing');
    expect(await titles({ q: `#${target.number}` })).toEqual(['Cek_garis bawah']);
    expect(await titles({ q: String(target.number) })).toContain('Cek_garis bawah');
    // Digits that no task has, and a run too long to be a number, fall back to a plain title search.
    expect(await titles({ q: '#999999999' })).toEqual([]);
    expect(await titles({ q: '9'.repeat(30) })).toEqual([]);
  });

  it('filters by status, priority and assignee', async () => {
    expect(await titles({ status: ['done', 'canceled'] })).toEqual([
      'Laporan akhir',
      'Tulis \\ laporan',
    ]);
    expect(await titles({ priority: ['high', 'critical'] })).toEqual([
      'Bayar 100% dulu',
      'Laporan akhir',
    ]);
    expect(await titles({ assigneeId: other.id })).toEqual(['Bayar 100% dulu']);
  });

  it('reports checklist progress as done and total', async () => {
    const [t] = (
      await db.select({ id: task.id }).from(task).where(eq(task.title, 'Cek_garis bawah'))
    ).filter((r) => r.id.startsWith('tqry-'));
    const ids = ['a', 'b', 'c'].map((s) =>
      cleaner.track('taskPart', `tqry-chk-${s}-${crypto.randomUUID().slice(0, 8)}`),
    );
    await db.insert(taskChecklistItem).values(
      ids.map((id, position) => ({
        id,
        taskId: t?.id as string,
        text: `Langkah ${position}`,
        isDone: position < 2,
        position,
      })), // test-only
    );
    const res = good(
      await listTasks(principal(lead), { scope: 'project', projectId, q: 'garis' }, clock),
    );
    expect(res.items[0]?.checklist).toEqual({ done: 2, total: 3 });
    const bare = good(
      await listTasks(principal(lead), { scope: 'project', projectId, q: 'Bayar' }, clock),
    );
    expect(bare.items[0]?.checklist).toEqual({ done: 0, total: 0 });
  });

  it('sends the create-task capability of the project, and none to someone who cannot see it', async () => {
    const asLead = good(await listTasks(principal(lead), { scope: 'project', projectId }, clock));
    expect(asLead.caps).toEqual({ createTask: true });
    const outsider = await cleaner.shared(() => f.user());
    const asOutsider = good(
      await listTasks(principal(outsider), { scope: 'project', projectId }, clock),
    );
    const asMissing = good(
      await listTasks(
        principal(outsider),
        { scope: 'project', projectId: 'no-such-project' },
        clock,
      ),
    );
    expect(asOutsider).toEqual(asMissing);
    expect(asOutsider.items).toEqual([]);
    expect(asOutsider.caps).toEqual({});
  });

  it('sends a create-task capability on the cross-project lists only to someone who can add to a project', async () => {
    const outsider = await f.user();
    expect(good(await listTasks(principal(outsider), { scope: 'all' }, clock)).caps).toEqual({});
    expect(good(await listTasks(principal(other), { scope: 'mine' }, clock)).caps).toEqual({
      createTask: true,
    });
    expect(
      good(await listTasks(principal(atlas.users.admin), { scope: 'all', limit: 1 }, clock)).caps,
    ).toEqual({ createTask: true });
    // A viewer may read but not add: the capability is not true for them.
    expect(
      good(
        await listTasks(
          principal(atlas.users.sri),
          { scope: 'project', projectId: atlas.projects.atlas.id },
          clock,
        ),
      ).caps.createTask,
    ).not.toBe(true);
  });
});
