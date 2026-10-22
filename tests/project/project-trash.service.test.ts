/** Project Trash (S1-05): delete cascade, who may delete/restore, retention, and the hidden list/detail. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { project, projectActivity, task } from '../../server/db/schema';
import type { Role } from '../../server/permissions';
import { toPrincipal } from '../../server/project/membership.query';
import { getProjectDetail, listProjects } from '../../server/project/project.query';
import { restoreProject, trashProject } from '../../server/project/project-trash.service';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW, freezeAt } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'prjtrash' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const DAY_MS = 86_400_000;
const as = (u: TestUser, role: Role = u.role, impersonating = false): Principal => ({
  ...toPrincipal({ user: u, role }),
  impersonating,
});
const projectRow = async (id: string) =>
  (await db.select().from(project).where(eq(project.id, id)))[0];
const taskRow = async (id: string) => (await db.select().from(task).where(eq(task.id, id)))[0];
const actions = async (projectId: string) =>
  (
    await db
      .select({ action: projectActivity.action, payload: projectActivity.payload })
      .from(projectActivity)
      .where(eq(projectActivity.projectId, projectId))
  ).filter((a) => a.action === 'trashed' || a.action === 'restored');

/** PM Lead, a Member-manager, a member, a viewer; two live tasks and one trashed on its own earlier. */
async function atlas() {
  const lead = await f.user({ role: 'project_manager' });
  const memberManager = await f.user();
  const member = await f.user();
  const viewer = await f.user();
  const prj = await f.project({
    lead,
    members: [
      [memberManager, 'manager'],
      [member, 'member'],
      [viewer, 'viewer'],
    ],
  });
  const todo = await f.task({ project: prj, status: 'todo' });
  const done = await f.task({ project: prj, status: 'done' });
  const earlier = await f.task({ project: prj, deletedAt: new Date(Date.now() - DAY_MS) });
  return { lead, memberManager, member, viewer, prj, todo, done, earlier };
}

describe('trashProject', () => {
  it('moves the project and only its live tasks in one go, and records the activity', async () => {
    const { lead, prj, todo, done, earlier } = await atlas();
    const r = await trashProject(as(lead), prj.id);
    expect(r).toEqual({ ok: true, value: { id: prj.id, tasks: 2 } });

    const row = await projectRow(prj.id);
    expect(row?.deletedAt).toBeInstanceOf(Date);
    expect(row?.deletedBy).toBe(lead.id);
    for (const t of [todo, done]) {
      const moved = await taskRow(t.id);
      expect(moved?.deletedAt?.getTime()).toBe(row?.deletedAt?.getTime());
      expect(moved?.deletedWithProjectId).toBe(prj.id);
    }
    expect((await taskRow(earlier.id))?.deletedWithProjectId).toBeNull();
    expect(await actions(prj.id)).toEqual([{ action: 'trashed', payload: { tasks: 2 } }]);
  });

  it('hides the trashed project from the list and the detail (404)', async () => {
    const { lead, member, prj } = await atlas();
    await trashProject(as(lead), prj.id);
    for (const u of [lead, member]) {
      const now = new Date();
      expect(await getProjectDetail(as(u), prj.id, now)).toBeNull();
      const list = await listProjects(as(u), { scope: 'all', limit: 50, offset: 0, now });
      expect(list.items.map((i) => i.id)).not.toContain(prj.id);
    }
  });

  it.each([
    ['Admin', 'admin'],
    ['Super-admin', 'super-admin'],
  ] as const)('lets an %s who is not a member delete it', async (_label, role) => {
    const { prj } = await atlas();
    const boss = await f.user({ role: 'admin' });
    expect(await trashProject(as(boss, role), prj.id)).toMatchObject({ ok: true });
  });

  it.each([
    ['a Member-manager', 'memberManager', 'ROLE_CANNOT_TRASH'],
    ['a plain member', 'member', 'NOT_MANAGER'],
    ['a viewer', 'viewer', 'NOT_MANAGER'],
  ] as const)('refuses %s with %s and writes nothing', async (_label, who, code) => {
    const team = await atlas();
    expect(await trashProject(as(team[who]), team.prj.id)).toEqual({ ok: false, code });
    expect((await projectRow(team.prj.id))?.deletedAt).toBeNull();
    expect((await taskRow(team.todo.id))?.deletedAt).toBeNull();
    expect(await actions(team.prj.id)).toEqual([]);
  });

  it('answers a non-member and a missing id with NOT_FOUND', async () => {
    const { prj } = await atlas();
    const outsider = await f.user();
    expect(await trashProject(as(outsider), prj.id)).toEqual({ ok: false, code: 'NOT_FOUND' });
    expect(await trashProject(as(outsider), 'nope')).toEqual({ ok: false, code: 'NOT_FOUND' });
  });

  it('refuses while impersonating and a project already in the Trash', async () => {
    const { lead, prj } = await atlas();
    expect(await trashProject(as(lead, lead.role, true), prj.id)).toEqual({
      ok: false,
      code: 'IMPERSONATING',
    });
    await trashProject(as(lead), prj.id);
    expect(await trashProject(as(lead), prj.id)).toEqual({ ok: false, code: 'PROJECT_IN_TRASH' });
  });
});

