/**
 * The 30-day Trash purge: only what is past the retention boundary goes, projects take their tasks
 * and trashed events with them (no orphan events), live rows are never touched, and a second run
 * finds nothing. `now` is injected, so the boundary is exact to the millisecond.
 */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { and, eq, gte, inArray, type SQL } from 'drizzle-orm';
import { AUDIT_ACTIONS } from '../../server/audit';
import { db } from '../../server/db';
import {
  auditLog,
  event,
  project as projectTable,
  task,
  taskComment,
} from '../../server/db/schema';
import { METRICS } from '../../server/metrics/config';
import { purgeBefore } from '../../server/metrics/trash.metrics';
import { toPrincipal } from '../../server/project/membership.query';
import { trashProject } from '../../server/project/project-trash.service';
import { purgeTrash, runTrashPurge, TRASH_PURGE_BATCH } from '../../server/trash/trash.purge';
import { createEventFactory } from '../event/factory.event';
import { waitForAudit } from '../support/api';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'trashpurge' });
const NOW = new Date('2026-11-15T03:00:00Z'); // test-only: 10.00 WIB
const events = createEventFactory({ tag: 'trashpurge-e', now: () => NOW });
afterEach(async () => {
  await events.flush();
  await cleaner.flushTest();
});
afterAll(async () => {
  await events.flush();
  await cleaner.flushAll();
});

const MS = 1;
const CUTOFF = purgeBefore(NOW, METRICS);
const OLD = new Date(CUTOFF.getTime() - MS); // the last instant that is already purgeable
const KEPT = new Date(CUTOFF.getTime()); // the first instant still inside the window
const DAY_MS = 86_400_000;
const FRESH = new Date(NOW.getTime() - DAY_MS);

const taskIds = async (ids: string[]) =>
  (await db.select({ id: task.id }).from(task).where(inArray(task.id, ids))).map((r) => r.id);
const eventIds = async (ids: string[]) =>
  (await db.select({ id: event.id }).from(event).where(inArray(event.id, ids))).map((r) => r.id);
const projectIds = async (ids: string[]) =>
  (
    await db.select({ id: projectTable.id }).from(projectTable).where(inArray(projectTable.id, ids))
  ).map((r) => r.id);

describe('purgeTrash boundary', () => {
  it('is 30 days in the team zone: 17 Oct 00:00 WIB for 15 Nov', () => {
    expect(CUTOFF.toISOString()).toBe('2026-10-16T17:00:00.000Z');
  });

  it('removes a task or event 1 ms past the boundary and keeps the one exactly on it', async () => {
    const u = await f.user({ role: 'admin' });
    const prj = await f.project({ lead: u });
    const old = await f.task({ project: prj, creator: u, deletedAt: OLD });
    const kept = await f.task({ project: prj, creator: u, deletedAt: KEPT });
    const oldEvent = await events.event({ creator: u, project: prj });
    const keptEvent = await events.event({ creator: u, project: prj });
    await db
      .update(event)
      .set({ deletedAt: OLD, deletedBy: u.id })
      .where(eq(event.id, oldEvent.id));
    await db
      .update(event)
      .set({ deletedAt: KEPT, deletedBy: u.id })
      .where(eq(event.id, keptEvent.id));

    const result = await purgeTrash(NOW);

    expect(result.tasks).toBeGreaterThanOrEqual(1);
    expect(result.events).toBeGreaterThanOrEqual(1);
    expect(await taskIds([old.id, kept.id])).toEqual([kept.id]);
    expect(await eventIds([oldEvent.id, keptEvent.id])).toEqual([keptEvent.id]);
  });

  it('never touches live rows or recent Trash', async () => {
    const u = await f.user({ role: 'admin' });
    const prj = await f.project({ lead: u });
    const live = await f.task({ project: prj, creator: u });
    const recent = await f.task({ project: prj, creator: u, deletedAt: FRESH });
    const liveEvent = await events.event({ creator: u, project: prj });
    await purgeTrash(NOW);
    expect((await taskIds([live.id, recent.id])).sort()).toEqual([live.id, recent.id].sort());
    expect(await eventIds([liveEvent.id])).toEqual([liveEvent.id]);
    expect(await projectIds([prj.id])).toEqual([prj.id]);
  });
});

