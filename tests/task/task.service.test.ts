/** Task create/update service (S2-04): personas, Q12 closed projects, Trash lock, assignee rules, numbering, activity rows. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { and, asc, eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { project, task, taskActivity, taskChecklistItem } from '../../server/db/schema';
import { TASK_WRITE_MESSAGES } from '../../server/task/task.limits';
import { createTask, type TaskAuthor, updateTask } from '../../server/task/task.service';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tsvc' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const NOW = new Date('2026-10-07T03:00:00Z'); // test-only: Wednesday 10.00 WIB
const clock = { now: NOW, today: '2026-10-07' };
const principal = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });
const author = (u: TestUser): TaskAuthor => ({ principal: principal(u), name: u.name });

async function graph(status: 'active' | 'completed' | 'on_hold' | 'canceled' = 'active') {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const other = await f.user();
  const viewer = await f.user();
  const proj = await f.project({
    lead,
    status,
    members: [
      [member, 'member'],
      [other, 'member'],
      [viewer, 'viewer'],
    ],
  });
  return { lead, member, other, viewer, proj };
}

const activities = (taskId: string) =>
  db
    .select({
      action: taskActivity.action,
      payload: taskActivity.payload,
      actorId: taskActivity.actorId,
    })
    .from(taskActivity)
    .where(eq(taskActivity.taskId, taskId))
    .orderBy(asc(taskActivity.createdAt), asc(taskActivity.action));

describe('createTask', () => {
  it('creates the task, its first steps and a created activity in one go', async () => {
    const { member, proj } = await graph();
    const r = await createTask(
      author(member),
      {
        projectId: proj.id,
        title: '  Pasang keramik  ',
        assigneeId: member.id,
        dueDate: '2026-10-09',
        startDate: '2026-10-08',
        checklist: ['Beli semen', 'Ukur dinding'],
      },
      clock,
    );
    if (!r.ok) throw new Error(`expected ok, got ${r.code}`);
    expect(r.task).toMatchObject({
      title: 'Pasang keramik',
      status: 'todo',
      priority: 'medium',
      needsReview: false,
      kind: { id: proj.kinds.task, name: 'Tugas' },
      creator: { id: member.id },
      assignee: { id: member.id },
      checklist: { done: 0, total: 2 },
    });
    expect(r.task.checklist.items.map((i) => [i.text, i.position])).toEqual([
      ['Beli semen', 0],
      ['Ukur dinding', 1],
    ]);
    expect(await activities(r.task.id)).toEqual([
      { action: 'created', payload: { number: r.task.number }, actorId: member.id },
    ]);
  });

  it.each([
    ['a viewer', 'viewer', 'NOT_MEMBER'],
    ['a Project Manager who is not a member', 'pmX', 'NOT_MEMBER'],
    ['a member of another project', 'stranger', 'NOT_FOUND'],
  ] as const)('refuses %s', async (_label, who, code) => {
    const g = await graph();
    const actor =
      who === 'viewer' ? g.viewer : await f.user(who === 'pmX' ? { role: 'project_manager' } : {});
    const r = await createTask(author(actor), { projectId: g.proj.id, title: 'x' }, clock);
    expect(r).toMatchObject({ ok: false, code });
  });

  it('lets an Admin who is not a member add a task', async () => {
    const { proj } = await graph();
    const r = await createTask(
      author(await f.user({ role: 'admin' })),
      { projectId: proj.id, title: 'x' },
      clock,
    );
    expect(r.ok).toBe(true);
  });

  it.each(['completed', 'on_hold', 'canceled'] as const)(
    'still accepts tasks in a %s project (Q12)',
    async (status) => {
      const { member, proj } = await graph(status);
      expect((await createTask(author(member), { projectId: proj.id, title: 'x' }, clock)).ok).toBe(
        true,
      );
    },
  );

  it('refuses a project in the Trash with PROJECT_IN_TRASH', async () => {
    const { member, proj } = await graph();
    await db.update(project).set({ deletedAt: NOW }).where(eq(project.id, proj.id));
    const r = await createTask(author(member), { projectId: proj.id, title: 'x' }, clock);
    expect(r).toEqual({ ok: false, code: 'PROJECT_IN_TRASH' });
  });

  it.each([
    ['a viewer', 'viewer'],
    ['someone outside the project', 'outsider'],
  ] as const)('refuses %s as the person doing the work', async (_label, who) => {
    const g = await graph();
    const assignee = who === 'viewer' ? g.viewer : await f.user();
    const r = await createTask(
      author(g.member),
      { projectId: g.proj.id, title: 'x', assigneeId: assignee.id },
      clock,
    );
    expect(r).toEqual({
      ok: false,
      code: 'VALIDATION',
      error: TASK_WRITE_MESSAGES.assigneeNotWorker,
    });
  });

  it.each([
    [
      'a start after the due date',
      { startDate: '2026-10-10', dueDate: '2026-10-09' },
      'startAfterDue',
    ],
    ['a blank title', { title: '   ' }, 'emptyTitle'],
    ['a blank step', { checklist: ['ok', ' '] }, 'emptyStep'],
    ['a kind of another project', { kindId: 'nope-kind' }, 'kindNotInProject'],
  ] as const)('refuses %s', async (_label, extra, message) => {
    const { member, proj } = await graph();
    const r = await createTask(author(member), { projectId: proj.id, title: 'x', ...extra }, clock);
    expect(r).toEqual({ ok: false, code: 'VALIDATION', error: TASK_WRITE_MESSAGES[message] });
  });

  it('gives 20 concurrent creations 20 distinct numbers', async () => {
    const { member, proj } = await graph();
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        createTask(author(member), { projectId: proj.id, title: `Serentak ${i}` }, clock),
      ),
    );
    const numbers = results.map((r) => (r.ok ? r.task.number : -1));
    expect(numbers).not.toContain(-1);
    expect(new Set(numbers).size).toBe(20);
  });
});

describe('updateTask', () => {
  async function withTask() {
    const g = await graph();
    const t = await f.task({
      project: g.proj,
      creator: g.member,
      priority: 'medium',
      due: '2026-10-09',
    });
    return { ...g, t };
  }

  it('changes the due date, writes its activity and bumps last activity', async () => {
    const { member, t } = await withTask();
    const r = await updateTask(author(member), String(t.number), { dueDate: '2026-10-20' }, clock);
    expect(r).toMatchObject({ ok: true, task: { dueDate: '2026-10-20' } });
    expect(await activities(t.id)).toEqual([
      {
        action: 'due_date_changed',
        payload: { from: '2026-10-09', to: '2026-10-20' },
        actorId: member.id,
      },
    ]);
    const [row] = await db.select({ at: task.lastActivityAt }).from(task).where(eq(task.id, t.id));
    expect(row?.at.getTime()).toBe(NOW.getTime());
  });

  it('records assignee and priority changes, and the new assignee may then edit (T-A2 own)', async () => {
    const { member, other, t } = await withTask();
    expect(await updateTask(author(other), t.id, { title: 'Bukan punyaku' }, clock)).toEqual({
      ok: false,
      code: 'NOT_OWNER',
    });
    await updateTask(author(member), t.id, { assigneeId: other.id, priority: 'high' }, clock);
    const rows = await activities(t.id);
    expect(rows.map((a) => a.action).sort()).toEqual(['assignee_changed', 'priority_changed']);
    expect(rows.find((a) => a.action === 'assignee_changed')?.payload).toEqual({
      from: null,
      to: other.id,
    });
    const r = await updateTask(author(other), t.id, { title: 'Sekarang punyaku' }, clock);
    expect(r).toMatchObject({
      ok: true,
      task: { title: 'Sekarang punyaku', assignee: { id: other.id } },
    });
  });

  it('refuses a viewer as the new assignee and an edit by a viewer', async () => {
    const { lead, viewer, t } = await withTask();
    expect(await updateTask(author(lead), t.id, { assigneeId: viewer.id }, clock)).toMatchObject({
      ok: false,
      code: 'VALIDATION',
    });
    expect(await updateTask(author(viewer), t.id, { title: 'x' }, clock)).toEqual({
      ok: false,
      code: 'NOT_MEMBER',
    });
  });

  it('checks the start date against the stored due date', async () => {
    const { member, t } = await withTask();
    const r = await updateTask(author(member), t.id, { startDate: '2026-10-10' }, clock);
    expect(r).toEqual({ ok: false, code: 'VALIDATION', error: TASK_WRITE_MESSAGES.startAfterDue });
  });

  it('answers NOT_FOUND to an outsider and for a missing ref, and an empty change writes nothing', async () => {
    const { member, t } = await withTask();
    expect(await updateTask(author(await f.user()), t.id, { title: 'x' }, clock)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(await updateTask(author(member), 'nope', { title: 'x' }, clock)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect((await updateTask(author(member), t.id, {}, clock)).ok).toBe(true);
    expect(await activities(t.id)).toEqual([]);
  });

  it('keeps the checklist untouched on update', async () => {
    const { member, proj } = await graph();
    const c = await createTask(
      author(member),
      { projectId: proj.id, title: 'x', checklist: ['a'] },
      clock,
    );
    if (!c.ok) throw new Error(c.code);
    await updateTask(author(member), c.task.id, { title: 'y' }, clock);
    const items = await db
      .select()
      .from(taskChecklistItem)
      .where(and(eq(taskChecklistItem.taskId, c.task.id)));
    expect(items).toHaveLength(1);
  });
});
