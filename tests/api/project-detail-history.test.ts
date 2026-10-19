/** Project detail carries the deadline history and the manual condition (S5a-03). */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project } from '../../server/db/schema';
import { toPrincipal } from '../../server/project/membership.query';
import { getProjectDetail } from '../../server/project/project.query';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { callApp, resetWriteLimit } from '../support/deadline-app';
import { createFactory } from '../support/factory.task';
import { countQueries } from '../support/query-count';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'dthist' });
beforeEach(() => {
  auth.as(null);
  resetWriteLimit();
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const DUE = '2030-10-15'; // test-only
const HOUR_MS = 3_600_000;
const detail = (id: string) => callApp('GET', `/projects/${id}`);
const extend = (id: string, newDueDate: string) =>
  callApp('POST', `/projects/${id}/extend-deadline`, {
    newDueDate,
    reasonCategory: 'scope_change',
    reason: 'Ruang lingkup bertambah',
  });

async function team() {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const prj = await f.project({ lead, members: [[member, 'member']], dueDate: DUE });
  return { lead, member, prj };
}

describe('GET /projects/:id history fields', () => {
  it('starts with no extensions and no manual condition', async () => {
    const { member, prj } = await team();
    auth.as(member);
    const res = await detail(prj.id);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      extensionCount: 0,
      lastExtension: null,
      conditionOverride: null,
    });
  });

  it('counts extensions and shows the newest one', async () => {
    const { lead, member, prj } = await team();
    auth.as(lead);
    for (const d of ['2030-10-20', '2030-11-01', '2030-12-01']) await extend(prj.id, d);
    auth.as(member);
    const res = await detail(prj.id);
    expect(res.body.extensionCount).toBe(3);
    expect(res.body.lastExtension).toMatchObject({
      oldDueDate: '2030-11-01',
      newDueDate: '2030-12-01',
      reasonCategory: 'scope_change',
      extendedBy: lead.id,
      extendedByName: lead.name,
    });
    expect(res.body).toMatchObject({ dueDate: '2030-12-01', originalDueDate: DUE });
  });

  it('shows the manual condition in force, and not a cleared or expired one', async () => {
    const { lead, member, prj } = await team();
    auth.as(lead);
    await callApp('POST', `/projects/${prj.id}/condition-override`, {
      condition: 'off_track',
      reason: 'Izin belum keluar',
    });
    auth.as(member);
    expect((await detail(prj.id)).body.conditionOverride).toMatchObject({
      condition: 'off_track',
      reason: 'Izin belum keluar',
      setByName: lead.name,
      clearedAt: null,
    });
    auth.as(lead);
    await callApp('DELETE', `/projects/${prj.id}/condition-override`);
    expect((await detail(prj.id)).body.conditionOverride).toBeNull();

    const expiresAt = new Date(Date.now() + HOUR_MS).toISOString();
    await callApp('POST', `/projects/${prj.id}/condition-override`, {
      condition: 'at_risk',
      reason: 'Sementara',
      expiresAt,
    });
    const principal = toPrincipal({ user: lead, role: lead.role });
    const later = new Date(Date.now() + 2 * HOUR_MS);
    expect((await getProjectDetail(principal, prj.id, later))?.conditionOverride).toBeNull();
    expect((await detail(prj.id)).body.conditionOverride?.condition).toBe('at_risk');
  });

  it('hides the override while the project is not active, and shows it again afterwards', async () => {
    const { lead, prj } = await team();
    auth.as(lead);
    await callApp('POST', `/projects/${prj.id}/condition-override`, {
      condition: 'at_risk',
      reason: 'Alasan',
    });
    await db.update(project).set({ status: 'on_hold' }).where(eq(project.id, prj.id));
    expect((await detail(prj.id)).body.conditionOverride).toBeNull();
    await db.update(project).set({ status: 'active' }).where(eq(project.id, prj.id));
    expect((await detail(prj.id)).body.conditionOverride?.condition).toBe('at_risk');
  });

  it('reads the history in a fixed number of statements, however long it is', async () => {
    const { lead, prj } = await team();
    const principal = toPrincipal({ user: lead, role: lead.role });
    const empty = countQueries();
    await getProjectDetail(principal, prj.id, new Date(), empty.exec);
    auth.as(lead);
    for (const d of ['2030-10-20', '2030-11-01', '2030-12-01']) await extend(prj.id, d);
    await callApp('POST', `/projects/${prj.id}/condition-override`, {
      condition: 'at_risk',
      reason: 'Alasan',
    });
    const full = countQueries();
    await getProjectDetail(principal, prj.id, new Date(), full.exec);
    expect(empty.queries.length).toBeGreaterThan(0);
    expect(full.queries.length).toBe(empty.queries.length);
  });
});
