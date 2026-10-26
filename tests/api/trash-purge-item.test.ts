/**
 * Permanent delete from the Trash (S6 Z-04): `DELETE /app/trash/:kind/:id` through the real router.
 * Covers who may (Admin and Super-admin only, whatever they manage), the states that refuse, that
 * nothing is left behind — no child row, no orphan Inbox card — and that no API key gets in.
 * The retention sweep that does the same deletion on a schedule is `tests/trash/trash-purge.test.ts`.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import { API_KEY_PREFIX } from '../../server/auth';
import { db } from '../../server/db';
import {
  auditLog,
  event,
  notification,
  project,
  projectMember,
  task,
  taskActivity,
} from '../../server/db/schema';
import { createEventFactory } from '../event/factory.event';
import { call, expectApiError, resetApiLimiters, waitForAudit } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'purgeitem' });
const events = createEventFactory({ tag: 'purgeitem-e', now: () => new Date() });
const auditedIds: string[] = [];
const cardIds: string[] = [];

beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
});
afterEach(async () => {
  await events.flush();
  if (cardIds.length > 0) {
    await db.delete(notification).where(inArray(notification.id, cardIds.splice(0)));
  }
  if (auditedIds.length > 0) {
    await db.delete(auditLog).where(inArray(auditLog.targetId, auditedIds.splice(0)));
  }
  await cleaner.flushTest();
});
afterAll(async () => {
  await events.flush();
  await cleaner.flushAll();
});

const purge = (kind: string, id: string) => call('DELETE', `/app/trash/${kind}/${id}`);
type Item = { id: string; kind: string; can: { purge?: unknown } };

let lead: TestUser;
let memberManager: TestUser;
let member: TestUser;
let viewer: TestUser;
let outsider: TestUser;
let admin: TestUser;
let superAdmin: TestUser;

beforeAll(async () => {
  await cleaner.shared(async () => {
    lead = await f.user({ role: 'project_manager' });
    memberManager = await f.user();
    member = await f.user();
    viewer = await f.user();
    outsider = await f.user();
    admin = await f.user({ role: 'admin' });
    superAdmin = await f.user({ role: 'super-admin' });
  });
});

/** A project with two tasks and one event, all of it already in the Trash, deleted by its Lead. */
async function trashed(): Promise<{ prj: TestProject; tasks: string[]; eventId: string }> {
  const prj = await f.project({
    lead,
    members: [
      [memberManager, 'manager'],
      [member, 'member'],
      [viewer, 'viewer'],
    ],
  });
  auditedIds.push(prj.id);
  const tasks = [await f.task({ project: prj }), await f.task({ project: prj, status: 'done' })];
  const e = await events.event({ creator: lead, project: prj, startsInMin: 60 });
  auth.as(lead);
  expect((await call('DELETE', `/app/projects/${prj.id}`)).status).toBe(200);
  return { prj, tasks: tasks.map((t) => t.id), eventId: e.id };
}

/** One Inbox card for `recipient` pointing at a row by `refType`/`refId`, as `notify()` writes it. */
async function card(
  recipient: TestUser,
  refType: 'task' | 'event',
  refId: string,
  projectId: string | null,
): Promise<string> {
  const [row] = await db
    .insert(notification)
    .values({
      recipientId: recipient.id,
      actorId: null,
      projectId,
      lane: 'info',
      kind: refType === 'task' ? 'task_changed' : 'event_changed',
      refType,
      refId,
      dedupeKey: `purgeitem:${crypto.randomUUID()}`,
      payload: { title: 'Judul kartu' }, // test-only
    })
    .returning({ id: notification.id });
  const id = (row as { id: string }).id;
  cardIds.push(id);
  return id;
}

const cardsLeft = async (ids: readonly string[]) =>
  ids.length === 0
    ? []
    : (
        await db
          .select({ id: notification.id })
          .from(notification)
          .where(inArray(notification.id, [...ids]))
      ).map((r) => r.id);

describe('sign-in gate', () => {
  it('answers 401 without a session', async () => {
    expectApiError(await purge('project', 'p1'), 401, 'UNAUTHORIZED');
  });
});

