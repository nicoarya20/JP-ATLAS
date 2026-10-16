/** Project writes (S1-03): atomic create, forced managers, default kinds, edit/status/Lead permissions and guards. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { asc, eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project, projectActivity, projectMember, taskKind } from '../../server/db/schema';
import { DEFAULT_TASK_KINDS } from '../../server/pm/limits';
import { toPrincipal } from '../../server/project/membership.query';
import {
  type CreateProjectInput,
  createProject,
  isCalendarDate,
  PROJECT_WRITE_MESSAGES,
  setProjectLead,
  setProjectStatus,
  updateProject,
} from '../../server/project/project.service';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'prjsvc' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const principal = (u: TestUser) => toPrincipal({ user: u, role: u.role });
const marker = () => `m${crypto.randomUUID().slice(0, 8)}`;

/** Creates through the service and tracks the new row so the cleaner removes it. */
async function create(u: TestUser, input: Partial<CreateProjectInput> = {}) {
  const r = await createProject(principal(u), { name: marker(), ...input });
  if (r.ok) cleaner.track('project', r.value.id);
  return r;
}

const projectsNamed = (name: string) => db.select().from(project).where(eq(project.name, name));
const members = (id: string) =>
  db
    .select({ userId: projectMember.userId, role: projectMember.role })
    .from(projectMember)
    .where(eq(projectMember.projectId, id));
const roleOf = async (id: string, userId: string) =>
  (await members(id)).find((m) => m.userId === userId)?.role;

