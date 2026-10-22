/** Task workflow service (S2-05): the nine legal steps, timestamps, take-over, inputs, review lock and the write race. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { asc, eq, sql } from 'drizzle-orm';
import { TASK_TRANSITIONS } from '../../server/access/task-flow.policy';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { task, taskActivity } from '../../server/db/schema';
import type { TaskStatus } from '../../server/pm/enums';
import {
  ENABLED_TASK_ACTIONS,
  type EnabledTaskAction,
  S4_ACTIONS,
} from '../../server/task/task.limits';
import type { TaskAuthor } from '../../server/task/task.service';
import { applyTransition, type TransitionInput } from '../../server/task/task-workflow.service';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'twf' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const NOW = new Date('2026-10-07T03:00:00Z'); // test-only: Wednesday 10.00 WIB
const LATER = new Date('2026-10-08T03:00:00Z'); // test-only
const clockAt = (now: Date) => ({ now, today: now.toISOString().slice(0, 10) });
const clock = clockAt(NOW);
const principal = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });
const author = (u: TestUser): TaskAuthor => ({ principal: principal(u), name: u.name });
const REASON = 'Pelanggan minta ubah warna';
const CANCEL: TransitionInput = { category: 'not_needed' };

async function graph() {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const proj = await f.project({ lead, members: [[member, 'member']] });
  return { lead, member, proj };
}

const rowOf = async (id: string) => {
  const [row] = await db.select().from(task).where(eq(task.id, id));
  if (!row) throw new Error(`task ${id} is gone`);
  return row;
};
const activities = (taskId: string) =>
  db
    .select({ action: taskActivity.action, payload: taskActivity.payload })
    .from(taskActivity)
    .where(eq(taskActivity.taskId, taskId))
    .orderBy(asc(taskActivity.createdAt));

/** The nine pairs S2 runs; `in_review → canceled` starts from a fixture row (review ships in S4). */
const LEGAL: ReadonlyArray<[TaskStatus, EnabledTaskAction, TaskStatus, TransitionInput]> = [
  ['todo', 'start', 'in_progress', {}],
  ['in_progress', 'unstart', 'todo', {}],
  ['todo', 'complete', 'done', {}],
  ['in_progress', 'complete', 'done', {}],
  ['done', 'reopen', 'in_progress', { reason: REASON }],
  ['todo', 'cancel', 'canceled', CANCEL],
  ['in_progress', 'cancel', 'canceled', CANCEL],
  ['in_review', 'cancel', 'canceled', CANCEL],
  ['canceled', 'uncancel', 'todo', {}],
];

const LOCK_POLL_MS = 10;
const LOCK_POLL_TRIES = 200;

/** Resolves once some session of this database waits on a row lock (the service's UPDATE). */
async function waitForLockWait(): Promise<void> {
  for (let i = 0; i < LOCK_POLL_TRIES; i++) {
    const rows = await db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'`,
    );
    if ((rows[0]?.n ?? 0) > 0) return;
    await Bun.sleep(LOCK_POLL_MS);
  }
  throw new Error('The workflow UPDATE never waited on the row lock');
}

describe('the action catalog', () => {
  it('covers every action of TASK_TRANSITIONS with S2 and S4 actions, without overlap', () => {
    const all = new Set(TASK_TRANSITIONS.map((t) => t.action));
    const s2 = new Set<string>(ENABLED_TASK_ACTIONS);
    const s4 = new Set<string>(S4_ACTIONS);
    expect([...s2].filter((a) => s4.has(a))).toEqual([]);
    expect([...s2, ...s4].sort()).toEqual([...all].sort());
  });

  it('runs exactly the nine pairs of the enabled actions', () => {
    const enabled = TASK_TRANSITIONS.filter((t) =>
      (ENABLED_TASK_ACTIONS as readonly string[]).includes(t.action),
    );
    expect(enabled.map((t) => `${t.from}>${t.to}`).sort()).toEqual(
      LEGAL.map(([from, , to]) => `${from}>${to}`).sort(),
    );
  });
});

