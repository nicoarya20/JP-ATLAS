/** Member writes (S1-04): add/change/remove, who may, last-manager and Lead guards, candidates, row lock. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project, projectActivity, projectMember, user } from '../../server/db/schema';
import {
  addMember,
  changeMemberRole,
  MEMBER_WRITE_MESSAGES,
  removeMember,
} from '../../server/project/member.service';
import { toPrincipal } from '../../server/project/membership.query';
import { setProjectLead } from '../../server/project/project.service';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'mbrsvc' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

/** Time for both racing calls to reach the row lock before it is released. */
const RACE_SETTLE_MS = 50;

const principal = (u: TestUser, impersonating = false) => ({
  ...toPrincipal({ user: u, role: u.role }),
  impersonating,
});
const roles = async (projectId: string) =>
  Object.fromEntries(
    (
      await db
        .select({ userId: projectMember.userId, role: projectMember.role })
        .from(projectMember)
        .where(eq(projectMember.projectId, projectId))
    ).map((m) => [m.userId, m.role]),
  );

/** Lead (manager) + a member + a viewer, and a free approved account to add. */
async function team() {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const viewer = await f.user();
  const free = await f.user();
  const prj = await f.project({
    lead,
    members: [
      [member, 'member'],
      [viewer, 'viewer'],
    ],
  });
  return { lead, member, viewer, free, prj };
}

