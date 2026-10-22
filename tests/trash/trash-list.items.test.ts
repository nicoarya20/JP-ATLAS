/**
 * What the Trash list tells the wireframe: the three kinds in one list with a count per kind, who
 * deleted each and how many days are left (counted by the server), what went with a project, and
 * which tasks and events wait for a trashed project (`projectInTrash`, restore answers 409).
 */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { event } from '../../server/db/schema';
import { restoreEvent, trashEvent } from '../../server/event/events.trash';
import { trashProject } from '../../server/project/project-trash.service';
import { restoreTask, trashTask } from '../../server/task/task-trash.service';
import { listTrash } from '../../server/trash/trash.list.query';
import { createEventFactory } from '../event/factory.event';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'trashitems' });
const DAY_MS = 86_400_000;
const T0 = new Date('2026-10-06T03:00:00Z'); // test-only: 6 Oct, 10.00 WIB
const NOW = new Date(T0.getTime() + DAY_MS); // the next day: "Sisa 29 hari"
const events = createEventFactory({ tag: 'trashitems-e', now: () => T0 });
afterEach(async () => {
  await events.flush();
  await cleaner.flushTest();
});
afterAll(async () => {
  await events.flush();
  await cleaner.flushAll();
});

const as = (u: TestUser): Principal => ({ id: u.id, appRole: u.role, impersonating: false });
const list = (u: TestUser, kind: 'all' | 'project' | 'task' | 'event' = 'all') =>
  listTrash(as(u), { kind, limit: 50, offset: 0, now: NOW });

async function world() {
  const admin = await f.user({ role: 'admin' });
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const prj = await f.project({ lead, members: [[member, 'member']] });
  const t = await f.task({ project: prj, creator: member, assignee: member });
  const ev = await events.event({ creator: lead, project: prj });
  const personal = await events.event({ creator: lead, project: null });
  return { admin, lead, member, prj, t, ev, personal };
}

describe('GET /trash payload', () => {
  it('lists a project, a task and an event with counts, deleter and days left', async () => {
    const w = await world();
    const other = await f.project({ lead: w.lead });
    await trashTask(as(w.lead), String(w.t.number), T0);
    await trashEvent(as(w.lead), w.personal.id, new Date(T0.getTime() + 60_000));
    await trashProject(as(w.lead), other.id, new Date(T0.getTime() + 120_000));
    const r = await list(w.admin);
    const mine = r.items.filter((i) => [w.t.id, w.personal.id, other.id].includes(i.id));
    expect(mine.map((i) => i.kind)).toEqual(['project', 'event', 'task']);
    expect(r.counts.project).toBeGreaterThanOrEqual(1);
    expect(r.counts.task).toBeGreaterThanOrEqual(1);
    expect(r.counts.event).toBeGreaterThanOrEqual(1);
    for (const item of mine) {
      expect(item.daysLeft).toBe(29);
      expect(item.deletedBy).toEqual({ id: w.lead.id, name: w.lead.name });
      expect(item.restorableUntil).toBe('2026-11-04');
    }
    expect(mine[1]).toMatchObject({ kind: 'event', project: null, projectInTrash: false });
    expect(mine[2]).toMatchObject({ kind: 'task', project: { name: w.prj.name } });
  });

  it('counts down to zero on the last day and never goes negative', async () => {
    const w = await world();
    await trashTask(as(w.lead), String(w.t.number), T0);
    const late = new Date(T0.getTime() + 40 * DAY_MS);
    const r = await listTrash(as(w.admin), { kind: 'task', limit: 50, offset: 0, now: late });
    expect(r.items.find((i) => i.id === w.t.id)).toMatchObject({ daysLeft: 0 });
  });

  it('tells how many tasks and events went with a project, not those deleted on their own', async () => {
    const w = await world();
    const extra = await f.task({ project: w.prj, creator: w.lead });
    await trashTask(as(w.lead), String(extra.number), T0); // deleted by hand first: its own row
    await trashProject(as(w.lead), w.prj.id, new Date(T0.getTime() + 1000));
    const row = (await list(w.admin, 'project')).items.find((i) => i.id === w.prj.id);
    expect(row).toMatchObject({ kind: 'project', cascade: { tasks: 1, events: 1 } });
  });
});

describe('project in the Trash', () => {
  async function trashed() {
    const w = await world();
    await trashTask(as(w.lead), String(w.t.number), T0);
    await trashEvent(as(w.lead), w.ev.id, T0);
    await trashProject(as(w.lead), w.prj.id, new Date(T0.getTime() + 1000));
    return w;
  }

  it('marks the task and the event projectInTrash and refuses to restore them with 409', async () => {
    const w = await trashed();
    const rows = (await list(w.admin)).items.filter((i) => [w.t.id, w.ev.id].includes(i.id));
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).toMatchObject({
        projectInTrash: true,
        blockedBy: { projectId: w.prj.id, name: w.prj.name, visible: true },
        can: { restore: 'PROJECT_IN_TRASH' },
      });
    }
    const t = await restoreTask(as(w.admin), w.t.id, NOW);
    expect(t).toMatchObject({ ok: false, code: 'PROJECT_IN_TRASH' });
    const e = await restoreEvent(as(w.admin), w.ev.id, NOW);
    expect(e).toMatchObject({ ok: false, code: 'PROJECT_IN_TRASH' });
  });

  it('only offers "Lihat proyeknya" to someone who can find the project in the Trash', async () => {
    const w = await trashed();
    const deleter = (await list(w.member)).items.find((i) => i.id === w.t.id);
    // The member deleted nothing: they see no row at all, so the link cannot dead-end.
    expect(deleter).toBeUndefined();
    const manager = (await list(w.lead)).items.find((i) => i.id === w.t.id);
    expect(manager).toMatchObject({ blockedBy: { visible: true } });
  });

  it('keeps projectInTrash false for a live project and once the project is restored', async () => {
    const w = await world();
    await trashEvent(as(w.lead), w.ev.id, T0);
    const live = (await list(w.admin, 'event')).items.find((i) => i.id === w.ev.id);
    expect(live).toMatchObject({ projectInTrash: false, blockedBy: null });
    expect((await restoreEvent(as(w.lead), w.ev.id, NOW)).ok).toBe(true);
    const [row] = await db.select().from(event).where(eq(event.id, w.ev.id));
    expect(row?.deletedAt).toBeNull();
  });
});
