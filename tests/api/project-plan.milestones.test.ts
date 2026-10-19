/** Plan API (S5a-02), milestone half: writes, reach/unreach, limits, phase links and the "next milestone" pick. */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { writeLimiter } from '../../server/api/app-context';
import { db } from '../../server/db';
import { projectActivity, projectMilestone } from '../../server/db/schema';
import { MILESTONE_TITLE_MAX, MILESTONES_PER_PROJECT } from '../../server/project/project.limits';
import { expectApiError } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { seedMilestones, seedPhases, send } from '../support/plan-api';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'plnms' });
beforeEach(() => {
  auth.as(null);
  writeLimiter.reset();
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const base = (id: string) => `/projects/${id}`;

async function team() {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const viewer = await f.user();
  const stranger = await f.user();
  const prj = await f.project({
    lead,
    members: [
      [member, 'member'],
      [viewer, 'viewer'],
    ],
  });
  return { lead, member, viewer, stranger, prj };
}

describe('create and edit a milestone', () => {
  it('creates a milestone (201) with the frozen DTO shape and records the activity', async () => {
    const { lead, prj } = await team();
    const [phase] = await seedPhases(prj.id, 1);
    auth.as(lead);
    const res = await send('POST', `${base(prj.id)}/milestones`, {
      title: '  Peluncuran  ',
      description: 'Buka untuk umum',
      dueDate: '2030-06-30',
      phaseId: phase?.id,
    });
    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual(
      ['description', 'dueDate', 'id', 'phaseId', 'projectId', 'reachedAt', 'title'].sort(),
    );
    expect(res.body).toMatchObject({ title: 'Peluncuran', phaseId: phase?.id, reachedAt: null });
    const acts = await db
      .select()
      .from(projectActivity)
      .where(eq(projectActivity.projectId, prj.id));
    expect(acts.map((a) => a.action)).toContain('milestone.created');
  });

  it.each([
    ['a blank title', { title: '  ', dueDate: '2030-01-01' }],
    [
      'a title over the limit',
      { title: 'x'.repeat(MILESTONE_TITLE_MAX + 1), dueDate: '2030-01-01' },
    ],
    ['a missing due date', { title: 'A' }],
    ['a badly shaped date', { title: 'A', dueDate: '30-06-2030' }],
    ['an impossible date', { title: 'A', dueDate: '2030-02-30' }],
  ])('rejects %s with 422 VALIDATION', async (_label, body) => {
    const { lead, prj } = await team();
    auth.as(lead);
    expectApiError(await send('POST', `${base(prj.id)}/milestones`, body), 422, 'VALIDATION');
  });

  it('rejects a phase of another project like a missing one (422, same message)', async () => {
    const { lead, prj } = await team();
    const otherLead = await f.user({ role: 'project_manager' });
    const other = await f.project({ lead: otherLead });
    const [alien] = await seedPhases(other.id, 1);
    auth.as(lead);
    const body = (phaseId: string | undefined) => ({ title: 'A', dueDate: '2030-01-01', phaseId });
    const foreign = await send('POST', `${base(prj.id)}/milestones`, body(alien?.id));
    const missing = await send('POST', `${base(prj.id)}/milestones`, body('no-such-phase'));
    expectApiError(foreign, 422, 'VALIDATION');
    expect(foreign.body.error).toBe(missing.body.error);
  });

  it('refuses the 61st milestone with 422 MILESTONE_LIMIT', async () => {
    const { lead, prj } = await team();
    await seedMilestones(prj.id, MILESTONES_PER_PROJECT);
    auth.as(lead);
    const res = await send('POST', `${base(prj.id)}/milestones`, {
      title: 'Kelebihan',
      dueDate: '2030-01-01',
    });
    expectApiError(res, 422, 'MILESTONE_LIMIT');
    expect(res.body.error).toContain(String(MILESTONES_PER_PROJECT));
  });

  it('edits fields, moves it to another phase, and clears description and phase with null', async () => {
    const { lead, prj } = await team();
    const [a, b] = await seedPhases(prj.id, 2);
    auth.as(lead);
    const made = await send('POST', `${base(prj.id)}/milestones`, {
      title: 'A',
      dueDate: '2030-01-10',
      description: 'x',
      phaseId: a?.id,
    });
    const url = `${base(prj.id)}/milestones/${made.body.id}`;
    const moved = await send('PATCH', url, { title: 'B', dueDate: '2030-02-01', phaseId: b?.id });
    expect(moved.body).toMatchObject({
      title: 'B',
      dueDate: '2030-02-01',
      phaseId: b?.id,
      description: 'x',
    });
    const cleared = await send('PATCH', url, { description: null, phaseId: null });
    expect(cleared.body).toMatchObject({ description: null, phaseId: null, title: 'B' });
    expectApiError(await send('PATCH', url, { dueDate: '2030-13-01' }), 422, 'VALIDATION');
  });
});

describe('reach and unreach', () => {
  it('marks it reached once (a second call keeps the first time) and takes the mark back', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    const made = await send('POST', `${base(prj.id)}/milestones`, {
      title: 'A',
      dueDate: '2030-01-10',
    });
    const url = `${base(prj.id)}/milestones/${made.body.id}`;
    const first = await send('POST', `${url}/reach`);
    expect(first.status).toBe(200);
    expect(first.body.reachedAt).not.toBeNull();
    const again = await send('POST', `${url}/reach`);
    expect(again.body.reachedAt).toBe(first.body.reachedAt);
    const back = await send('POST', `${url}/unreach`);
    expect(back.body.reachedAt).toBeNull();
    const acts = await db
      .select()
      .from(projectActivity)
      .where(eq(projectActivity.projectId, prj.id));
    const kinds = acts.map((a) => a.action);
    expect(kinds.filter((k) => k === 'milestone.reached')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'milestone.unreached')).toHaveLength(1);
  });

  it('picks the earliest unreached milestone as the next one, even when it is past due', async () => {
    const { lead, member, prj } = await team();
    auth.as(lead);
    const ids: string[] = [];
    for (const [title, dueDate] of [
      ['Akhir', '2030-03-01'],
      ['Awal', '2020-01-01'],
      ['Tengah', '2030-02-01'],
    ] as const) {
      const res = await send('POST', `${base(prj.id)}/milestones`, { title, dueDate });
      ids.push(res.body.id);
    }
    auth.as(member);
    let plan = await send('GET', `${base(prj.id)}/plan`);
    expect(plan.body.milestones.map((m: { title: string }) => m.title)).toEqual([
      'Awal',
      'Tengah',
      'Akhir',
    ]);
    expect(plan.body.nextMilestone.title).toBe('Awal');
    auth.as(lead);
    await send('POST', `${base(prj.id)}/milestones/${ids[1]}/reach`);
    plan = await send('GET', `${base(prj.id)}/plan`);
    expect(plan.body.nextMilestone.title).toBe('Tengah');
    for (const id of [ids[0], ids[2]]) await send('POST', `${base(prj.id)}/milestones/${id}/reach`);
    plan = await send('GET', `${base(prj.id)}/plan`);
    expect(plan.body.nextMilestone).toBeNull();
  });
});