describe('addMember', () => {
  it('adds an approved account and records the activity', async () => {
    const { lead, free, prj } = await team();
    const r = await addMember(principal(lead), prj.id, { userId: free.id, role: 'member' });
    expect(r).toEqual({ ok: true, value: { userId: free.id, role: 'member' } });
    expect((await roles(prj.id))[free.id]).toBe('member');
    const acts = await db
      .select()
      .from(projectActivity)
      .where(eq(projectActivity.projectId, prj.id));
    expect(acts.map((a) => [a.action, a.actorId, a.payload])).toEqual([
      ['member_added', lead.id, { userId: free.id, role: 'member' }],
    ]);
  });

  it('refuses someone who is already a member with 422', async () => {
    const { lead, member, prj } = await team();
    const r = await addMember(principal(lead), prj.id, { userId: member.id, role: 'manager' });
    expect(r).toEqual({
      ok: false,
      code: 'VALIDATION',
      error: MEMBER_WRITE_MESSAGES.ALREADY_MEMBER,
    });
    expect((await roles(prj.id))[member.id]).toBe('member');
  });

  it.each([
    ['pending', { status: 'pending' as const }],
    ['rejected', { status: 'rejected' as const }],
    ['banned', { banned: true }],
  ])('refuses a %s account as a candidate', async (_label, opts) => {
    const { lead, prj } = await team();
    const held = await f.user(opts);
    const r = await addMember(principal(lead), prj.id, { userId: held.id, role: 'member' });
    expect(r).toEqual({
      ok: false,
      code: 'VALIDATION',
      error: MEMBER_WRITE_MESSAGES.BAD_CANDIDATE,
    });
    expect((await roles(prj.id))[held.id]).toBeUndefined();
  });

  it('refuses an unknown account but accepts one whose ban has expired', async () => {
    const { lead, prj } = await team();
    const unknown = await addMember(principal(lead), prj.id, { userId: 'nobody', role: 'member' });
    expect(unknown).toMatchObject({ ok: false, code: 'VALIDATION' });
    const lapsed = await f.user({ banned: true });
    await db
      .update(user)
      .set({ banExpires: new Date(Date.now() - 60_000) })
      .where(eq(user.id, lapsed.id));
    const r = await addMember(principal(lead), prj.id, { userId: lapsed.id, role: 'viewer' });
    expect(r.ok).toBe(true);
  });

  it('lets an Admin who is not a member add people', async () => {
    const { free, prj } = await team();
    const admin = await f.user({ role: 'admin' });
    const r = await addMember(principal(admin), prj.id, { userId: free.id, role: 'manager' });
    expect(r.ok).toBe(true);
  });

  it('refuses members, viewers and non-member Project Managers; hides the project from outsiders', async () => {
    const { member, viewer, free, prj } = await team();
    const pmX = await f.user({ role: 'project_manager' });
    const input = { userId: free.id, role: 'member' } as const;
    for (const u of [member, viewer, pmX]) {
      expect(await addMember(principal(u), prj.id, input)).toEqual({
        ok: false,
        code: 'NOT_MANAGER',
      });
    }
    const outsider = await f.user();
    expect(await addMember(principal(outsider), prj.id, input)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(await addMember(principal(outsider), 'no-such-project', input)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
  });

  it('refuses changes on a project in the Trash', async () => {
    const { lead, free, prj } = await team();
    await db
      .update(project)
      .set({ deletedAt: new Date(), deletedBy: lead.id })
      .where(eq(project.id, prj.id));
    const r = await addMember(principal(lead), prj.id, { userId: free.id, role: 'member' });
    expect(r).toEqual({ ok: false, code: 'PROJECT_IN_TRASH' });
  });
});

describe('changeMemberRole', () => {
  it('changes a role and treats the same role as a no-op', async () => {
    const { lead, member, prj } = await team();
    expect((await changeMemberRole(principal(lead), prj.id, member.id, 'manager')).ok).toBe(true);
    expect((await roles(prj.id))[member.id]).toBe('manager');
    expect((await changeMemberRole(principal(lead), prj.id, member.id, 'manager')).ok).toBe(true);
    const acts = await db
      .select({ action: projectActivity.action, payload: projectActivity.payload })
      .from(projectActivity)
      .where(eq(projectActivity.projectId, prj.id));
    expect(acts).toEqual([
      {
        action: 'member_role_changed',
        payload: { userId: member.id, from: 'member', to: 'manager' },
      },
    ]);
  });

  it('keeps the only manager a manager (409 LAST_MANAGER)', async () => {
    const { lead, prj } = await team();
    const r = await changeMemberRole(principal(lead), prj.id, lead.id, 'member');
    expect(r).toEqual({
      ok: false,
      code: 'LAST_MANAGER',
      error: MEMBER_WRITE_MESSAGES.LAST_MANAGER,
    });
    expect(MEMBER_WRITE_MESSAGES.LAST_MANAGER).toContain('Jadikan Pengelola utama lain');
  });

  it('cannot demote the Lead while another manager exists (409 IS_LEAD)', async () => {
    const { lead, member, prj } = await team();
    await changeMemberRole(principal(lead), prj.id, member.id, 'manager');
    const r = await changeMemberRole(principal(member), prj.id, lead.id, 'viewer');
    expect(r).toEqual({ ok: false, code: 'IS_LEAD', error: MEMBER_WRITE_MESSAGES.IS_LEAD });
    expect(MEMBER_WRITE_MESSAGES.IS_LEAD).toContain('Jadikan Pengelola utama lain');
    expect((await roles(prj.id))[lead.id]).toBe('manager');
  });

  it('answers NOT_FOUND for someone who is not a member', async () => {
    const { lead, free, prj } = await team();
    const r = await changeMemberRole(principal(lead), prj.id, free.id, 'member');
    expect(r).toEqual({ ok: false, code: 'NOT_FOUND' });
  });

  it('is blocked while a super-admin impersonates (Q9)', async () => {
    const { lead, member, prj } = await team();
    const r = await changeMemberRole(principal(lead, true), prj.id, member.id, 'viewer');
    expect(r).toEqual({ ok: false, code: 'IMPERSONATING' });
  });

  it('does not make a viewer the Lead (422 LEAD_MUST_BE_MANAGER)', async () => {
    const { lead, viewer, prj } = await team();
    const r = await setProjectLead(principal(lead), prj.id, viewer.id);
    expect(r).toEqual({ ok: false, code: 'LEAD_MUST_BE_MANAGER' });
  });
});

describe('removeMember', () => {
  it('removes a member and records the activity', async () => {
    const { lead, viewer, prj } = await team();
    const r = await removeMember(principal(lead), prj.id, viewer.id);
    expect(r).toEqual({ ok: true, value: { userId: viewer.id, role: null } });
    expect((await roles(prj.id))[viewer.id]).toBeUndefined();
    const [act] = await db
      .select()
      .from(projectActivity)
      .where(eq(projectActivity.projectId, prj.id));
    expect(act).toMatchObject({
      action: 'member_removed',
      payload: { userId: viewer.id, role: 'viewer' },
    });
  });

  it('keeps the Lead and the last manager', async () => {
    const { lead, member, prj } = await team();
    const admin = await f.user({ role: 'admin' });
    expect(await removeMember(principal(admin), prj.id, lead.id)).toMatchObject({
      ok: false,
      code: 'LAST_MANAGER',
    });
    await changeMemberRole(principal(lead), prj.id, member.id, 'manager');
    expect(await removeMember(principal(admin), prj.id, lead.id)).toMatchObject({
      ok: false,
      code: 'IS_LEAD',
    });
  });

  it('refuses removing yourself: members cannot leave a project (D3)', async () => {
    const { lead, member, prj } = await team();
    await changeMemberRole(principal(lead), prj.id, member.id, 'manager');
    const r = await removeMember(principal(member), prj.id, member.id);
    expect(r).toEqual({
      ok: false,
      code: 'SELF_TARGET',
      error: MEMBER_WRITE_MESSAGES.NO_SELF_LEAVE,
    });
    expect((await roles(prj.id))[member.id]).toBe('manager');
  });

  it('refuses a member removing someone, and answers NOT_FOUND for a non-member target', async () => {
    const { lead, member, viewer, free, prj } = await team();
    expect(await removeMember(principal(member), prj.id, viewer.id)).toEqual({
      ok: false,
      code: 'NOT_MANAGER',
    });
    expect(await removeMember(principal(lead), prj.id, free.id)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(await removeMember(principal(lead, true), prj.id, viewer.id)).toEqual({
      ok: false,
      code: 'IMPERSONATING',
    });
  });

  it('lets exactly one of two concurrent removals of the last two managers succeed', async () => {
    const a = await f.user();
    const b = await f.user();
    const prj = await f.project({ lead: a, members: [[b, 'manager']] });
    // A Lead whose account was deleted leaves `lead_id` empty: then only the last-manager guard holds.
    await db.update(project).set({ leadId: null }).where(eq(project.id, prj.id));
    const admin = await f.user({ role: 'admin' });
    // Hold the project row so both removals start before either can commit: without the
    // service's FOR UPDATE both would read two managers and both would succeed.
    let release = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let held = () => {};
    const holding = new Promise<void>((r) => {
      held = r;
    });
    const holder = db.transaction(async (tx) => {
      await tx.select({ id: project.id }).from(project).where(eq(project.id, prj.id)).for('update');
      held();
      await gate;
    });
    await holding;
    const pending = Promise.all([
      removeMember(principal(admin), prj.id, a.id),
      removeMember(principal(admin), prj.id, b.id),
    ]);
    await Bun.sleep(RACE_SETTLE_MS);
    release();
    await holder;
    const results = await pending;
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).map((r) => !r.ok && r.code)).toEqual(['LAST_MANAGER']);
    expect(Object.values(await roles(prj.id))).toEqual(['manager']);
  });
});