describe('who may delete for good', () => {
  it('refuses the PM who deleted it, a Member-manager, a member, a viewer and an outsider with 403', async () => {
    const { prj } = await trashed();
    for (const u of [lead, memberManager, member, viewer, outsider]) {
      auth.as(u);
      expectApiError(await purge('project', prj.id), 403, 'ROLE_CANNOT_PURGE');
    }
    // Still there: a refusal must not have deleted anything.
    expect(
      await db.select({ id: project.id }).from(project).where(eq(project.id, prj.id)),
    ).toHaveLength(1);
  });

  it('lets an Admin delete an item somebody else deleted, and a Super-admin too', async () => {
    const first = await trashed();
    auth.as(admin);
    expect((await purge('project', first.prj.id)).status).toBe(200);

    const second = await trashed();
    auth.as(superAdmin);
    expect((await purge('project', second.prj.id)).status).toBe(200);
  });

  it('refuses a Super-admin who is impersonating somebody', async () => {
    const { prj } = await trashed();
    auth.as(superAdmin, { impersonatedBy: 'someone-else' });
    expectApiError(await purge('project', prj.id), 403, 'IMPERSONATING');
  });

  it('matches the can.purge the Trash list already sent', async () => {
    const { prj } = await trashed();
    const capOf = async (u: TestUser) => {
      auth.as(u);
      const res = await call('GET', '/app/trash?limit=100');
      return (res.body.items as Item[]).find((i) => i.id === prj.id)?.can.purge;
    };
    expect(await capOf(admin)).toBe(true);
    expect(await capOf(superAdmin)).toBe(true);
    // Hidden, not disabled: `DENY_UI.ROLE_CANNOT_PURGE` hides the control for a PM.
    expect(await capOf(lead)).toBeUndefined();
    expect(await capOf(memberManager)).toBeUndefined();
  });
});

describe('DELETE /app/trash/project/:id', () => {
  it('removes the project with its tasks and events and reports the counts', async () => {
    const { prj, tasks, eventId } = await trashed();
    auth.as(admin);
    const res = await purge('project', prj.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      kind: 'project',
      id: prj.id,
      purged: { projects: 1, tasks: 2, events: 1 },
    });
    expect(await db.select({ id: project.id }).from(project).where(eq(project.id, prj.id))).toEqual(
      [],
    );
    expect(await db.select({ id: task.id }).from(task).where(inArray(task.id, tasks))).toEqual([]);
    expect(await db.select({ id: event.id }).from(event).where(eq(event.id, eventId))).toEqual([]);
    auth.as(admin);
    const list = await call('GET', '/app/trash?limit=100');
    expect((list.body.items as Item[]).map((i) => i.id)).not.toContain(prj.id);
  });

  it('leaves no child row behind: members, task history and Inbox cards all go', async () => {
    const { prj, tasks, eventId } = await trashed();
    const taskCard = await card(member, 'task', tasks[0] as string, prj.id);
    const eventCard = await card(member, 'event', eventId, prj.id);
    auth.as(admin);
    expect((await purge('project', prj.id)).status).toBe(200);

    expect(
      await db
        .select({ id: projectMember.userId })
        .from(projectMember)
        .where(eq(projectMember.projectId, prj.id)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: taskActivity.id })
        .from(taskActivity)
        .where(inArray(taskActivity.taskId, tasks)),
    ).toEqual([]);
    // `notification.project_id` CASCADEs, which is why the project path needs no explicit sweep.
    expect(await cardsLeft([taskCard, eventCard])).toEqual([]);
  });

  it('writes one audit entry with a masked email, counts and no project name', async () => {
    const { prj } = await trashed();
    auth.as({ ...admin, email: 'nama.panjang@contoh.test' }); // test-only
    expect((await purge('project', prj.id)).status).toBe(200);

    const rows = await waitForAudit(
      eq(auditLog.targetId, prj.id),
      eq(auditLog.action, 'trash.purge'),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.targetType).toBe('project');
    expect(rows[0]?.actorEmail).not.toContain('nama.panjang');
    expect(rows[0]?.meta).toEqual({ kind: 'project', projects: 1, tasks: 2, events: 1 });
    expect(JSON.stringify(rows[0])).not.toContain(prj.name);
  });

  it('answers 409 NOT_IN_TRASH for a live project and 404 for a second delete', async () => {
    const live = await f.project({ lead });
    auth.as(admin);
    expectApiError(await purge('project', live.id), 409, 'NOT_IN_TRASH');

    const { prj } = await trashed();
    auth.as(admin);
    expect((await purge('project', prj.id)).status).toBe(200);
    expectApiError(await purge('project', prj.id), 404, 'NOT_FOUND');
  });

  it('answers 422 to a kind that is not a Trash kind', async () => {
    auth.as(admin);
    expect((await purge('comment', 'c1')).status).toBe(422);
  });
});

