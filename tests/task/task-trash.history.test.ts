/**
 * Trash moves in the task's own history (S6 D1): a delete and a restore each leave one
 * `task_activity` row in the same transaction as the `deleted_at` stamp, so the timeline tells why
 * the task vanished and came back instead of staying silent. A refused move writes nothing, and a
 * task that went with its project is recorded on the project, never per task (see the DECISION in
 * `server/task/task-trash.service.ts`).
 */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { taskActivity } from '../../server/db/schema';
import { restoreProject, trashProject } from '../../server/project/project-trash.service';
import { TASK_ACTIVITY } from '../../server/task/task.limits';
import { restoreTask, trashTask } from '../../server/task/task-trash.service';
import { getTaskTimeline } from '../../server/task/task-timeline.query';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'trashhist' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const TRASHED_AT = new Date('2026-10-10T03:00:00Z'); // test-only: 10.00 WIB
const RESTORED_AT = new Date('2026-10-10T04:30:00Z'); // test-only
const principal = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });

async function world() {
  const lead = await f.user({ role: 'project_manager', name: 'Bu Rina' }); // test-only
  const worker = await f.user({ name: 'Pak Budi' }); // test-only
  const outsider = await f.user();
  const prj = await f.project({ lead, members: [[worker, 'member']] });
  const t = await f.task({ project: prj, creator: lead, assignee: worker });
  return { lead, worker, outsider, prj, t };
}

/** The task's activity rows oldest first, as the timeline orders them backwards. */
async function marks(taskId: string) {
  return await db
    .select({
      action: taskActivity.action,
      actorId: taskActivity.actorId,
      actorName: taskActivity.actorName,
      payload: taskActivity.payload,
      at: taskActivity.createdAt,
    })
    .from(taskActivity)
    .where(eq(taskActivity.taskId, taskId))
    .orderBy(taskActivity.createdAt, taskActivity.id);
}

describe('a task sent to the Trash', () => {
  it('leaves one history row naming who did it and the task number', async () => {
    const w = await world();
    expect(await marks(w.t.id)).toEqual([]);

    expect((await trashTask(principal(w.lead), String(w.t.number), TRASHED_AT)).ok).toBe(true);

    expect(await marks(w.t.id)).toEqual([
      {
        action: TASK_ACTIVITY.trash,
        actorId: w.lead.id,
        actorName: 'Bu Rina',
        payload: { number: w.t.number },
        at: TRASHED_AT,
      },
    ]);
  });

  it('keeps the title out of the payload, so history repeats nothing the row does not need', async () => {
    const w = await world();
    await trashTask(principal(w.lead), String(w.t.number), TRASHED_AT);
    const [row] = await marks(w.t.id);
    expect(Object.keys(row?.payload as object)).toEqual(['number']);
  });

  it('adds the restore row after it, and the timeline reads both newest first', async () => {
    const w = await world();
    await trashTask(principal(w.lead), String(w.t.number), TRASHED_AT);
    expect((await restoreTask(principal(w.lead), w.t.id, RESTORED_AT)).ok).toBe(true);

    expect((await marks(w.t.id)).map((m) => [m.action, m.at])).toEqual([
      [TASK_ACTIVITY.trash, TRASHED_AT],
      [TASK_ACTIVITY.restore, RESTORED_AT],
    ]);

    // The timeline is readable again once the task is back; it answers newest first.
    const page = await getTaskTimeline(principal(w.worker), String(w.t.number), {});
    expect(page.ok && page.items.map((i) => i.kind === 'activity' && i.action)).toEqual([
      TASK_ACTIVITY.restore,
      TASK_ACTIVITY.trash,
    ]);
    expect(page.ok && page.items.map((i) => i.author.name)).toEqual(['Bu Rina', 'Bu Rina']);
  });

  it('names the restorer, not the remover, when someone else brings it back', async () => {
    const w = await world();
    const admin = await f.user({ role: 'admin' });
    await trashTask(principal(w.lead), String(w.t.number), TRASHED_AT);
    expect((await restoreTask(principal(admin), w.t.id, RESTORED_AT)).ok).toBe(true);

    const rows = await marks(w.t.id);
    expect(rows.map((m) => m.actorId)).toEqual([w.lead.id, admin.id]);
  });
});

describe('a task that was not moved', () => {
  it('has no Trash row at all', async () => {
    const w = await world();
    const other = await f.task({ project: w.prj, creator: w.lead });
    await trashTask(principal(w.lead), String(w.t.number), TRASHED_AT);
    expect(await marks(other.id)).toEqual([]);
  });

  it('gets no row from a refused delete', async () => {
    const w = await world();
    // An outsider may not even see the task, so the delete answers NOT_FOUND and writes nothing.
    const r = await trashTask(principal(w.outsider), String(w.t.number), TRASHED_AT);
    expect(r).toEqual({ ok: false, code: 'NOT_FOUND' });
    expect(await marks(w.t.id)).toEqual([]);
  });

  it('gets no row when it goes to the Trash with its project, in either direction', async () => {
    const w = await world();
    expect((await trashProject(principal(w.lead), w.prj.id, TRASHED_AT)).ok).toBe(true);
    expect(await marks(w.t.id)).toEqual([]);
    expect((await restoreProject(principal(w.lead), w.prj.id, RESTORED_AT)).ok).toBe(true);
    expect(await marks(w.t.id)).toEqual([]);
  });
});
