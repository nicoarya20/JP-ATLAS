/**
 * Schedule write input hardening (S5a-04): server-owned fields in a body are never applied
 * (mass assignment), and an id from another project never reaches that project's rows (IDOR by id).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../server/db';
import {
  projectConditionOverride,
  projectDeadlineExtension,
  projectMilestone,
  projectPhase,
} from '../../server/db/schema';
import { call, expectApiError, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import {
  buildScheduleWorld,
  planFingerprint,
  resetPlan,
  SCHEDULE_DUE,
  type ScheduleWorld,
  type SeededPlan,
} from '../support/schedule-world';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 's5ainp' });

let w: ScheduleWorld;
let seed: SeededPlan;
beforeAll(async () => {
  w = await buildScheduleWorld(cleaner, f);
});
beforeEach(async () => {
  resetApiLimiters();
  seed = await resetPlan(w);
  auth.as(w.people['PM-K']);
});
afterEach(() => cleaner.flushTest());
afterAll(async () => {
  resetApiLimiters();
  await cleaner.flushAll();
});

const base = () => `/app/projects/${w.projectId}`;
const PAST = '2001-02-03T04:05:06.000Z'; // test-only
const FAKE_ID = 'injected-id'; // test-only
const isRecent = (d: Date) => Date.now() - d.getTime() < 60_000;

describe('mass assignment', () => {
  it('a new phase ignores id, projectId, position, status and timestamps', async () => {
    const res = await call('POST', `${base()}/phases`, {
      name: 'Tahap baru',
      id: FAKE_ID,
      projectId: w.other.projectId,
      position: 99,
      status: 'done',
      startedAt: PAST,
      createdAt: PAST,
    });
    expect(res.status).toBe(201);
    const [row] = await db.select().from(projectPhase).where(eq(projectPhase.id, res.body.id));
    expect(row?.id).not.toBe(FAKE_ID);
    expect(row?.projectId).toBe(w.projectId);
    expect(row?.position).toBe(2); // after the two seeded phases, not 99
    expect(row?.status).toBe('not_started');
    expect(row?.startedAt).toBeNull();
    expect(row && isRecent(row.createdAt)).toBe(true);
  });

  it('a phase edit cannot move the phase to another project or rewrite its stamps', async () => {
    const res = await call('PATCH', `${base()}/phases/${seed.phaseA}`, {
      name: 'Diubah',
      projectId: w.other.projectId,
      id: FAKE_ID,
      position: 50,
      finishedAt: PAST,
      createdAt: PAST,
    });
    expect(res.status).toBe(200);
    const [row] = await db.select().from(projectPhase).where(eq(projectPhase.id, seed.phaseA));
    expect(row).toMatchObject({ name: 'Diubah', projectId: w.projectId, position: 0 });
    expect(row?.finishedAt).toBeNull();
    expect(row && isRecent(row.createdAt)).toBe(true);
  });

  it('a new milestone ignores id, projectId, reachedAt and createdAt', async () => {
    const res = await call('POST', `${base()}/milestones`, {
      title: 'Baru',
      dueDate: '2030-12-01',
      id: FAKE_ID,
      projectId: w.other.projectId,
      reachedAt: PAST,
      createdAt: PAST,
    });
    expect(res.status).toBe(201);
    const [row] = await db
      .select()
      .from(projectMilestone)
      .where(eq(projectMilestone.id, res.body.id));
    expect(row?.id).not.toBe(FAKE_ID);
    expect(row?.projectId).toBe(w.projectId);
    expect(row?.reachedAt).toBeNull();
    expect(row && isRecent(row.createdAt)).toBe(true);
  });

  it('a milestone edit cannot reach it, move it or rewrite its stamps', async () => {
    const res = await call('PATCH', `${base()}/milestones/${seed.milestoneId}`, {
      title: 'Diubah',
      projectId: w.other.projectId,
      reachedAt: PAST,
      createdAt: PAST,
    });
    expect(res.status).toBe(200);
    const [row] = await db
      .select()
      .from(projectMilestone)
      .where(eq(projectMilestone.id, seed.milestoneId));
    expect(row).toMatchObject({ title: 'Diubah', projectId: w.projectId, reachedAt: null });
    expect(row && isRecent(row.createdAt)).toBe(true);
  });

  it('reaching a milestone stamps the server clock, not a body value', async () => {
    const res = await call('POST', `${base()}/milestones/${seed.milestoneId}/reach`, {
      reachedAt: PAST,
    });
    expect(res.status).toBe(200);
    const [row] = await db
      .select()
      .from(projectMilestone)
      .where(eq(projectMilestone.id, seed.milestoneId));
    expect(row?.reachedAt && isRecent(row.reachedAt)).toBe(true);
  });

  it('an extension records the caller as author and the real old date', async () => {
    const stranger = w.people.BA;
    const res = await call('POST', `${base()}/extend-deadline`, {
      newDueDate: '2030-11-20',
      reasonCategory: 'dependency',
      reason: 'Menunggu pemasok',
      extendedBy: stranger.id,
      projectId: w.other.projectId,
      oldDueDate: '1999-01-01',
      id: FAKE_ID,
      createdAt: PAST,
    });
    expect(res.status).toBe(201);
    const [row] = await db
      .select()
      .from(projectDeadlineExtension)
      .orderBy(desc(projectDeadlineExtension.createdAt))
      .where(eq(projectDeadlineExtension.projectId, w.projectId));
    expect(row).toMatchObject({
      extendedBy: w.people['PM-K'].id,
      projectId: w.projectId,
      oldDueDate: SCHEDULE_DUE,
      newDueDate: '2030-11-20',
    });
    expect(row?.id).not.toBe(FAKE_ID);
    expect(row && isRecent(row.createdAt)).toBe(true);
  });

  it('a manual condition records the caller and cannot arrive already cleared', async () => {
    const res = await call('POST', `${base()}/condition-override`, {
      condition: 'off_track',
      reason: 'Bahan belum datang',
      setBy: w.people.BA.id,
      projectId: w.other.projectId,
      clearedAt: PAST,
      createdAt: PAST,
      id: FAKE_ID,
    });
    expect(res.status).toBe(201);
    const [row] = await db
      .select()
      .from(projectConditionOverride)
      .where(eq(projectConditionOverride.id, res.body.conditionOverride.id));
    expect(row).toMatchObject({
      setBy: w.people['PM-K'].id,
      projectId: w.projectId,
      clearedAt: null,
      condition: 'off_track',
    });
    expect(row?.id).not.toBe(FAKE_ID);
    expect(row && isRecent(row.createdAt)).toBe(true);
  });
});

describe('ids of another project', () => {
  // The caller manages `projectId` but has no part in `other`; its ids must behave like missing ones.
  it.each([
    ['edit a phase', 'PATCH', (o: ScheduleWorld['other']) => `phases/${o.phaseId}`, { name: 'X' }],
    ['delete a phase', 'DELETE', (o: ScheduleWorld['other']) => `phases/${o.phaseId}`, undefined],
    [
      'edit a milestone',
      'PATCH',
      (o: ScheduleWorld['other']) => `milestones/${o.milestoneId}`,
      { title: 'X' },
    ],
    [
      'delete a milestone',
      'DELETE',
      (o: ScheduleWorld['other']) => `milestones/${o.milestoneId}`,
      undefined,
    ],
    [
      'reach a milestone',
      'POST',
      (o: ScheduleWorld['other']) => `milestones/${o.milestoneId}/reach`,
      undefined,
    ],
  ] as const)('%s through my project is 404 and changes nothing', async (_n, method, sub, body) => {
    const before = await planFingerprint(w.other.projectId);
    const res = await call(method, `${base()}/${sub(w.other)}`, body);
    expectApiError(res, 404, 'NOT_FOUND');
    expect(await planFingerprint(w.other.projectId)).toEqual(before);
  });

  it('a milestone cannot be tied to a phase of another project (create and edit)', async () => {
    const created = await call('POST', `${base()}/milestones`, {
      title: 'Silang',
      dueDate: '2030-12-01',
      phaseId: w.other.phaseId,
    });
    expect(created.status).toBe(422);
    const edited = await call('PATCH', `${base()}/milestones/${seed.milestoneId}`, {
      phaseId: w.other.phaseId,
    });
    expect(edited.status).toBe(422);
    const [row] = await db
      .select()
      .from(projectMilestone)
      .where(eq(projectMilestone.id, seed.milestoneId));
    expect(row?.phaseId).toBeNull();
  });

  it('a reorder naming a phase of another project is refused and keeps both orders', async () => {
    const before = await planFingerprint(w.projectId);
    const otherBefore = await planFingerprint(w.other.projectId);
    const res = await call('POST', `${base()}/phases/reorder`, {
      ids: [seed.phaseB, seed.phaseA, w.other.phaseId],
    });
    expect(res.status).toBe(422);
    expect(await planFingerprint(w.projectId)).toEqual(before);
    expect(await planFingerprint(w.other.projectId)).toEqual(otherBefore);
  });
});
