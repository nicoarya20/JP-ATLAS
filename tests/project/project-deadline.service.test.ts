/** Deadline extension service (S5a-03): the date chain, the baseline, validation, permissions and the race. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { asc, eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project, projectActivity, projectDeadlineExtension } from '../../server/db/schema';
import type { ProjectStatus } from '../../server/pm/enums';
import { toPrincipal } from '../../server/project/membership.query';
import { EXTENSION_REASON_MAX } from '../../server/project/project.limits';
import { extendDeadline } from '../../server/project/project-deadline.service';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'dlsvc' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const principal = (u: TestUser) => toPrincipal({ user: u, role: u.role });
const DUE = '2030-10-15'; // test-only
const input = (newDueDate: string, over: object = {}) => ({
  newDueDate,
  reasonCategory: 'resource' as const,
  reason: 'Tim kekurangan orang',
  ...over,
});

async function setup(opts: { status?: ProjectStatus; dueDate?: string | null } = {}) {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const outsider = await f.user();
  const prj = await f.project({
    lead,
    members: [[member, 'member']],
    status: opts.status ?? 'active',
    dueDate: opts.dueDate === undefined ? DUE : opts.dueDate,
  });
  return { lead, member, outsider, prj };
}
const row = async (id: string) => (await db.select().from(project).where(eq(project.id, id)))[0];
const extensions = (id: string) =>
  db
    .select()
    .from(projectDeadlineExtension)
    .where(eq(projectDeadlineExtension.projectId, id))
    // Chain order, not `created_at`: that column is the transaction start time, so two simultaneous
    // extensions can be stamped out of order while still forming one valid chain (each date is later).
    .orderBy(asc(projectDeadlineExtension.oldDueDate));

describe('extendDeadline', () => {
  it('moves the due date, fixes the baseline and writes history plus activity', async () => {
    const { lead, prj } = await setup();
    const r = await extendDeadline(
      principal(lead),
      prj.id,
      input('2030-10-31', { reason: '  Menunggu izin  ' }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.project).toEqual({
      dueDate: '2030-10-31',
      originalDueDate: DUE,
      extensionCount: 1,
    });
    expect(r.value.extension).toMatchObject({
      projectId: prj.id,
      oldDueDate: DUE,
      newDueDate: '2030-10-31',
      reasonCategory: 'resource',
      reason: 'Menunggu izin',
      extendedBy: lead.id,
      extendedByName: lead.name,
    });
    expect(await row(prj.id)).toMatchObject({ dueDate: '2030-10-31', originalDueDate: DUE });
    const [act] = await db
      .select()
      .from(projectActivity)
      .where(eq(projectActivity.projectId, prj.id));
    expect(act).toMatchObject({
      action: 'deadline.extended',
      actorId: lead.id,
      payload: { from: DUE, to: '2030-10-31', category: 'resource' },
    });
  });

  it('keeps the first baseline across a chain of extensions and counts each one', async () => {
    const { lead, prj } = await setup();
    const dates = ['2030-10-20', '2030-11-01', '2030-12-01'];
    let last: Awaited<ReturnType<typeof extendDeadline>> | undefined;
    for (const d of dates) last = await extendDeadline(principal(lead), prj.id, input(d));
    expect(last?.ok && last.value.project).toEqual({
      dueDate: '2030-12-01',
      originalDueDate: DUE,
      extensionCount: 3,
    });
    const rows = await extensions(prj.id);
    expect(rows.map((e) => [e.oldDueDate, e.newDueDate])).toEqual([
      [DUE, '2030-10-20'],
      ['2030-10-20', '2030-11-01'],
      ['2030-11-01', '2030-12-01'],
    ]);
  });

  it('does not overwrite an original date that an earlier edit already set', async () => {
    const { lead, prj } = await setup();
    await db.update(project).set({ originalDueDate: '2030-09-01' }).where(eq(project.id, prj.id));
    await extendDeadline(principal(lead), prj.id, input('2030-10-31'));
    expect((await row(prj.id))?.originalDueDate).toBe('2030-09-01');
  });

  it.each([
    ['the same date', DUE],
    ['an earlier date', '2030-10-01'],
  ])('refuses %s with NOT_LATER and writes nothing', async (_n, date) => {
    const { lead, prj } = await setup();
    const r = await extendDeadline(principal(lead), prj.id, input(date));
    expect(r).toMatchObject({ ok: false, code: 'NOT_LATER' });
    expect(await extensions(prj.id)).toHaveLength(0);
    expect(await row(prj.id)).toMatchObject({ dueDate: DUE, originalDueDate: null });
  });

  it('refuses a project without a due date', async () => {
    const { lead, prj } = await setup({ dueDate: null });
    expect(await extendDeadline(principal(lead), prj.id, input('2030-10-31'))).toMatchObject({
      ok: false,
      code: 'NO_DEADLINE',
    });
  });

  it.each<ProjectStatus>(['completed', 'canceled'])('refuses a %s project', async (status) => {
    const { lead, prj } = await setup({ status });
    expect(await extendDeadline(principal(lead), prj.id, input('2030-10-31'))).toMatchObject({
      ok: false,
      code: 'PROJECT_CLOSED',
    });
  });

  it.each<ProjectStatus>(['draft', 'on_hold'])('allows a %s project', async (status) => {
    const { lead, prj } = await setup({ status });
    expect((await extendDeadline(principal(lead), prj.id, input('2030-10-31'))).ok).toBe(true);
  });

  it('rejects an impossible calendar date and a blank or oversized reason', async () => {
    const { lead, prj } = await setup();
    const p = principal(lead);
    expect(await extendDeadline(p, prj.id, input('2030-02-30'))).toMatchObject({
      code: 'VALIDATION',
    });
    expect(await extendDeadline(p, prj.id, input('2030-10-31', { reason: '   ' }))).toMatchObject({
      code: 'REASON_REQUIRED',
    });
    const long = 'a'.repeat(EXTENSION_REASON_MAX + 1);
    expect(await extendDeadline(p, prj.id, input('2030-10-31', { reason: long }))).toMatchObject({
      code: 'VALIDATION',
    });
    expect(await extensions(prj.id)).toHaveLength(0);
  });

  it('lets a manager and an Admin extend, but not a plain member (403) or an outsider (404)', async () => {
    const { lead, member, outsider, prj } = await setup();
    const admin = await f.user({ role: 'admin' });
    expect(await extendDeadline(principal(member), prj.id, input('2030-10-31'))).toMatchObject({
      ok: false,
      code: 'NOT_MANAGER',
    });
    expect(await extendDeadline(principal(outsider), prj.id, input('2030-10-31'))).toMatchObject({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect((await extendDeadline(principal(admin), prj.id, input('2030-10-20'))).ok).toBe(true);
    expect((await extendDeadline(principal(lead), prj.id, input('2030-10-25'))).ok).toBe(true);
  });

  it('answers NOT_FOUND for a missing project and PROJECT_IN_TRASH for a trashed one', async () => {
    const { lead, prj } = await setup();
    expect(
      await extendDeadline(principal(lead), 'no-such-project', input('2030-10-31')),
    ).toMatchObject({
      code: 'NOT_FOUND',
    });
    await db
      .update(project)
      .set({ deletedAt: new Date(), deletedBy: lead.id })
      .where(eq(project.id, prj.id));
    expect(await extendDeadline(principal(lead), prj.id, input('2030-10-31'))).toMatchObject({
      code: 'PROJECT_IN_TRASH',
    });
  });

  it('serialises two extensions at once: the history stays one valid chain', async () => {
    const { lead, prj } = await setup();
    const results = await Promise.all([
      extendDeadline(principal(lead), prj.id, input('2030-11-15')),
      extendDeadline(principal(lead), prj.id, input('2030-11-30')),
    ]);
    const rows = await extensions(prj.id);
    // Both won (15th then 30th), or the 30th went first and the 15th was refused as no longer later.
    expect(rows.length).toBe(results.filter((r) => r.ok).length);
    for (const r of results) if (!r.ok) expect(r.code).toBe('NOT_LATER');
    const olds = rows.map((e) => e.oldDueDate);
    expect(new Set(olds).size).toBe(olds.length);
    let expected = DUE;
    for (const e of rows) {
      expect(e.oldDueDate).toBe(expected);
      expected = e.newDueDate;
    }
    expect((await row(prj.id))?.dueDate).toBe(expected);
    expect((await row(prj.id))?.originalDueDate).toBe(DUE);
  });
});
