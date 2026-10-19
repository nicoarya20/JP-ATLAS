/** Manual condition service (S5a-03): set, replace, clear, expiry, state and permission guards. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { asc, eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { projectActivity, projectConditionOverride } from '../../server/db/schema';
import type { ProjectStatus } from '../../server/pm/enums';
import { toPrincipal } from '../../server/project/membership.query';
import { OVERRIDE_REASON_MAX } from '../../server/project/project.limits';
import { loadActiveOverride } from '../../server/project/project-deadline.query';
import {
  clearConditionOverride,
  setConditionOverride,
} from '../../server/project/project-override.service';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'ovsvc' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const principal = (u: TestUser) => toPrincipal({ user: u, role: u.role });
const NOW = new Date('2030-10-15T08:00:00Z'); // test-only
const HOUR_MS = 3_600_000;
const input = (over: object = {}) => ({
  condition: 'at_risk' as const,
  reason: 'Menunggu keputusan klien',
  ...over,
});

async function setup(status: ProjectStatus = 'active') {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const outsider = await f.user();
  const prj = await f.project({
    lead,
    members: [[member, 'member']],
    status,
    dueDate: '2030-12-01',
  });
  return { lead, member, outsider, prj };
}
const rows = (id: string) =>
  db
    .select()
    .from(projectConditionOverride)
    .where(eq(projectConditionOverride.projectId, id))
    .orderBy(asc(projectConditionOverride.createdAt));
const actions = async (id: string) =>
  (
    await db
      .select()
      .from(projectActivity)
      .where(eq(projectActivity.projectId, id))
      // Without an order Postgres may return the rows in any order, which made this suite flaky.
      .orderBy(asc(projectActivity.createdAt))
  ).map((a) => a.action);

describe('setConditionOverride', () => {
  it('stores the override with its author and logs the activity', async () => {
    const { lead, prj } = await setup();
    const r = await setConditionOverride(
      principal(lead),
      prj.id,
      input({ reason: '  Klien menunda  ' }),
      NOW,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({
      projectId: prj.id,
      condition: 'at_risk',
      reason: 'Klien menunda',
      setBy: lead.id,
      setByName: lead.name,
      expiresAt: null,
      clearedAt: null,
    });
    expect(await actions(prj.id)).toEqual(['condition.overridden']);
    expect(await loadActiveOverride(db, prj.id, NOW)).toMatchObject({ id: r.value.id });
  });

  it('keeps an expiry and stops counting it once the time has passed', async () => {
    const { lead, prj } = await setup();
    const expiresAt = new Date(NOW.getTime() + HOUR_MS).toISOString();
    const r = await setConditionOverride(principal(lead), prj.id, input({ expiresAt }), NOW);
    expect(r.ok && r.value.expiresAt).toBe(expiresAt);
    expect(await loadActiveOverride(db, prj.id, NOW)).not.toBeNull();
    expect(await loadActiveOverride(db, prj.id, new Date(NOW.getTime() + 2 * HOUR_MS))).toBeNull();
    // Exactly at the expiry already counts as expired (same rule as the condition calculation).
    expect(await loadActiveOverride(db, prj.id, new Date(expiresAt))).toBeNull();
  });

  it('replaces the one in force, so exactly one stays active and clearing never revives an old one', async () => {
    const { lead, prj } = await setup();
    const p = principal(lead);
    await setConditionOverride(p, prj.id, input({ condition: 'at_risk' }), NOW);
    const second = await setConditionOverride(
      p,
      prj.id,
      input({ condition: 'off_track' }),
      new Date(NOW.getTime() + 1000),
    );
    const all = await rows(prj.id);
    expect(all.map((r) => [r.condition, r.clearedAt !== null])).toEqual([
      ['at_risk', true],
      ['off_track', false],
    ]);
    expect(second.ok && (await loadActiveOverride(db, prj.id, NOW))?.condition).toBe('off_track');
    await clearConditionOverride(p, prj.id, new Date(NOW.getTime() + 2000));
    expect(await loadActiveOverride(db, prj.id, NOW)).toBeNull();
  });

  it('refuses a project that is not active, a past expiry, a blank or an oversized reason', async () => {
    const { lead, prj } = await setup();
    const p = principal(lead);
    const past = new Date(NOW.getTime() - HOUR_MS).toISOString();
    expect(await setConditionOverride(p, prj.id, input({ expiresAt: past }), NOW)).toMatchObject({
      code: 'VALIDATION',
    });
    expect(
      await setConditionOverride(p, prj.id, input({ expiresAt: 'bukan-tanggal' }), NOW),
    ).toMatchObject({ code: 'VALIDATION' });
    expect(await setConditionOverride(p, prj.id, input({ reason: ' ' }), NOW)).toMatchObject({
      code: 'REASON_REQUIRED',
    });
    const long = 'a'.repeat(OVERRIDE_REASON_MAX + 1);
    expect(await setConditionOverride(p, prj.id, input({ reason: long }), NOW)).toMatchObject({
      code: 'VALIDATION',
    });
    expect(await rows(prj.id)).toHaveLength(0);
    for (const status of ['draft', 'on_hold', 'completed', 'canceled'] as const) {
      const other = await setup(status);
      expect(
        await setConditionOverride(principal(other.lead), other.prj.id, input(), NOW),
      ).toMatchObject({
        ok: false,
        code: 'NOT_ACTIVE',
      });
    }
  });

  it('lets managers and Admin set it, but a plain member gets 403 and an outsider 404', async () => {
    const { lead, member, outsider, prj } = await setup();
    const admin = await f.user({ role: 'admin' });
    expect(await setConditionOverride(principal(member), prj.id, input(), NOW)).toMatchObject({
      code: 'NOT_MANAGER',
    });
    expect(await setConditionOverride(principal(outsider), prj.id, input(), NOW)).toMatchObject({
      code: 'NOT_FOUND',
    });
    expect((await setConditionOverride(principal(admin), prj.id, input(), NOW)).ok).toBe(true);
    expect((await setConditionOverride(principal(lead), prj.id, input(), NOW)).ok).toBe(true);
  });
});

describe('clearConditionOverride', () => {
  it('marks the override cleared, keeps the row and logs the activity', async () => {
    const { lead, prj } = await setup();
    const p = principal(lead);
    await setConditionOverride(p, prj.id, input(), NOW);
    const at = new Date(NOW.getTime() + 1000);
    expect(await clearConditionOverride(p, prj.id, at)).toEqual({
      ok: true,
      value: { cleared: 1 },
    });
    const [row] = await rows(prj.id);
    expect(row?.clearedAt?.toISOString()).toBe(at.toISOString());
    expect(await actions(prj.id)).toEqual(['condition.overridden', 'condition.override_cleared']);
  });

  it('is a quiet no-op when nothing is in force, and still checks permission', async () => {
    const { lead, member, prj } = await setup();
    expect(await clearConditionOverride(principal(lead), prj.id, NOW)).toEqual({
      ok: true,
      value: { cleared: 0 },
    });
    expect(await actions(prj.id)).toEqual([]);
    expect(await clearConditionOverride(principal(member), prj.id, NOW)).toMatchObject({
      code: 'NOT_MANAGER',
    });
  });
});
