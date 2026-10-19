/** The manual project condition is a privileged act: setting and clearing it leave an audit row (S5a-04). */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { auditLog } from '../../server/db/schema';
import { call, resetApiLimiters, waitForAudit } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { buildScheduleWorld, resetPlan, type ScheduleWorld } from '../support/schedule-world';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 's5aaud' });

let w: ScheduleWorld;
beforeAll(async () => {
  w = await buildScheduleWorld(cleaner, f);
});
beforeEach(async () => {
  resetApiLimiters();
  await resetPlan(w);
  auth.as(w.people['PM-K']);
});
afterEach(() => cleaner.flushTest());
afterAll(async () => {
  resetApiLimiters();
  await cleaner.flushAll();
});

const url = () => `/app/projects/${w.projectId}/condition-override`;
const forProject = (action: string) =>
  waitForAudit(eq(auditLog.action, action), eq(auditLog.targetId, w.projectId));

describe('condition override audit', () => {
  it('records who set it, without the free-text reason', async () => {
    const reason = 'Alasan rahasia pengelola'; // test-only
    const res = await call('POST', url(), { condition: 'off_track', reason });
    expect(res.status).toBe(201);
    const [entry] = await forProject('project.condition.set');
    if (!entry) throw new Error('No audit entry for the override');
    cleaner.track('audit', entry.id);
    expect(entry).toMatchObject({ actorId: w.people['PM-K'].id, targetType: 'project' });
    expect(entry.meta).toEqual({ condition: 'off_track' });
    expect(JSON.stringify(entry)).not.toContain(reason);
  });

  it('records the clear, and nothing when there was nothing to clear', async () => {
    expect((await call('DELETE', url())).body.cleared).toBe(1);
    const [entry] = await forProject('project.condition.clear');
    if (!entry) throw new Error('No audit entry for the clear');
    cleaner.track('audit', entry.id);
    expect(entry.actorId).toBe(w.people['PM-K'].id);

    expect((await call('DELETE', url())).body.cleared).toBe(0);
    expect(await forProject('project.condition.clear')).toHaveLength(1);
  });

  it('writes nothing for a refused call', async () => {
    auth.as(w.people.AG);
    expect((await call('POST', url(), { condition: 'at_risk', reason: 'x' })).status).toBe(403);
    expect((await call('DELETE', url())).status).toBe(403);
    expect((await waitForAudit(eq(auditLog.targetId, w.projectId))).length).toBe(0);
  });
});