describe('purgeTrash of a project', () => {
  it('removes the expired project with its tasks, their comments and its trashed events', async () => {
    const u = await f.user({ role: 'admin' });
    const prj = await f.project({ lead: u });
    const t1 = await f.task({ project: prj, creator: u });
    const t2 = await f.task({ project: prj, creator: u });
    await db.insert(taskComment).values({ taskId: t1.id, authorId: u.id, body: 'uji' }); // test-only
    const ev = await events.event({ creator: u, project: prj });
    const other = await f.project({ lead: u });
    const otherTask = await f.task({ project: other, creator: u });
    await trashProject(toPrincipal({ user: u, role: u.role }), prj.id, OLD);

    const result = await purgeTrash(NOW);

    expect(result.projects).toBeGreaterThanOrEqual(1);
    expect(result.tasks).toBeGreaterThanOrEqual(2);
    expect(result.events).toBeGreaterThanOrEqual(1);
    expect(await projectIds([prj.id])).toEqual([]);
    expect(await taskIds([t1.id, t2.id])).toEqual([]);
    // The event must be gone, not turned into an orphan personal event by `project_id SET NULL`.
    expect(await eventIds([ev.id])).toEqual([]);
    expect(await taskIds([otherTask.id])).toEqual([otherTask.id]);
    expect(await projectIds([other.id])).toEqual([other.id]);
  });

  it('keeps a project deleted inside the window together with its tasks and events', async () => {
    const u = await f.user({ role: 'admin' });
    const prj = await f.project({ lead: u });
    const t1 = await f.task({ project: prj, creator: u });
    const ev = await events.event({ creator: u, project: prj });
    await trashProject(toPrincipal({ user: u, role: u.role }), prj.id, KEPT);
    await purgeTrash(NOW);
    expect(await projectIds([prj.id])).toEqual([prj.id]);
    expect(await taskIds([t1.id])).toEqual([t1.id]);
    expect(await eventIds([ev.id])).toEqual([ev.id]);
  });
});

describe('purgeTrash run', () => {
  it('clears a backlog larger than one batch and is idempotent', async () => {
    const u = await f.user({ role: 'admin' });
    const prj = await f.project({ lead: u });
    const total = TRASH_PURGE_BATCH + 5;
    const rows = await f.tasks(prj, total, () => ({ creator: u, deletedAt: OLD }));
    const ids = rows.map((r) => r.id);
    const first = await purgeTrash(NOW);
    expect(first.tasks).toBeGreaterThanOrEqual(total);
    expect(await taskIds(ids)).toEqual([]);
    expect(await purgeTrash(NOW)).toEqual({ projects: 0, tasks: 0, events: 0 });
  });

  it('writes one audit entry with counts only, and none when there is nothing to purge', async () => {
    const u = await f.user({ role: 'admin' });
    const prj = await f.project({ lead: u });
    await f.task({ project: prj, creator: u, title: 'Rahasia klien', deletedAt: OLD });
    const startedAt = new Date();
    const result = await runTrashPurge(NOW);
    expect(result.tasks).toBeGreaterThanOrEqual(1);
    const rows = await waitForAudit(
      and(
        eq(auditLog.action, AUDIT_ACTIONS.TRASH_RETENTION),
        gte(auditLog.createdAt, startedAt),
      ) as SQL,
    );
    const last = rows.at(-1);
    expect(last?.targetType).toBe('trash');
    expect(last?.summary).not.toContain('Rahasia');
    expect(JSON.stringify(last?.meta)).not.toContain('Rahasia');
    expect(await runTrashPurge(NOW)).toEqual({ projects: 0, tasks: 0, events: 0 });
  });
});