describe('restoreProject', () => {
  it.each([
    ['the PM Lead', 'lead'],
    ['a Member-manager (who may not delete)', 'memberManager'],
  ] as const)('lets %s restore the project with exactly its tasks', async (_label, who) => {
    const team = await atlas();
    await trashProject(as(team.lead), team.prj.id);
    const r = await restoreProject(as(team[who]), team.prj.id);
    expect(r).toEqual({ ok: true, value: { id: team.prj.id, tasks: 2 } });
    expect(await projectRow(team.prj.id)).toMatchObject({ deletedAt: null, deletedBy: null });
    for (const t of [team.todo, team.done]) {
      expect(await taskRow(t.id)).toMatchObject({
        deletedAt: null,
        deletedBy: null,
        deletedWithProjectId: null,
      });
    }
    // Trashed on its own before the project: it stays in the Trash.
    expect((await taskRow(team.earlier.id))?.deletedAt).toBeInstanceOf(Date);
    expect((await actions(team.prj.id)).map((a) => a.action).sort()).toEqual([
      'restored',
      'trashed',
    ]);
    expect(await getProjectDetail(as(team.member), team.prj.id, new Date())).not.toBeNull();
  });

  it('lets an Admin who is not a member restore it', async () => {
    const { lead, prj } = await atlas();
    const admin = await f.user({ role: 'admin' });
    await trashProject(as(lead), prj.id);
    expect(await restoreProject(as(admin), prj.id)).toMatchObject({ ok: true });
  });

  it.each([
    ['a plain member', 'member', 'NOT_MANAGER'],
    ['a viewer', 'viewer', 'NOT_MANAGER'],
  ] as const)('refuses %s with %s', async (_label, who, code) => {
    const team = await atlas();
    await trashProject(as(team.lead), team.prj.id);
    expect(await restoreProject(as(team[who]), team.prj.id)).toEqual({ ok: false, code });
    expect((await projectRow(team.prj.id))?.deletedAt).toBeInstanceOf(Date);
  });

  it('refuses a non-member (NOT_FOUND), an impersonator and a live project (WRONG_STATE)', async () => {
    const { lead, prj } = await atlas();
    const outsider = await f.user();
    expect(await restoreProject(as(lead), prj.id)).toEqual({ ok: false, code: 'WRONG_STATE' });
    await trashProject(as(lead), prj.id);
    expect(await restoreProject(as(outsider), prj.id)).toEqual({ ok: false, code: 'NOT_FOUND' });
    expect(await restoreProject(as(lead, lead.role, true), prj.id)).toEqual({
      ok: false,
      code: 'IMPERSONATING',
    });
  });

  it('restores on day 30 but answers EXPIRED on day 31 and changes nothing', async () => {
    const { lead, prj, todo } = await atlas();
    freezeAt(ATLAS_NOW); // 7 Oct 10:00 WIB = day 1
    await trashProject(as(lead), prj.id);

    freezeAt(new Date(ATLAS_NOW.getTime() + 30 * DAY_MS)); // 6 Nov = day 31
    expect(await restoreProject(as(lead), prj.id)).toEqual({ ok: false, code: 'EXPIRED' });
    expect((await taskRow(todo.id))?.deletedWithProjectId).toBe(prj.id);

    freezeAt(new Date(ATLAS_NOW.getTime() + 29 * DAY_MS)); // 5 Nov = day 30
    expect(await restoreProject(as(lead), prj.id)).toMatchObject({ ok: true });
  });

  it('lets only one of two simultaneous restores win (row lock), the other sees WRONG_STATE', async () => {
    const { lead, prj } = await atlas();
    await trashProject(as(lead), prj.id);
    const [back, again] = await Promise.all([
      restoreProject(as(lead), prj.id),
      restoreProject(as(lead), prj.id),
    ]);
    expect([back.ok, again.ok].sort()).toEqual([false, true]);
    expect([back, again].find((r) => !r.ok)).toEqual({ ok: false, code: 'WRONG_STATE' });
    const live = await db
      .select({ id: task.id })
      .from(task)
      .where(and(eq(task.projectId, prj.id), eq(task.deletedWithProjectId, prj.id)));
    expect(live).toEqual([]);
  });
});
