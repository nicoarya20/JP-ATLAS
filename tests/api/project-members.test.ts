/** Member API (S1-04): add/change/remove through the real router, guard codes, 404 for outsiders, people picker. */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project, projectMember } from '../../server/db/schema';
import { PICKER_LIMIT_MAX } from '../../server/team/picker.query';
import { call, expectApiError, type Json } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'mbrapi' });
beforeEach(() => auth.as(null));
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const members = (id: string) => `/app/projects/${id}/members`;
const roleIn = (body: Json, userId: string) =>
  (body.items as Json[]).find((m) => m.userId === userId)?.role;

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

describe('sign-in gate', () => {
  it.each([
    ['POST', '/app/projects/p1/members'],
    ['PATCH', '/app/projects/p1/members/u1'],
    ['DELETE', '/app/projects/p1/members/u1'],
    ['GET', '/app/team/picker'],
  ])('%s %s without a session is 401', async (method, path) => {
    expectApiError(
      await call(method, path, method === 'GET' ? undefined : {}),
      401,
      'UNAUTHORIZED',
    );
  });
});

describe('add, change and remove', () => {
  it('adds a member (201) and answers with the fresh member list', async () => {
    const { lead, free, prj } = await team();
    auth.as(lead);
    const res = await call('POST', members(prj.id), { userId: free.id, role: 'member' });
    expect(res.status).toBe(201);
    expect(roleIn(res.body, free.id)).toBe('member');
    expect(Object.keys(res.body.items[0]).sort()).toEqual(
      ['image', 'isLead', 'jobTitle', 'joinedAt', 'name', 'role', 'userId'].sort(),
    );
  });

  it('changes a role and removes a member', async () => {
    const { lead, member, viewer, prj } = await team();
    auth.as(lead);
    const changed = await call('PATCH', `${members(prj.id)}/${member.id}`, { role: 'manager' });
    expect(changed.status).toBe(200);
    expect(roleIn(changed.body, member.id)).toBe('manager');
    const removed = await call('DELETE', `${members(prj.id)}/${viewer.id}`);
    expect(removed.status).toBe(200);
    expect(roleIn(removed.body, viewer.id)).toBeUndefined();
  });

  it('answers 422 VALIDATION for someone already in the project', async () => {
    const { lead, member, prj } = await team();
    auth.as(lead);
    const res = await call('POST', members(prj.id), { userId: member.id, role: 'viewer' });
    expectApiError(res, 422, 'VALIDATION');
  });

  it.each([
    ['pending', { status: 'pending' as const }],
    ['banned', { banned: true }],
  ])('does not take a %s account as a candidate', async (_label, opts) => {
    const { lead, prj } = await team();
    const held = await f.user(opts);
    auth.as(lead);
    const res = await call('POST', members(prj.id), { userId: held.id, role: 'member' });
    expectApiError(res, 422, 'VALIDATION');
  });

  it('rejects an unknown role (422) and ignores keys outside the list', async () => {
    const { lead, free, prj } = await team();
    auth.as(lead);
    const bad = await call('POST', members(prj.id), { userId: free.id, role: 'owner' });
    expectApiError(bad, 422, 'VALIDATION');
    const extra = { userId: free.id, role: 'member', addedBy: 'someone-else' };
    expect((await call('POST', members(prj.id), extra)).status).toBe(201);
    const [row] = await db
      .select({ addedBy: projectMember.addedBy })
      .from(projectMember)
      .where(and(eq(projectMember.projectId, prj.id), eq(projectMember.userId, free.id)));
    expect(row?.addedBy).toBe(lead.id);
  });
});