describe('applyTransition', () => {
  it.each(LEGAL)('%s --%s--> %s', async (from, action, to, input) => {
    const { lead, member, proj } = await graph();
    const t = await f.task({ project: proj, creator: member, assignee: member, status: from });
    const r = await applyTransition(author(lead), t.id, action, input, clock);
    if (!r.ok) throw new Error(`expected ok, got ${r.code}`);
    expect(r.task).toMatchObject({ id: t.id, status: to });
    expect(r.can.primary === undefined).toBe(false);
    const row = await rowOf(t.id);
    expect(row.status).toBe(to);
    expect(row.lastActivityAt.toISOString()).toBe(NOW.toISOString());
    expect(await activities(t.id)).toEqual([
      { action: expect.any(String), payload: expect.objectContaining({ from, to }) },
    ]);
  });

  it('fills started_at once: unstarting and starting again keeps the first time', async () => {
    const { lead, member, proj } = await graph();
    const t = await f.task({ project: proj, creator: member, assignee: member });
    await applyTransition(author(lead), t.id, 'start', {}, clock);
    await applyTransition(author(lead), t.id, 'unstart', {}, clockAt(LATER));
    const again = await applyTransition(author(lead), t.id, 'start', {}, clockAt(LATER));
    if (!again.ok) throw new Error(again.code);
    expect(again.task.startedAt).toBe(NOW.toISOString());
  });

  it('sets completed_at on complete, clears it and counts on reopen', async () => {
    const { lead, member, proj } = await graph();
    const t = await f.task({
      project: proj,
      creator: member,
      assignee: member,
      status: 'in_progress',
    });
    const done = await applyTransition(author(lead), t.id, 'complete', {}, clock);
    if (!done.ok) throw new Error(done.code);
    expect(done.task.completedAt).toBe(NOW.toISOString());
    const back = await applyTransition(
      author(lead),
      t.id,
      'reopen',
      { reason: ` ${REASON} ` },
      clock,
    );
    if (!back.ok) throw new Error(back.code);
    expect(back.task).toMatchObject({ completedAt: null, reopenCount: 1, status: 'in_progress' });
    const [, reopened] = await activities(t.id);
    expect(reopened).toEqual({
      action: 'reopened',
      payload: { from: 'done', to: 'in_progress', reason: REASON },
    });
  });

  it.each(['start', 'complete'] as const)(
    '%s on an unassigned task makes the actor its assignee (BECOMES_ASSIGNEE)',
    async (action) => {
      const { member, lead, proj } = await graph();
      const t = await f.task({ project: proj, creator: lead });
      const r = await applyTransition(author(member), t.id, action, {}, clock);
      if (!r.ok) throw new Error(r.code);
      expect(r.task.assigneeId).toBe(member.id);
      expect((await rowOf(t.id)).assigneeId).toBe(member.id);
    },
  );

  it('keeps the cancel category and note, and restoring clears them back to "todo"', async () => {
    const { lead, member, proj } = await graph();
    const t = await f.task({ project: proj, creator: member });
    const c = await applyTransition(
      author(member),
      t.id,
      'cancel',
      { category: 'other', note: ' Digabung ke tugas lain ' },
      clock,
    );
    if (!c.ok) throw new Error(c.code);
    expect(c.task.cancel).toEqual({ category: 'other', note: 'Digabung ke tugas lain' });
    expect(c.task.canceledAt).toBe(NOW.toISOString());
    const u = await applyTransition(author(lead), t.id, 'uncancel', {}, clock);
    if (!u.ok) throw new Error(u.code);
    expect(u.task).toMatchObject({ status: 'todo', cancel: null, canceledAt: null });
  });

  it.each([
    ['reopen without a reason', 'done', 'reopen', {}, 'REASON_REQUIRED'],
    ['reopen with a 2-character reason', 'done', 'reopen', { reason: ' ab ' }, 'REASON_REQUIRED'],
    [
      'cancel "other" without a note',
      'todo',
      'cancel',
      { category: 'other', note: ' ' },
      'CANCEL_NOTE_REQUIRED',
    ],
    ['cancel without a category', 'todo', 'cancel', {}, 'VALIDATION'],
  ] as const)('refuses %s', async (_label, from, action, input, code) => {
    const { lead, proj } = await graph();
    const t = await f.task({ project: proj, creator: lead, status: from });
    const r = await applyTransition(author(lead), t.id, action, input, clock);
    expect(r).toEqual({ ok: false, code });
    expect((await rowOf(t.id)).status).toBe(from);
    expect(await activities(t.id)).toEqual([]);
  });

  it('refuses to complete a task that needs review (REVIEW_REQUIRED)', async () => {
    const { lead, member, proj } = await graph();
    const t = await f.task({
      project: proj,
      creator: member,
      assignee: member,
      status: 'in_progress',
      needsReview: true,
    });
    const r = await applyTransition(author(member), t.id, 'complete', {}, clock);
    expect(r).toEqual({ ok: false, code: 'REVIEW_REQUIRED' });
    expect((await applyTransition(author(lead), t.id, 'complete', {}, clock)).ok).toBe(false);
  });

  it('answers NOT_FOUND for a trashed task and for a stranger', async () => {
    const { lead, proj } = await graph();
    const trashed = await f.task({ project: proj, creator: lead, deletedAt: NOW });
    const live = await f.task({ project: proj, creator: lead });
    const stranger = await f.user();
    expect(await applyTransition(author(lead), trashed.id, 'start', {}, clock)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(await applyTransition(author(stranger), live.id, 'start', {}, clock)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
  });

  it('answers STATE_CONFLICT when the status changes between its read and its write', async () => {
    const { lead, member, proj } = await graph();
    const t = await f.task({ project: proj, creator: member, assignee: member });
    let pending: ReturnType<typeof applyTransition> | undefined;
    // The outer transaction holds the row lock: the service reads "todo", then waits on its UPDATE.
    await db.transaction(async (tx) => {
      await tx
        .update(task)
        .set({ status: 'canceled', cancelCategory: 'duplicate' })
        .where(eq(task.id, t.id));
      pending = applyTransition(author(lead), t.id, 'start', {}, clock);
      await waitForLockWait();
    });
    expect(await pending).toEqual({ ok: false, code: 'STATE_CONFLICT' });
    expect((await rowOf(t.id)).status).toBe('canceled');
    expect(await activities(t.id)).toEqual([]);
  });
});
