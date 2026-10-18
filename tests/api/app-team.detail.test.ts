/**
 * `GET /api/app/team/:userId` (S6 M04): one person's profile over HTTP. Someone the caller shares
 * no project with answers the same 404 as an id that never existed, the phone number reaches only
 * the person themselves and Admin, and the task list stays inside the caller's load scope.
 *
 * The list hides banned and pending accounts from everyone (M02); the detail lets an Admin open
 * them and answers NOT_FOUND to everybody else. Both halves of that decision are pinned here.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { api } from '../../server/api';
import { setApiKeyIdentity } from '../../server/api-keys/identity';
import { db } from '../../server/db';
import { profile } from '../../server/db/schema';
import { PERSON_TASKS_MAX } from '../../server/team/team.load.query';
import { call, expectApiError, type Json, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW, freezeAt } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'teamdet' });
beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
  // The route reads the clock itself, so "overdue" is pinned to the Atlas today (2026-10-07).
  freezeAt(ATLAS_NOW);
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const BASE = '/app/team';
const PHONE = '0812-0000-0001'; // test-only
const marker = () => `m${crypto.randomUUID().slice(0, 8)}`;

/** Opens `target`'s detail as `who`. */
async function openAs(who: TestUser | null, target: TestUser | string) {
  auth.as(who);
  return call('GET', `${BASE}/${typeof target === 'string' ? target : target.id}`);
}

const okBody = async (who: TestUser, target: TestUser): Promise<Json> => {
  const res = await openAs(who, target);
  expect(res.status).toBe(200);
  return res.body;
};

/**
 * Budi works in X (managed by Eka) with three open tasks, one of them overdue, and in Y (managed
 * by Fajar) with one more. Awan is a plain Member of X, Lusi shares nothing with anybody.
 */
async function graph() {
  const mk = marker();
  const eka = await f.user({ role: 'project_manager', name: `${mk} Eka` });
  const fajar = await f.user({ role: 'project_manager', name: `${mk} Fajar` });
  const awan = await f.user({ name: `${mk} Awan` });
  const budi = await f.user({ name: `${mk} Budi` });
  const lusi = await f.user({ name: `${mk} Lusi` });
  await db.insert(profile).values({
    userId: budi.id,
    phone: PHONE,
    jobTitle: 'Tukang kayu',
    department: 'Lapangan',
  });
  const x = await f.project({
    lead: eka,
    members: [
      [awan, 'member'],
      [budi, 'member'],
    ],
    name: `${mk} X`,
  });
  const y = await f.project({ lead: fajar, members: [[budi, 'member']], name: `${mk} Y` });
  await f.task({ project: x, assignee: budi, status: 'todo', due: '2026-10-01' }); // overdue
  await f.task({ project: x, assignee: budi, status: 'in_progress', due: '2026-12-01' });
  await f.task({ project: x, assignee: budi, status: 'todo', due: null });
  await f.task({ project: y, assignee: budi, status: 'todo', due: '2026-12-02' });
  return { mk, eka, fajar, awan, budi, lusi, x, y };
}

describe('existence is not leaked', () => {
  it('is 401 without a session', async () => {
    const g = await graph();
    expectApiError(await openAs(null, g.budi), 401, 'UNAUTHORIZED');
  });

  it('answers the same 404 for a stranger as for an id that never existed', async () => {
    const g = await graph();
    const stranger = await openAs(g.lusi, g.budi);
    const missing = await openAs(g.lusi, 'no-such-user');
    expectApiError(stranger, 404, 'NOT_FOUND');
    expectApiError(missing, 404, 'NOT_FOUND');
    expect(stranger.body.error).toBe(missing.body.error);
    expect(stranger.body.code).toBe(missing.body.code);
  });

  it('is 404, not 403, for a Project Manager who joined nothing', async () => {
    const g = await graph();
    const lone = await f.user({ role: 'project_manager', name: `${g.mk} Lone` });
    expectApiError(await openAs(lone, g.budi), 404, 'NOT_FOUND');
  });

  it.each(['pending', 'rejected'] as const)(
    'hides a %s account from a colleague but lets an Admin open it',
    async (status) => {
      const g = await graph();
      const held = await f.user({ status, name: `${g.mk} Held` });
      await f.project({ lead: g.eka, members: [[held, 'member']], name: `${g.mk} H` });
      expectApiError(await openAs(g.awan, held), 404, 'NOT_FOUND');
      const admin = await f.user({ role: 'admin', name: `${g.mk} Zadmin` });
      expect((await okBody(admin, held)).person.id).toBe(held.id);
    },
  );

  it('hides a banned account from a colleague but lets an Admin open it', async () => {
    const g = await graph();
    const banned = await f.user({ banned: true, name: `${g.mk} Banned` });
    await f.project({ lead: g.eka, members: [[banned, 'member']], name: `${g.mk} B` });
    expectApiError(await openAs(g.awan, banned), 404, 'NOT_FOUND');
    const admin = await f.user({ role: 'admin', name: `${g.mk} Zadmin` });
    expect((await okBody(admin, banned)).person.id).toBe(banned.id);
  });
});