describe('DELETE /app/trash/task/:id', () => {
  it('removes a task trashed on its own, with the Inbox cards that point at it', async () => {
    const prj = await f.project({ lead, members: [[member, 'member']] });
    const t = await f.task({ project: prj });
    auth.as(lead);
    expect((await call('DELETE', `/app/tasks/${t.id}`)).status).toBe(200);
    auditedIds.push(t.id);
    // The project is alive, so `notification.project_id` cascades nothing: the sweep must be explicit.
    const stale = await card(member, 'task', t.id, prj.id);

    auth.as(admin);
    const res = await purge('task', t.id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      kind: 'task',
      id: t.id,
      purged: { projects: 0, tasks: 1, events: 0 },
    });
    expect(await db.select({ id: task.id }).from(task).where(eq(task.id, t.id))).toEqual([]);
    expect(await cardsLeft([stale])).toEqual([]);
    expect(
      await db.select({ id: project.id }).from(project).where(eq(project.id, prj.id)),
    ).toHaveLength(1);
  });

  it('answers 404 for a task that went with its project, and leaves the row for the restore', async () => {
    const { prj, tasks } = await trashed();
    auth.as(admin);
    expectApiError(await purge('task', tasks[0] as string), 404, 'NOT_FOUND');

    expect(await db.select({ id: task.id }).from(task).where(inArray(task.id, tasks))).toHaveLength(
      2,
    );
    auth.as(lead);
    expect((await call('POST', `/app/trash/project/${prj.id}/restore`)).status).toBe(200);
  });

  it('answers 409 NOT_IN_TRASH for a live task', async () => {
    const prj = await f.project({ lead });
    const t = await f.task({ project: prj });
    auth.as(admin);
    expectApiError(await purge('task', t.id), 409, 'NOT_IN_TRASH');
  });
});

describe('DELETE /app/trash/event/:id', () => {
  it('removes a personal event trashed on its own, with its orphan-prone Inbox card', async () => {
    const e = await events.event({ creator: member, project: null, startsInMin: 60 });
    auth.as(member);
    expect((await call('DELETE', `/app/events/${e.id}`)).status).toBe(200);
    auditedIds.push(e.id);
    // A personal event's cards have `project_id IS NULL`: nothing would ever cascade them away.
    const stale = await card(member, 'event', e.id, null);

    auth.as(admin);
    const res = await purge('event', e.id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      kind: 'event',
      id: e.id,
      purged: { projects: 0, tasks: 0, events: 1 },
    });
    expect(await db.select({ id: event.id }).from(event).where(eq(event.id, e.id))).toEqual([]);
    expect(await cardsLeft([stale])).toEqual([]);
  });

  it('answers 404 for an event that went with its project and 409 for a live one', async () => {
    const { prj, eventId } = await trashed();
    auth.as(admin);
    expectApiError(await purge('event', eventId), 404, 'NOT_FOUND');
    expect(
      await db
        .select({ id: event.id })
        .from(event)
        .where(and(eq(event.id, eventId), eq(event.deletedWithProjectId, prj.id))),
    ).toHaveLength(1);

    const live = await events.event({ creator: member, project: null, startsInMin: 60 });
    expectApiError(await purge('event', live.id), 409, 'NOT_IN_TRASH');
  });
});

describe('API keys', () => {
  const key = { 'x-api-key': `${API_KEY_PREFIX}not-a-real-key` }; // test-only

  it.each([
    ['project', 'p1'],
    ['task', 't1'],
    ['event', 'e1'],
  ])('refuses a key on DELETE /app/trash/%s/%s outright, whatever its scopes', async (kind, id) => {
    const res = await call('DELETE', `/app/trash/${kind}/${id}`, undefined, key);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Endpoint ini tidak bisa diakses dengan API key');
  });
});
