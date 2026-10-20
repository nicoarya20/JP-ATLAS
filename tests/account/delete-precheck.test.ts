/** Delete-account pre-check (P9 A7): which active projects only this person manages, in a constant number of queries. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { DELETE_BLOCKERS_MAX, getDeleteBlockers } from '../../server/account/delete-precheck';
import { db } from '../../server/db';
import { project, projectMember } from '../../server/db/schema';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { countQueries } from '../support/query-count';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'delpre' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const names = async (userId: string) =>
  (await getDeleteBlockers(userId)).projects.map((p) => p.name);

describe('getDeleteBlockers', () => {
  it('is empty for someone who manages nothing', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const member = await f.user();
    await f.project({ lead, members: [[member, 'member']] });
    expect(await getDeleteBlockers(member.id)).toEqual({ projects: [], total: 0 });
  });

  it('names a project the person leads alone', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const proj = await f.project({ lead, name: 'Pameran Oktober' });
    expect(await getDeleteBlockers(lead.id)).toEqual({
      projects: [{ id: proj.id, name: 'Pameran Oktober' }],
      total: 1,
    });
  });

  it('does not block when another manager exists', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const second = await f.user({ role: 'project_manager' });
    await f.project({ lead, members: [[second, 'manager']] });
    expect(await getDeleteBlockers(lead.id)).toEqual({ projects: [], total: 0 });
    expect(await getDeleteBlockers(second.id)).toEqual({ projects: [], total: 0 });
  });

  it('blocks a manager member of a project whose lead was removed (no one else manages it)', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const manager = await f.user({ role: 'project_manager' });
    const proj = await f.project({ lead, members: [[manager, 'manager']] });
    // The lead's account is gone: `lead_id` goes NULL and the member row cascades away.
    await db.delete(projectMember).where(eq(projectMember.userId, lead.id));
    await db.update(project).set({ leadId: null }).where(eq(project.id, proj.id));
    expect(await names(manager.id)).toEqual([proj.name]);
  });

  it('does not block while another person is still the lead', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const manager = await f.user({ role: 'project_manager' });
    await f.project({ lead, members: [[manager, 'manager']] });
    await db.delete(projectMember).where(eq(projectMember.userId, lead.id));
    expect(await getDeleteBlockers(manager.id)).toEqual({ projects: [], total: 0 });
  });

  it.each(['draft', 'active', 'on_hold'] as const)('a %s project blocks', async (status) => {
    const lead = await f.user({ role: 'project_manager' });
    await f.project({ lead, status });
    expect((await getDeleteBlockers(lead.id)).total).toBe(1);
  });

  it.each(['completed', 'canceled'] as const)('a %s project does not block', async (status) => {
    const lead = await f.user({ role: 'project_manager' });
    await f.project({ lead, status });
    expect(await getDeleteBlockers(lead.id)).toEqual({ projects: [], total: 0 });
  });

  it('a project in the Trash does not block', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const proj = await f.project({ lead });
    await db
      .update(project)
      .set({ deletedAt: new Date(), deletedBy: lead.id })
      .where(eq(project.id, proj.id));
    expect(await getDeleteBlockers(lead.id)).toEqual({ projects: [], total: 0 });
  });

  it('never lists the projects of other people', async () => {
    const me = await f.user({ role: 'project_manager' });
    const other = await f.user({ role: 'project_manager' });
    await f.project({ lead: other, name: 'Rahasia Orang Lain' });
    const mine = await f.project({ lead: me, name: 'Punya Saya' });
    expect(await names(me.id)).toEqual([mine.name]);
  });

  it('names at most DELETE_BLOCKERS_MAX projects, counts them all, and costs one query either way', async () => {
    const lead = await f.user({ role: 'project_manager' });
    await f.project({ lead });
    const one = countQueries();
    expect((await getDeleteBlockers(lead.id, one.exec)).total).toBe(1);

    for (let i = 0; i < DELETE_BLOCKERS_MAX + 1; i++) await f.project({ lead });
    const many = countQueries();
    const out = await getDeleteBlockers(lead.id, many.exec);
    expect(out.total).toBe(DELETE_BLOCKERS_MAX + 2);
    expect(out.projects).toHaveLength(DELETE_BLOCKERS_MAX);
    expect(one.queries).toHaveLength(1);
    expect(many.queries).toHaveLength(1);
  });
});