describe('a colleague sees the profile but not the work', () => {
  it('gives a Member the documented keys, with no tasks, load or phone', async () => {
    const g = await graph();
    const body = await okBody(g.awan, g.budi);
    expect(Object.keys(body).sort()).toEqual(['person', 'projects', 'tasksVisible']);
    expect(body.tasksVisible).toBe(false);
    expect(Object.keys(body.person).sort()).toEqual([
      'department',
      'email',
      'id',
      'jobTitle',
      'name',
    ]);
    expect(body.person).toMatchObject({
      name: `${g.mk} Budi`,
      email: g.budi.email,
      jobTitle: 'Tukang kayu',
    });
    expect(JSON.stringify(body)).not.toContain(PHONE);
    // Quoted, because `tasksVisible` legitimately contains "tasks".
    for (const key of ['load', 'tasks', 'alsoElsewhere', 'active', 'overdue'])
      expect(JSON.stringify(body)).not.toContain(`"${key}"`);
  });

  it('shows only the projects the caller shares, not every project the person works in', async () => {
    const g = await graph();
    const body = await okBody(g.awan, g.budi);
    expect(body.projects).toEqual([{ id: g.x.id, name: `${g.mk} X`, role: 'member' }]);
  });

  it('keeps the phone from a Project Manager who only manages another project', async () => {
    const g = await graph();
    const body = await okBody(g.fajar, g.budi);
    expect(body.person.phone).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain(PHONE);
  });
});

describe('a manager sees the work they are responsible for', () => {
  it('lists the tasks of the managed project only, with the load and the elsewhere flag', async () => {
    const g = await graph();
    const body = await okBody(g.eka, g.budi);
    expect(body).toMatchObject({
      tasksVisible: true,
      load: { active: 3, overdue: 1, alsoElsewhere: true },
      alsoElsewhere: true,
    });
    expect(body.tasks).toHaveLength(3);
    expect(body.tasks.every((t: Json) => t.projectId === g.x.id)).toBe(true);
    expect(Object.keys(body.tasks[0]).sort()).toEqual([
      'dueDate',
      'number',
      'projectId',
      'status',
      'title',
    ]);
    // Overdue first; Y's task is neither listed nor counted.
    expect(body.tasks[0].dueDate).toBe('2026-10-01');
    expect(JSON.stringify(body)).not.toContain('2026-12-02');
  });

  it('still refuses the manager the phone number (Q8)', async () => {
    const g = await graph();
    expect((await okBody(g.eka, g.budi)).person.phone).toBeUndefined();
  });

  it('caps the task list and puts the overdue ones first', async () => {
    const g = await graph();
    const many = await f.user({ name: `${g.mk} Many` });
    const p = await f.project({ lead: g.eka, members: [[many, 'member']], name: `${g.mk} P` });
    await f.task({ project: p, assignee: many, status: 'todo', due: '2026-09-30' });
    await f.tasks(p, PERSON_TASKS_MAX + 1, () => ({
      assignee: many,
      status: 'todo',
      due: '2026-11-30',
    }));
    const body = await okBody(g.eka, many);
    expect(body.tasks).toHaveLength(PERSON_TASKS_MAX);
    expect(body.tasks[0].dueDate).toBe('2026-09-30');
    expect(body.load).toEqual({ active: PERSON_TASKS_MAX + 2, overdue: 1 });
  });
});

describe('Admin and the person themselves', () => {
  it('gives an Admin the phone and every project’s work, with no elsewhere flag', async () => {
    const g = await graph();
    const admin = await f.user({ role: 'admin', name: `${g.mk} Zadmin` });
    const body = await okBody(admin, g.budi);
    expect(body.person.phone).toBe(PHONE);
    expect(body.load).toEqual({ active: 4, overdue: 1 });
    expect(body.alsoElsewhere).toBeUndefined();
    expect(body.projects.map((p: Json) => p.name).sort()).toEqual([`${g.mk} X`, `${g.mk} Y`]);
  });

  it('gives the person themselves their phone and all of their own tasks', async () => {
    const g = await graph();
    const body = await okBody(g.budi, g.budi);
    expect(body.person.phone).toBe(PHONE);
    expect(body.load).toEqual({ active: 4, overdue: 1 });
    expect(body.tasks).toHaveLength(4);
  });

  it('lets a key with app:read open the detail under its owner’s visibility', async () => {
    const g = await graph();
    const request = new Request(`http://localhost/api${BASE}/${g.budi.id}`, { method: 'GET' });
    setApiKeyIdentity(request, {
      keyId: 'team-detail-key',
      keyName: null,
      scopes: ['app:read'],
      user: { id: g.awan.id, email: g.awan.email, name: g.awan.name },
      role: g.awan.role,
      startedAt: Date.now(),
    });
    const res = await api.handle(request);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body).toMatchObject({ tasksVisible: false });
    expect(JSON.stringify(body)).not.toContain(PHONE);
  });
});