describe('createProject', () => {
  it('writes the project, the creator as manager, three kinds and a created activity', async () => {
    const pm = await f.user({ role: 'project_manager' });
    const r = await create(pm, { name: '  Renovasi Dapur  ', dueDate: '2030-01-31' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [row] = await db.select().from(project).where(eq(project.id, r.value.id));
    expect(row).toMatchObject({
      name: 'Renovasi Dapur',
      status: 'draft',
      priority: 'medium',
      leadId: pm.id,
      createdBy: pm.id,
      tasksNeedReviewDefault: false,
      originalDueDate: null,
    });
    expect(await members(r.value.id)).toEqual([{ userId: pm.id, role: 'manager' }]);
    const kinds = await db
      .select({ name: taskKind.name, baseKind: taskKind.baseKind, position: taskKind.position })
      .from(taskKind)
      .where(eq(taskKind.projectId, r.value.id))
      .orderBy(asc(taskKind.position));
    expect(kinds).toEqual(DEFAULT_TASK_KINDS.map((k, position) => ({ ...k, position })));
    const acts = await db
      .select()
      .from(projectActivity)
      .where(eq(projectActivity.projectId, r.value.id));
    expect(acts.map((a) => [a.action, a.actorId, a.actorName])).toEqual([
      ['created', pm.id, pm.name],
    ]);
  });

  it('forces the Lead to manager and drops duplicate members', async () => {
    const pm = await f.user({ role: 'project_manager' });
    const lead = await f.user();
    const a = await f.user();
    const r = await create(pm, {
      leadId: lead.id,
      members: [
        { userId: lead.id, role: 'viewer' },
        { userId: a.id, role: 'member' },
        { userId: a.id, role: 'manager' },
        { userId: pm.id, role: 'viewer' },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const rows = await members(r.value.id);
    expect(rows).toHaveLength(3);
    expect(await roleOf(r.value.id, lead.id)).toBe('manager');
    expect(await roleOf(r.value.id, pm.id)).toBe('manager');
    expect(await roleOf(r.value.id, a.id)).toBe('member');
    const [row] = await db.select().from(project).where(eq(project.id, r.value.id));
    expect(row?.leadId).toBe(lead.id);
  });

  it.each([
    ['pending', { status: 'pending' as const }],
    ['banned', { banned: true }],
  ])('leaves no project row when a member is %s', async (_label, opts) => {
    const pm = await f.user({ role: 'project_manager' });
    const ok = await f.user();
    const bad = await f.user(opts);
    const name = marker();
    const r = await create(pm, {
      name,
      members: [
        { userId: ok.id, role: 'member' },
        { userId: bad.id, role: 'member' },
      ],
    });
    expect(r).toEqual({
      ok: false,
      code: 'VALIDATION',
      error: PROJECT_WRITE_MESSAGES.BAD_CANDIDATE,
    });
    expect(await projectsNamed(name)).toEqual([]);
  });

  it('leaves no project row for an unknown member or Lead id', async () => {
    const pm = await f.user({ role: 'project_manager' });
    const name = marker();
    const r = await create(pm, { name, leadId: `${f.tag}-nobody` });
    expect(r.ok).toBe(false);
    expect(await projectsNamed(name)).toEqual([]);
  });

  it('refuses a Member by account role', async () => {
    const r = await create(await f.user());
    expect(r).toEqual({ ok: false, code: 'NOT_APP_ROLE' });
  });

  it.each(['completed', 'on_hold', 'canceled'] as const)(
    'rejects starting as %s',
    async (status) => {
      const r = await create(await f.user({ role: 'admin' }), { status });
      expect(r).toMatchObject({ ok: false, code: 'VALIDATION' });
    },
  );

  it('accepts starting as active', async () => {
    const r = await create(await f.user({ role: 'admin' }), { status: 'active' });
    expect(r.ok).toBe(true);
  });

  it('rejects tasksNeedReviewDefault while reviewing is not available, accepts false', async () => {
    const pm = await f.user({ role: 'project_manager' });
    expect(await create(pm, { tasksNeedReviewDefault: true })).toMatchObject({
      ok: false,
      code: 'VALIDATION',
      error: PROJECT_WRITE_MESSAGES.REVIEW_UNAVAILABLE,
    });
    expect((await create(pm, { tasksNeedReviewDefault: false })).ok).toBe(true);
  });

  it('rejects a due date before the start, an impossible date and a blank name', async () => {
    const pm = await f.user({ role: 'project_manager' });
    expect(await create(pm, { startDate: '2030-02-10', dueDate: '2030-02-01' })).toMatchObject({
      code: 'VALIDATION',
      error: PROJECT_WRITE_MESSAGES.DUE_BEFORE_START,
    });
    expect(await create(pm, { dueDate: '2030-02-30' })).toMatchObject({
      error: PROJECT_WRITE_MESSAGES.BAD_DATE,
    });
    expect(await create(pm, { name: '   ' })).toMatchObject({
      error: PROJECT_WRITE_MESSAGES.NAME_REQUIRED,
    });
  });
});

describe('isCalendarDate', () => {
  it.each([
    ['2026-02-28', true],
    ['2028-02-29', true],
    ['2026-02-29', false],
    ['2026-13-01', false],
    ['26-01-01', false],
  ])('%s → %p', (s, want) => {
    expect(isCalendarDate(s)).toBe(want);
  });
});

/** A project with one person per project role, plus a non-member Project Manager. */
async function graph(opts: { startDate?: string; dueDate?: string } = {}) {
  const lead = await f.user({ role: 'project_manager' });
  const manager2 = await f.user();
  const member = await f.user();
  const viewer = await f.user();
  const pmX = await f.user({ role: 'project_manager' });
  const p = await f.project({
    lead,
    members: [
      [manager2, 'manager'],
      [member, 'member'],
      [viewer, 'viewer'],
    ],
    startDate: opts.startDate ?? '2030-01-01',
    dueDate: opts.dueDate ?? '2030-03-01',
  });
  return { lead, manager2, member, viewer, pmX, p };
}

const read = async (id: string) => (await db.select().from(project).where(eq(project.id, id)))[0];

describe('updateProject', () => {
  it('lets a manager change details and the due date directly (KB-3)', async () => {
    const { manager2, p } = await graph();
    const r = await updateProject(principal(manager2), p.id, {
      name: 'Nama baru',
      description: 'Isi',
      priority: 'high',
      dueDate: '2030-06-30',
    });
    expect(r).toEqual({ ok: true, value: { id: p.id } });
    expect(await read(p.id)).toMatchObject({
      name: 'Nama baru',
      description: 'Isi',
      priority: 'high',
      dueDate: '2030-06-30',
      originalDueDate: null,
    });
  });

  it('refuses a Member, a viewer and a non-member Project Manager', async () => {
    const { member, viewer, pmX, p } = await graph();
    for (const u of [member, viewer, pmX]) {
      expect(await updateProject(principal(u), p.id, { name: 'x' })).toEqual({
        ok: false,
        code: 'NOT_MANAGER',
      });
    }
    expect((await read(p.id))?.name).toBe(p.name);
  });

  it('answers NOT_FOUND to an outsider and for a missing id', async () => {
    const { p } = await graph();
    const outsider = await f.user();
    expect(await updateProject(principal(outsider), p.id, { name: 'x' })).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
    const admin = await f.user({ role: 'admin' });
    expect(await updateProject(principal(admin), `${f.tag}-none`, { name: 'x' })).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
  });

  it('checks the due date against the stored start date', async () => {
    const { lead, p } = await graph({ startDate: '2030-05-01', dueDate: '2030-06-01' });
    expect(await updateProject(principal(lead), p.id, { dueDate: '2030-04-01' })).toMatchObject({
      code: 'VALIDATION',
      error: PROJECT_WRITE_MESSAGES.DUE_BEFORE_START,
    });
    expect(
      (await updateProject(principal(lead), p.id, { startDate: null, dueDate: '2030-04-01' })).ok,
    ).toBe(true);
  });

  it('answers PROJECT_IN_TRASH for a trashed project', async () => {
    const { lead, p } = await graph();
    await db
      .update(project)
      .set({ deletedAt: new Date(), deletedBy: lead.id })
      .where(eq(project.id, p.id));
    expect(await updateProject(principal(lead), p.id, { name: 'x' })).toEqual({
      ok: false,
      code: 'PROJECT_IN_TRASH',
    });
    expect(await setProjectStatus(principal(lead), p.id, 'active')).toMatchObject({
      code: 'PROJECT_IN_TRASH',
    });
  });
});

describe('setProjectStatus', () => {
  it('moves freely between the five statuses, including completed → active (KB-12)', async () => {
    const { lead, p } = await graph();
    const me = principal(lead);
    for (const s of ['on_hold', 'completed', 'active', 'canceled', 'draft'] as const) {
      expect((await setProjectStatus(me, p.id, s)).ok).toBe(true);
      const row = await read(p.id);
      expect(row?.status).toBe(s);
      expect(row?.completedAt === null).toBe(s !== 'completed');
    }
    const acts = await db
      .select({ action: projectActivity.action })
      .from(projectActivity)
      .where(eq(projectActivity.projectId, p.id));
    expect(acts.filter((a) => a.action === 'status_changed')).toHaveLength(5);
  });

  it('refuses a Member', async () => {
    const { member, p } = await graph();
    expect(await setProjectStatus(principal(member), p.id, 'completed')).toEqual({
      ok: false,
      code: 'NOT_MANAGER',
    });
  });
});

describe('setProjectLead', () => {
  it('hands the Lead to another manager', async () => {
    const { lead, manager2, p } = await graph();
    expect(await setProjectLead(principal(lead), p.id, manager2.id)).toEqual({
      ok: true,
      value: { id: p.id },
    });
    expect((await read(p.id))?.leadId).toBe(manager2.id);
  });

  it('answers LEAD_MUST_BE_MANAGER for a member, a viewer or a stranger', async () => {
    const { lead, member, viewer, pmX, p } = await graph();
    for (const u of [member, viewer, pmX]) {
      expect(await setProjectLead(principal(lead), p.id, u.id)).toEqual({
        ok: false,
        code: 'LEAD_MUST_BE_MANAGER',
      });
    }
    expect((await read(p.id))?.leadId).toBe(lead.id);
  });

  it('refuses a Member and a non-member Project Manager', async () => {
    const { member, pmX, manager2, p } = await graph();
    for (const u of [member, pmX]) {
      expect(await setProjectLead(principal(u), p.id, manager2.id)).toEqual({
        ok: false,
        code: 'NOT_MANAGER',
      });
    }
  });
});