describe('who may write, and other projects (IDOR)', () => {
  it('refuses a Member, a Viewer and a non-member Project Manager with 403 on every milestone write', async () => {
    const { lead, member, viewer, prj } = await team();
    const pmX = await f.user({ role: 'project_manager' });
    auth.as(lead);
    const made = await send('POST', `${base(prj.id)}/milestones`, {
      title: 'A',
      dueDate: '2030-01-10',
    });
    const url = `${base(prj.id)}/milestones/${made.body.id}`;
    for (const u of [member, viewer, pmX]) {
      auth.as(u);
      expectApiError(
        await send('POST', `${base(prj.id)}/milestones`, { title: 'B', dueDate: '2030-01-10' }),
        403,
        'NOT_MANAGER',
      );
      expectApiError(await send('PATCH', url, { title: 'C' }), 403, 'NOT_MANAGER');
      expectApiError(await send('POST', `${url}/reach`), 403, 'NOT_MANAGER');
      expectApiError(await send('POST', `${url}/unreach`), 403, 'NOT_MANAGER');
      expectApiError(await send('DELETE', url), 403, 'NOT_MANAGER');
    }
    const [row] = await db
      .select()
      .from(projectMilestone)
      .where(eq(projectMilestone.id, made.body.id));
    expect(row).toMatchObject({ title: 'A', reachedAt: null });
  });

  it('answers 404 to an outsider, and 404 for a milestone of another project, identical to a missing id', async () => {
    const { lead, stranger, prj } = await team();
    const otherLead = await f.user({ role: 'project_manager' });
    const other = await f.project({ lead: otherLead });
    const [alien] = await seedMilestones(other.id, 1);
    auth.as(stranger);
    expectApiError(
      await send('POST', `${base(prj.id)}/milestones`, { title: 'A', dueDate: '2030-01-10' }),
      404,
      'NOT_FOUND',
    );
    auth.as(lead);
    const viaAlien = await send('POST', `${base(prj.id)}/milestones/${alien?.id}/reach`);
    const viaMissing = await send('POST', `${base(prj.id)}/milestones/nope/reach`);
    expectApiError(viaAlien, 404, 'NOT_FOUND');
    expect(viaAlien.body.error).toBe(viaMissing.body.error);
    expectApiError(
      await send('PATCH', `${base(prj.id)}/milestones/${alien?.id}`, { title: 'Curian' }),
      404,
      'NOT_FOUND',
    );
    expectApiError(
      await send('DELETE', `${base(prj.id)}/milestones/${alien?.id}`),
      404,
      'NOT_FOUND',
    );
    const [still] = await db
      .select()
      .from(projectMilestone)
      .where(eq(projectMilestone.id, alien?.id ?? ''));
    expect(still).toMatchObject({ title: 'Milestone 1', reachedAt: null });
  });

  it('deletes a milestone and records it', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    const made = await send('POST', `${base(prj.id)}/milestones`, {
      title: 'A',
      dueDate: '2030-01-10',
    });
    const res = await send('DELETE', `${base(prj.id)}/milestones/${made.body.id}`);
    expect(res.body).toEqual({ id: made.body.id });
    const plan = await send('GET', `${base(prj.id)}/plan`);
    expect(plan.body.milestones).toEqual([]);
    const acts = await db
      .select()
      .from(projectActivity)
      .where(eq(projectActivity.projectId, prj.id));
    expect(acts.map((a) => a.action)).toContain('milestone.deleted');
  });
});