describe('guards', () => {
  it('keeps the last manager: demoting or removing them is 409 LAST_MANAGER', async () => {
    const { lead, prj } = await team();
    const admin = await f.user({ role: 'admin' });
    auth.as(admin);
    const demote = await call('PATCH', `${members(prj.id)}/${lead.id}`, { role: 'member' });
    expectApiError(demote, 409, 'LAST_MANAGER');
    expect(demote.body.error).toContain('Jadikan Pengelola utama lain');
    expectApiError(await call('DELETE', `${members(prj.id)}/${lead.id}`), 409, 'LAST_MANAGER');
  });

  it('cannot demote the Lead (409 IS_LEAD) and cannot make a viewer the Lead (422)', async () => {
    const { lead, member, viewer, prj } = await team();
    auth.as(lead);
    await call('PATCH', `${members(prj.id)}/${member.id}`, { role: 'manager' });
    auth.as(member);
    const res = await call('PATCH', `${members(prj.id)}/${lead.id}`, { role: 'viewer' });
    expectApiError(res, 409, 'IS_LEAD');
    expect(res.body.error).toContain('Jadikan Pengelola utama lain');
    const lead2 = await call('PUT', `/app/projects/${prj.id}/lead`, { userId: viewer.id });
    expectApiError(lead2, 422, 'LEAD_MUST_BE_MANAGER');
  });

  it('refuses a Member, a Viewer and a non-member Project Manager with 403', async () => {
    const { member, viewer, free, prj } = await team();
    const pmX = await f.user({ role: 'project_manager' });
    for (const u of [member, viewer, pmX]) {
      auth.as(u);
      const res = await call('POST', members(prj.id), { userId: free.id, role: 'member' });
      expectApiError(res, 403, 'NOT_MANAGER');
    }
  });

  it('answers 404 to a non-member Member, the same as for a missing project', async () => {
    const { viewer, prj } = await team();
    const outsider = await f.user();
    auth.as(outsider);
    const hidden = await call('DELETE', `${members(prj.id)}/${viewer.id}`);
    const missing = await call('DELETE', `${members('no-such-project')}/${viewer.id}`);
    expectApiError(hidden, 404, 'NOT_FOUND');
    expectApiError(missing, 404, 'NOT_FOUND');
    expect(hidden.body.error).toBe(missing.body.error);
  });

  it('has no leave route: removing yourself is refused', async () => {
    const { lead, member, prj } = await team();
    auth.as(lead);
    await call('PATCH', `${members(prj.id)}/${member.id}`, { role: 'manager' });
    auth.as(member);
    expectApiError(await call('DELETE', `${members(prj.id)}/${member.id}`), 403, 'SELF_TARGET');
  });
});

describe('GET /app/team/picker', () => {
  it('returns only id, name, jobTitle and image (no email or phone)', async () => {
    const pm = await f.user({ role: 'project_manager', name: 'Pemilih Satu' });
    auth.as(pm);
    const res = await call('GET', '/app/team/picker?q=Pemilih Satu');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(Object.keys(res.body.items[0]).sort()).toEqual(['id', 'image', 'jobTitle', 'name']);
  });

  it('needs projectId from someone who cannot create projects (403)', async () => {
    const m = await f.user();
    auth.as(m);
    expectApiError(await call('GET', '/app/team/picker'), 403, 'NOT_APP_ROLE');
  });

  it('with projectId: members may search, outsiders get 404, non-member PM 403', async () => {
    const { member, free, prj } = await team();
    auth.as(member);
    const ok = await call('GET', `/app/team/picker?projectId=${prj.id}&q=${free.name}`);
    expect(ok.status).toBe(200);
    expect(ok.body.items.map((p: Json) => p.id)).toEqual([free.id]);
    auth.as(await f.user());
    expectApiError(await call('GET', `/app/team/picker?projectId=${prj.id}`), 404, 'NOT_FOUND');
    auth.as(await f.user({ role: 'project_manager' }));
    expectApiError(await call('GET', `/app/team/picker?projectId=${prj.id}`), 403, 'NOT_MEMBER');
  });

  it('clamps a large limit instead of failing', async () => {
    auth.as(await f.user({ role: 'admin' }));
    const res = await call('GET', `/app/team/picker?limit=${PICKER_LIMIT_MAX * 10}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeLessThanOrEqual(PICKER_LIMIT_MAX);
  });

  it('answers 404 for a project in the Trash', async () => {
    const { lead, prj } = await team();
    await db
      .update(project)
      .set({ deletedAt: new Date(), deletedBy: lead.id })
      .where(eq(project.id, prj.id));
    auth.as(lead);
    expectApiError(await call('GET', `/app/team/picker?projectId=${prj.id}`), 404, 'NOT_FOUND');
  });
});
